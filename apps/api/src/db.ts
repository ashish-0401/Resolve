import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// CONCEPT: Singleton Prisma Client with Lazy Initialization (Prisma 7)
// Prisma 7 no longer reads the database URL from the schema file.
// Instead, we create a "driver adapter" — a thin wrapper around the `pg` driver —
// and pass it to PrismaClient.
//
// IMPORTANT: We use lazy initialization (create on first use, not at import time).
// Why? TypeScript hoists all `import` statements above other code. So if we created
// the client at the top level of this module, it would run BEFORE dotenv loads
// environment variables — and `process.env.DATABASE_URL` would be undefined.
// By wrapping in a getter function, the client is only created when the first route
// handler actually calls `prisma.user.findMany()` etc., by which time the env is loaded.
//
// Interview: "I use lazy initialization for the Prisma client so it's created after
// environment variables are loaded, avoiding import hoisting issues in ESM."

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — check your .env file');
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Lazy getter — creates the client on first access, not at import time
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// For convenience: a proxy that lazily initializes on first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});
