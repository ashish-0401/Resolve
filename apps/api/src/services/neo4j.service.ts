import neo4j, { Driver } from 'neo4j-driver';

// CONCEPT: Neo4j Service (CQRS Read Model)
// Neo4j stores the debt graph as a read model — the source of truth is PostgreSQL.
// After every expense write, we recompute pairwise net debts and upsert OWES edges.
// This keeps the graph visualization always in sync with the relational data.
//
// CQRS pattern: PostgreSQL handles writes (ACID transactions, pessimistic locking),
// Neo4j handles graph reads (debt visualization, path queries for AI explainer).
//
// Interview: "I used CQRS — PostgreSQL is the write store with ACID guarantees,
// Neo4j is the read model for graph queries. After each expense write, I sync
// computed net debts as OWES edges using MERGE to upsert."

let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

/**
 * Ensure a User node exists in Neo4j (idempotent via MERGE).
 */
export async function ensureUserNode(userId: string, email: string, firstName: string): Promise<void> {
  const session = getDriver().session();
  try {
    await session.run(
      `MERGE (u:User {id: $userId})
       SET u.email = $email, u.firstName = $firstName`,
      { userId, email, firstName }
    );
  } finally {
    await session.close();
  }
}

/**
 * Ensure a Group node exists in Neo4j (idempotent via MERGE).
 */
export async function ensureGroupNode(groupId: string, name: string): Promise<void> {
  const session = getDriver().session();
  try {
    await session.run(
      `MERGE (g:Group {id: $groupId})
       SET g.name = $name`,
      { groupId, name }
    );
  } finally {
    await session.close();
  }
}

/**
 * Sync pairwise net debts to Neo4j for a group.
 * Deletes all existing OWES edges for the group, then creates new ones.
 * This is called after every expense write.
 *
 * @param groupId - The group to sync
 * @param debts - Array of { fromUserId, toUserId, amount } representing net pairwise debts
 */
export async function syncDebtsToNeo4j(
  groupId: string,
  debts: { fromUserId: string; toUserId: string; amount: number }[]
): Promise<void> {
  const session = getDriver().session();
  try {
    // Delete all existing OWES edges for this group
    await session.run(
      `MATCH (:User)-[o:OWES]->(:User)
       WHERE o.groupId = $groupId
       DELETE o`,
      { groupId }
    );

    // Create new OWES edges for non-zero debts
    for (const debt of debts) {
      if (debt.amount > 0.01) {
        await session.run(
          `MATCH (from:User {id: $fromUserId}), (to:User {id: $toUserId})
           CREATE (from)-[:OWES {amount: $amount, groupId: $groupId}]->(to)`,
          { fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: debt.amount, groupId }
        );
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * Get all debts in a group from Neo4j.
 */
export async function getGroupDebts(groupId: string): Promise<
  { fromId: string; fromName: string; toId: string; toName: string; amount: number }[]
> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (u1:User)-[o:OWES]->(u2:User)
       WHERE o.groupId = $groupId AND o.amount > 0
       RETURN u1.id AS fromId, u1.firstName AS fromName,
              u2.id AS toId, u2.firstName AS toName, o.amount AS amount`,
      { groupId }
    );

    return result.records.map((r) => ({
      fromId: r.get('fromId'),
      fromName: r.get('fromName'),
      toId: r.get('toId'),
      toName: r.get('toName'),
      amount: r.get('amount'),
    }));
  } finally {
    await session.close();
  }
}
