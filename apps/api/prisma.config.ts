import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// CONCEPT: Prisma 7 Config File
// Starting with Prisma 7, the database connection URL is configured here
// instead of in the schema.prisma file. This separates schema definition
// (what tables/columns exist) from runtime configuration (where the database is).
// The `migrate` section provides the URL for Prisma Migrate (schema changes),
// while the client gets the URL at runtime via the PrismaClient constructor or env.

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: databaseUrl,
  },
  migrate: {
    url: databaseUrl,
  },
});
