import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { createGroupSchema, addMemberSchema } from '../validation.js';

// CONCEPT: Group Routes (CRUD + Member Management)
// These routes let authenticated users create groups and manage memberships.
// Every route uses the `authenticate` middleware — it runs first and attaches
// `req.user` with the logged-in user's ID and email.
//
// Key design decisions:
//   - When you create a group, you're automatically added as a member
//   - Adding members is done by email (so you can invite someone who already registered)
//   - Only group members can view a group's details (authorization check)
//
// Interview: "Group routes are protected by JWT middleware. The creator is auto-added
// as a member, and I check membership before returning any group data — that's authorization."

export const groupsRouter = Router();

// All group routes require authentication
groupsRouter.use(authenticate);

// POST /groups — Create a new group
groupsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const result = createGroupSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { name } = result.data;

  // Create the group AND add the creator as a member in one transaction
  // CONCEPT: Prisma transaction — either both operations succeed, or neither does.
  // Without a transaction, the group could be created but the membership insert
  // could fail, leaving an orphaned group with no members.
  const group = await prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: { name },
    });

    await tx.groupMember.create({
      data: {
        userId,
        groupId: newGroup.id,
      },
    });

    return newGroup;
  });

  res.status(201).json({ group });
});

// GET /groups — List groups the current user belongs to
groupsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const groups = memberships.map((m) => ({
    ...m.group,
    memberCount: m.group._count.members,
  }));

  res.json({ groups });
});

// GET /groups/:id — Get a single group's details (only if you're a member)
groupsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.id;

  // Authorization check: is the user a member of this group?
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true },
          },
        },
      },
    },
  });

  res.json({ group });
});

// POST /groups/:id/members — Add a member by email
groupsRouter.post('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const groupId = req.params.id;

  const result = addMemberSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  // Authorization: only existing members can add new members
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Find the user to add by email
  const userToAdd = await prisma.user.findUnique({
    where: { email: result.data.email },
    select: { id: true, email: true, firstName: true },
  });

  if (!userToAdd) {
    res.status(404).json({ error: 'User not found — they need to register first' });
    return;
  }

  // Check if already a member
  const existingMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: userToAdd.id, groupId } },
  });

  if (existingMembership) {
    res.status(409).json({ error: 'User is already a member of this group' });
    return;
  }

  await prisma.groupMember.create({
    data: {
      userId: userToAdd.id,
      groupId,
    },
  });

  res.status(201).json({ member: userToAdd });
});
