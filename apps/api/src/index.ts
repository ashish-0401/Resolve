import dotenv from 'dotenv';
// Load .env from the api directory first, then fall back to root
dotenv.config({ path: './apps/api/.env' });
dotenv.config(); // also load root .env (won't override existing vars)

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { groupsRouter } from './routes/groups.js';
import { expensesRouter } from './routes/expenses.js';
import { settlementsRouter } from './routes/settlements.js';

// CONCEPT: Express Application Setup
// This is the entry point for the entire backend. It:
//   1. Creates an Express app
//   2. Registers global middleware (JSON parsing, cookies, CORS)
//   3. Mounts route handlers at their URL prefixes
//   4. Starts listening on the configured port
//
// Middleware order matters:
//   - express.json() must come first so req.body is parsed for all routes
//   - cookieParser() must come before auth middleware so req.cookies is available
//   - cors() allows the React frontend (different port in dev) to make API calls
//
// Interview: "I structured the Express app with layered middleware — body parsing,
// cookie parsing, CORS, then route-specific auth — following the middleware pipeline pattern."

const app = express();

// --- Global Middleware ---

// Parse JSON request bodies (max 10mb to allow payment proof images)
app.use(express.json({ limit: '10mb' }));

// Parse cookies so we can read the JWT from httpOnly cookie
app.use(cookieParser());

// Allow requests from the React frontend (runs on port 5173 in dev with Vite)
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true, // Required for cookies to be sent cross-origin
}));

// --- Routes ---
app.use('/auth', authRouter);
app.use('/groups', groupsRouter);
app.use('/groups', expensesRouter);
app.use('/groups', settlementsRouter);

// Health check endpoint (useful for deployment platforms)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start Server ---
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`🚀 RESOLVE API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export { app };
