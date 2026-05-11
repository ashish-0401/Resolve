# RESOLVE — Project Instructions for GitHub Copilot

## What This Project Is
A group expense settlement PWA. Users add trip expenses, the app computes minimum
transfers using a greedy debt simplification algorithm, visualizes debts as a
Neo4j graph, and sends Web Push notifications when payments are marked done.
Full spec is in `RESOLVE_BUILD_CONTEXT.md` at the project root.

## Tech Stack (never suggest alternatives unless asked)
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL via Prisma ORM (source of truth)
- **Graph DB**: Neo4j AuraDB (CQRS read model for debt graph)
- **Queue**: RabbitMQ via amqplib (CloudAMQP free tier in prod)
- **Cache**: Redis via ioredis (Upstash free tier in prod)
- **Worker Threads**: Node.js `worker_threads` for CPU-bound debt simplification algorithm
- **Frontend**: React + Vite (PWA via vite-plugin-pwa + Workbox)
- **AI**: Gemini 1.5 Flash with function calling (@google/generative-ai)
- **Auth**: JWT stored in httpOnly cookies (no localStorage)
- **Push Notifications**: Web Push API via `web-push` npm package + VAPID keys
- **Local Dev**: Docker Compose (PostgreSQL + RabbitMQ + Redis)

## Architecture Decisions (never change these without asking)
- PostgreSQL is the source of truth for all writes
- Neo4j is a derived read model — synced after every expense write via CQRS pattern
- Debt simplification runs in a worker thread (never in the main event loop)
- Expense writes use `SELECT FOR UPDATE` pessimistic locking (not optimistic)
- RabbitMQ consumer runs inside the same Express process (not a separate service)
- Redis deduplication prevents duplicate notifications on consumer crash + redeliver
- JWT stored in httpOnly cookie — never expose to JavaScript

## How to Help Me
I am learning these concepts while building. For every non-trivial piece of code:
1. Write the full working code first
2. Then add a short `// CONCEPT:` comment block explaining:
   - What this code does in plain English
   - What concept it demonstrates (e.g. "pessimistic locking", "CQRS", "worker threads")
   - One sentence I can say about it in a technical interview

If I ask "why?" or "what is X?" — stop and explain it simply before writing more code.
Never assume I already understand the concept just because we wrote it before.

## Code Style
- TypeScript strict mode, no `any`
- Async/await everywhere, no raw `.then()` chains
- Named exports only, no `export default`
- One responsibility per file — keep files small and focused
- Errors must be handled explicitly — no silent catches
- Use `zod` for request validation at API boundaries
