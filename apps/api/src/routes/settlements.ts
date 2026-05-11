import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { runSimplification } from '../services/simplify.service.js';
import { cacheSettlement, getCachedSettlement } from '../services/redis.service.js';
import { publishPaymentNotification } from '../services/rabbitmq.service.js';

// CONCEPT: Settlement & Payment Routes
//
// GET /groups/:groupId/settlement
//   Runs the greedy simplification algorithm in a worker thread to compute the
//   minimum set of transfers needed to settle all debts. Results are cached in
//   Redis (invalidated when a new expense is added).
//
// POST /groups/:groupId/payments
//   Records a payment (Bob pays Alice €20) and publishes a notification message
//   to RabbitMQ so Alice gets a push notification asynchronously.
//
// Interview: "The settlement endpoint runs a greedy algorithm in a worker thread
// and caches the result in Redis. Payments publish to RabbitMQ for async notification
// delivery — the HTTP request returns immediately, and the consumer handles push."

export const settlementsRouter = Router();

settlementsRouter.use(authenticate);

// GET /groups/:groupId/settlement — Compute optimized transfer list
settlementsRouter.get('/:groupId/settlement', async (req: Request, res: Response): Promise<void> => {
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

  // Check Redis cache first
  try {
    const cached = await getCachedSettlement(groupId);
    if (cached) {
      res.json({ transfers: cached, cached: true });
      return;
    }
  } catch {
    // Redis down — proceed without cache
  }

  // Compute pairwise debts from all expenses
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  if (expenses.length === 0) {
    res.json({ transfers: [], cached: false });
    return;
  }

  // Build raw pairwise debts: each split user owes the payer their share
  const debts: { fromUserId: string; toUserId: string; amount: number }[] = [];

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId !== expense.paidById) {
        debts.push({
          fromUserId: split.userId,
          toUserId: expense.paidById,
          amount: split.share,
        });
      }
    }
  }

  if (debts.length === 0) {
    res.json({ transfers: [], cached: false });
    return;
  }

  // Run simplification in worker thread
  const transfers = await runSimplification(debts);

  // Enrich transfers with user names
  const userIds = new Set<string>();
  for (const t of transfers) {
    userIds.add(t.fromUserId);
    userIds.add(t.toUserId);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, firstName: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const enrichedTransfers = transfers.map((t) => ({
    from: userMap.get(t.fromUserId) ?? { id: t.fromUserId },
    to: userMap.get(t.toUserId) ?? { id: t.toUserId },
    amount: t.amount,
  }));

  // Cache in Redis
  try {
    await cacheSettlement(groupId, enrichedTransfers);
  } catch {
    // Redis down — proceed without caching
  }

  res.json({ transfers: enrichedTransfers, cached: false });
});

// POST /groups/:groupId/payments — Record a payment and notify via RabbitMQ
settlementsRouter.post('/:groupId/payments', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.groupId;

  const { toUserId, amount } = req.body;

  if (!toUserId || typeof toUserId !== 'string') {
    res.status(400).json({ error: 'toUserId is required' });
    return;
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number' });
    return;
  }

  // Authorization: caller must be a member
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Validate that toUserId is a member
  const recipientMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: toUserId, groupId } },
  });

  if (!recipientMembership) {
    res.status(400).json({ error: 'Recipient must be a member of the group' });
    return;
  }

  // Generate a unique message ID for RabbitMQ deduplication
  const messageId = randomUUID();

  // Create the payment record
  const payment = await prisma.payment.create({
    data: {
      groupId,
      fromUserId: userId,
      toUserId,
      amount,
      messageId,
    },
  });

  // Get user and group names for the notification message
  const [fromUser, toUser, group] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
    prisma.user.findUnique({ where: { id: toUserId }, select: { firstName: true } }),
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
  ]);

  // Publish to RabbitMQ (async — don't wait for notification delivery)
  try {
    await publishPaymentNotification({
      paymentId: payment.id,
      fromUserId: userId,
      fromName: fromUser?.firstName ?? 'Someone',
      toUserId,
      toName: toUser?.firstName ?? 'Someone',
      amount,
      groupId,
      groupName: group?.name ?? 'Unknown Group',
      messageId,
    });
  } catch (err) {
    // Log but don't fail — the payment is recorded in PostgreSQL
    console.error('RabbitMQ publish failed (payment was saved):', err);
  }

  res.status(201).json({ payment });
});

// POST /groups/:groupId/payments/:paymentId/confirm — Confirm a received payment
settlementsRouter.post('/:groupId/payments/:paymentId/confirm', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { paymentId } = req.params;

  // Only the recipient can confirm
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  if (payment.toUserId !== userId) {
    res.status(403).json({ error: 'Only the recipient can confirm a payment' });
    return;
  }

  if (payment.confirmedAt) {
    res.status(409).json({ error: 'Payment already confirmed' });
    return;
  }

  const confirmed = await prisma.payment.update({
    where: { id: paymentId },
    data: { confirmedAt: new Date() },
  });

  res.json({ payment: confirmed });
});
