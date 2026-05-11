# RESOLVE — Build Log

> This file is rewritten after every coding session to document what was built, why, and how it works.
> Last updated: May 11, 2026

---

## Phase 1 — Foundation (Completed)

### What was built
- **Monorepo** with pnpm workspaces (`apps/api` + `apps/web`)
- **Docker Compose** for local PostgreSQL, RabbitMQ, and Redis
- **Prisma 7 ORM** with schema, initial migration, and lazy-initialized client
- **JWT authentication** — register + login with httpOnly secure cookies
- **Groups CRUD** — create groups, list your groups, view group details, add members by email

### Key decisions
- **Prisma 7** doesn't allow `url` in the `datasource` block. The connection string is configured via `prisma.config.ts` for CLI commands and via a `pg.Pool` + `@prisma/adapter-pg` driver adapter for the runtime client.
- **Lazy initialization** for the Prisma client using a `Proxy` — ESM hoists `import` statements above `dotenv.config()`, so creating the client at import time would read `undefined` for `DATABASE_URL`. The Proxy defers creation to first property access.
- **bcrypt with 12 salt rounds** — industry standard for password hashing. Slow enough to resist brute-force, fast enough not to degrade UX.
- **JWT in httpOnly cookie** — prevents XSS token theft (JavaScript can't read `httpOnly` cookies). `sameSite: 'lax'` prevents CSRF. `secure: true` in production ensures HTTPS-only.

### Files
```
apps/api/src/index.ts          — Express app setup, middleware, route mounting
apps/api/src/db.ts             — Prisma client with lazy Proxy initialization
apps/api/src/validation.ts     — Zod schemas for request validation
apps/api/src/middleware/auth.ts — JWT verify middleware + signToken helper
apps/api/src/routes/auth.ts    — POST /auth/register, POST /auth/login
apps/api/src/routes/groups.ts  — POST /groups, GET /groups, GET /groups/:id, POST /groups/:id/members
apps/api/prisma/schema.prisma  — Full database schema (User, Group, Expense, Payment, etc.)
docker-compose.yml             — PostgreSQL 16, RabbitMQ 3, Redis 7
```

---

## Phase 2 — Core Expense Logic (Completed)

### What was built

#### 1. `POST /groups/:groupId/expenses` — Add expense with pessimistic locking

This is the most critical endpoint in the app. When someone adds an expense on a trip, it needs to:
1. Validate the request (description, amount, payer, splits)
2. Lock the group row to prevent concurrent corruption
3. Create the expense and its splits in a single transaction
4. Recompute pairwise net debts for the entire group
5. Sync those debts to Neo4j as `OWES` edges

**Why pessimistic locking?**

On a group trip, multiple people add expenses at the same time. Without locking:
- Alice and Bob both read the same group state simultaneously
- Both compute balances based on that same state
- Both write their updates
- One overwrites the other — balances are now wrong

The fix is `SELECT id FROM "Group" WHERE id = $groupId FOR UPDATE` inside a transaction. This PostgreSQL row-level lock means:
- Transaction A acquires the lock and proceeds
- Transaction B tries to acquire the same lock and **blocks** (waits)
- Transaction A commits → lock released → Transaction B proceeds with the updated state

This is better than optimistic locking (`version` column + retry on conflict) because expense writes are **high-contention** — everyone adds things at once. Optimistic locking would cause constant retry loops, degrading UX.

```typescript
const expense = await prisma.$transaction(async (tx) => {
  // Lock the group row — blocks other transactions until commit
  await tx.$executeRaw`SELECT id FROM "Group" WHERE id = ${groupId} FOR UPDATE`;

  // Safe to create expense + splits — we hold the exclusive lock
  const newExpense = await tx.expense.create({
    data: { groupId, description, amount, paidById, splits: { create: splits } },
    include: { splits: true, paidBy: { select: { id: true, email: true, firstName: true } } },
  });

  return newExpense;
  // Lock released when transaction commits
});
```

**Validation checks before the lock:**
- Zod schema validates shape (description, amount > 0, splits array non-empty)
- Splits must sum to the total amount (within 0.01 tolerance for floating point)
- Caller must be a member of the group (authorization)
- Payer must be a member of the group
- All split users must be members of the group

#### 2. Net balance computation

After each expense write, we compute the **net balance** for every person in the group:

```
balance = (total amount they paid across all expenses) - (total shares assigned to them)
```

- **Positive balance** = others owe them (they paid more than their fair share)
- **Negative balance** = they owe others (they consumed more than they paid)

Example with two expenses:
```
Expense 1: Alice pays €120 for dinner, split 50/50
  Alice: +120 (paid) - 60 (share) = +60
  Bob:   +0 (paid)   - 60 (share) = -60

Expense 2: Bob pays €80 for Uber, split 50/50
  Alice: +0 (paid)   - 40 (share) = -40    → cumulative: +60 + (-40) = +20
  Bob:   +80 (paid)  - 40 (share) = +40    → cumulative: -60 + (+40) = -20
```

Result: Bob owes Alice €20. The balances always sum to zero (conservation of money).

#### 3. Pairwise debt computation + Neo4j sync (CQRS)

Beyond just net balances per person, we also compute **pairwise debts** — who owes whom specifically:

1. For each expense, each split user owes the payer their share (except the payer themselves)
2. Net opposing debts: if A owes B €60 and B owes A €40, the result is A owes B €20
3. These pairwise debts are synced to Neo4j as `(:User)-[:OWES {amount, groupId}]->(:User)` edges

This is the **CQRS pattern**:
- **Command side (PostgreSQL):** ACID transactions, pessimistic locking, source of truth
- **Query side (Neo4j):** Graph read model for debt visualization and path queries

The sync happens **outside** the pessimistic lock transaction to minimize lock hold time. If Neo4j is unavailable, the expense is still saved — the sync can self-correct on the next expense or be retried.

```typescript
// After the locked transaction commits:
try {
  const debts = await computePairwiseDebts(groupId);
  await syncGroupToNeo4j(groupId, debts);
} catch (err) {
  // Log but don't fail — the expense was saved to PostgreSQL
  console.error('Neo4j sync failed (expense was saved):', err);
}
```

#### 4. `GET /groups/:groupId/balances` — Read balances from PostgreSQL

Returns the net balance for every member in the group. Computed on-the-fly from all expenses and splits — no denormalized balance column that could get out of sync.

#### 5. `GET /groups/:groupId/expenses` — List expenses

Returns all expenses in a group with payer info and splits, ordered newest first.

### Neo4j Service (`services/neo4j.service.ts`)

The Neo4j service manages the graph read model:

- `ensureUserNode(id, email, firstName)` — MERGE (upsert) a User node
- `ensureGroupNode(id, name)` — MERGE (upsert) a Group node
- `syncDebtsToNeo4j(groupId, debts)` — Delete all existing OWES edges for the group, then create new ones for non-zero debts
- `getGroupDebts(groupId)` — Query all OWES edges for a group (used later by the settlement algorithm and AI explainer)

The driver is lazily initialized (same pattern as Prisma) and uses `neo4j.auth.basic()` with credentials from environment variables.

### Files added/modified

```
NEW  apps/api/src/routes/expenses.ts         — POST/GET expenses, GET balances, debt computation
NEW  apps/api/src/services/neo4j.service.ts  — Neo4j CQRS sync (MERGE nodes, upsert OWES edges)
MOD  apps/api/src/validation.ts              — Added createExpenseSchema + CreateExpenseInput type
MOD  apps/api/src/index.ts                   — Mounted expensesRouter at /groups
```

### API endpoints after Phase 2

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Login, set JWT cookie |
| `GET` | `/health` | No | Health check |
| `POST` | `/groups` | Yes | Create a group |
| `GET` | `/groups` | Yes | List your groups |
| `GET` | `/groups/:id` | Yes | Group details + members |
| `POST` | `/groups/:id/members` | Yes | Add member by email |
| `POST` | `/groups/:groupId/expenses` | Yes | Add expense (pessimistic lock) |
| `GET` | `/groups/:groupId/expenses` | Yes | List group expenses |
| `GET` | `/groups/:groupId/balances` | Yes | Net balance per member |

### Test results

```
# Alice pays €120 dinner, split 50/50 with Bob
POST /groups/:id/expenses → 201 ✓ (expense created with splits)

# Bob pays €80 Uber, split 50/50
POST /groups/:id/expenses → 201 ✓

# Balances are correct
GET /groups/:id/balances → Alice: +20, Bob: -20 ✓

# Validation: splits don't sum to amount
POST /groups/:id/expenses → 400 "Splits must sum to the total amount" ✓

# Neo4j sync gracefully fails when AuraDB not configured
→ Logs error, expense still saved ✓
```

---

## What's next — Phase 3: Settlement Algorithm

- Worker thread setup with Node.js `worker_threads`
- Greedy debt simplification algorithm (at most n-1 transfers for n people)
- `GET /groups/:id/settlement` — runs simplification, returns optimized transfer list
- Redis caching of settlement plan (invalidated on new expense)
- `POST /payments` — mark payment complete, publish to RabbitMQ
