import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { createExpenseSchema } from '../validation.js';
import { syncDebtsToNeo4j, ensureUserNode, ensureGroupNode } from '../services/neo4j.service.js';
import { invalidateSettlement } from '../services/redis.service.js';

// CONCEPT: Expense Routes with Pessimistic Locking
// The core of RESOLVE — adding expenses to a group.
//
// Why pessimistic locking (SELECT FOR UPDATE)?
//   On a trip, multiple people add expenses simultaneously. Without locking,
//   two concurrent writes could read the same state, both write their updates,
//   and one overwrites the other — corrupting balances.
//   SELECT FOR UPDATE locks the group row so only one transaction at a time
//   can read+write balances for that group. Others wait until the lock is released.
//
// After writing the expense:
//   1. Recompute net pairwise debts for the entire group
//   2. Sync those debts to Neo4j (CQRS — keep the read model in sync)
//
// Interview: "I use pessimistic locking with SELECT FOR UPDATE because expense
// writes in a group are high-contention — everyone adds expenses at once on a trip.
// Optimistic locking would cause constant retries, which is worse UX."

export const expensesRouter = Router();

// All expense routes require authentication
expensesRouter.use(authenticate);

// POST /groups/:groupId/expenses — Add a new expense with pessimistic lock
expensesRouter.post('/:groupId/expenses', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.groupId;

  // Validate request body
  const result = createExpenseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { description, amount, paidById, splits } = result.data;

  // Validate that splits sum matches the total amount (within floating point tolerance)
  const splitsTotal = splits.reduce((sum, s) => sum + s.share, 0);
  if (Math.abs(splitsTotal - amount) > 0.01) {
    res.status(400).json({ error: 'Splits must sum to the total amount' });
    return;
  }

  // Authorization: caller must be a member of this group
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Validate that paidById is a member of the group
  const payerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: paidById, groupId } },
  });

  if (!payerMembership) {
    res.status(400).json({ error: 'Payer must be a member of the group' });
    return;
  }

  // Validate that all split users are members of the group
  const splitUserIds = splits.map((s) => s.userId);
  const memberCount = await prisma.groupMember.count({
    where: { groupId, userId: { in: splitUserIds } },
  });

  if (memberCount !== splitUserIds.length) {
    res.status(400).json({ error: 'All split users must be members of the group' });
    return;
  }

  // --- Pessimistic Lock Transaction ---
  // Lock the group row, create expense + splits, then recompute balances
  const expense = await prisma.$transaction(async (tx) => {
    // Lock the group row — no other transaction can modify this group until we commit
    await tx.$executeRaw`SELECT id FROM "Group" WHERE id = ${groupId} FOR UPDATE`;

    // Create the expense
    const newExpense = await tx.expense.create({
      data: {
        groupId,
        description,
        amount,
        paidById,
        splits: {
          create: splits.map((s) => ({
            userId: s.userId,
            share: s.share,
          })),
        },
      },
      include: {
        splits: true,
        paidBy: { select: { id: true, email: true, firstName: true } },
      },
    });

    return newExpense;
  });

  // --- Recompute net pairwise debts and sync to Neo4j ---
  // This happens outside the pessimistic lock transaction to minimize lock hold time.
  // The debt computation reads all expenses for the group and computes who owes whom.
  try {
    const debts = await computePairwiseDebts(groupId);
    await syncGroupToNeo4j(groupId, debts);
  } catch (err) {
    // Log but don't fail the request — the expense was saved successfully.
    // Neo4j sync can be retried or will self-correct on next expense.
    console.error('Neo4j sync failed (expense was saved):', err);
  }

  // Invalidate cached settlement plan — balances have changed
  try {
    await invalidateSettlement(groupId);
  } catch {
    // Redis down — proceed without invalidation
  }

  res.status(201).json({ expense });
});

// GET /groups/:groupId/expenses — List all expenses in a group
expensesRouter.get('/:groupId/expenses', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.groupId;

  // Authorization: caller must be a member
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      paidBy: { select: { id: true, email: true, firstName: true } },
      splits: { select: { userId: true, share: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ expenses });
});

// GET /groups/:groupId/balances — Net balance per person in the group
expensesRouter.get('/:groupId/balances', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.groupId;

  // Authorization: caller must be a member
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Get all members with their names
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });

  // Get all expenses with splits
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  // Compute net balance per person:
  // Positive = others owe them (they paid more than their share)
  // Negative = they owe others (their share is more than they paid)
  const balanceMap = new Map<string, number>();

  // Initialize all members with 0
  for (const m of members) {
    balanceMap.set(m.userId, 0);
  }

  for (const expense of expenses) {
    // Payer's balance goes UP by the amount they paid
    balanceMap.set(expense.paidById, (balanceMap.get(expense.paidById) ?? 0) + expense.amount);

    // Each split person's balance goes DOWN by their share
    for (const split of expense.splits) {
      balanceMap.set(split.userId, (balanceMap.get(split.userId) ?? 0) - split.share);
    }
  }

  // Build response with user info
  const balances = members.map((m) => ({
    user: m.user,
    balance: Math.round((balanceMap.get(m.userId) ?? 0) * 100) / 100, // round to 2 decimals
  }));

  res.json({ balances });
});

// --- Helper Functions ---

/**
 * Compute pairwise net debts for a group.
 * For each expense: each split user owes the payer their share (except the payer themselves).
 * Then net the pairwise amounts (if A owes B €10 and B owes A €3, result is A owes B €7).
 */
async function computePairwiseDebts(
  groupId: string
): Promise<{ fromUserId: string; toUserId: string; amount: number }[]> {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  // Accumulate raw pairwise debts: key = "fromUserId:toUserId"
  const pairwise = new Map<string, number>();

  for (const expense of expenses) {
    for (const split of expense.splits) {
      // Skip if the split user is the payer (they don't owe themselves)
      if (split.userId === expense.paidById) continue;

      const key = `${split.userId}:${expense.paidById}`;
      pairwise.set(key, (pairwise.get(key) ?? 0) + split.share);
    }
  }

  // Net the pairwise debts (A→B vs B→A)
  const netted = new Map<string, number>();

  for (const [key, amount] of pairwise.entries()) {
    const [from, to] = key.split(':');
    const reverseKey = `${to}:${from}`;
    const reverseAmount = pairwise.get(reverseKey) ?? 0;

    // Only process each pair once (alphabetical ordering)
    if (from < to) {
      const net = amount - reverseAmount;
      if (net > 0.01) {
        netted.set(`${from}:${to}`, net);
      } else if (net < -0.01) {
        netted.set(`${to}:${from}`, -net);
      }
    } else if (!pairwise.has(reverseKey)) {
      // from > to and no reverse exists, so just use this direction
      if (amount > 0.01) {
        netted.set(key, amount);
      }
    }
  }

  // Convert to array
  return Array.from(netted.entries()).map(([key, amount]) => {
    const [fromUserId, toUserId] = key.split(':');
    return { fromUserId, toUserId, amount };
  });
}

/**
 * Sync a group's debts to Neo4j — ensures all user/group nodes exist, then upserts OWES edges.
 */
async function syncGroupToNeo4j(
  groupId: string,
  debts: { fromUserId: string; toUserId: string; amount: number }[]
): Promise<void> {
  // Get group info and all members for node creation
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, firstName: true } } },
      },
    },
  });

  if (!group) return;

  // Ensure all nodes exist in Neo4j
  await ensureGroupNode(groupId, group.name);
  for (const member of group.members) {
    await ensureUserNode(member.user.id, member.user.email, member.user.firstName);
  }

  // Sync OWES edges
  await syncDebtsToNeo4j(groupId, debts);
}
