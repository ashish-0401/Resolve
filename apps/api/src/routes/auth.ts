import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validation.js';

// CONCEPT: Auth Routes (Register + Login)
// These two routes handle user authentication:
//   POST /auth/register — creates a new user with a hashed password
//   POST /auth/login    — verifies credentials and sets a JWT cookie
//
// Password hashing: We NEVER store plain-text passwords. bcrypt hashes the password
// with a "salt" (random data) so even identical passwords produce different hashes.
// The salt rounds (12) control how slow hashing is — slower = harder to brute-force.
//
// Cookie settings:
//   httpOnly: true  → JavaScript can't read it (prevents XSS token theft)
//   secure: true    → only sent over HTTPS (prevents network sniffing)
//   sameSite: 'lax' → prevents CSRF from other domains
//   maxAge: 7 days  → auto-expires, user must re-login
//
// Interview: "I hash passwords with bcrypt at 12 salt rounds and store JWTs in
// httpOnly secure cookies to prevent both password leaks and XSS token theft."

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  // Validate request body with Zod
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { email, firstName, password } = result.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Hash password — 12 salt rounds is the sweet spot (secure but not too slow)
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: { email, firstName, passwordHash },
    select: { id: true, email: true, firstName: true, createdAt: true },
  });

  // Sign JWT and set as httpOnly cookie
  const token = signToken({ userId: user.id, email: user.email });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  res.status(201).json({ user });
});

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { email, password } = result.data;

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether the email exists — same error for both cases
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Compare plain password with stored hash
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Sign JWT and set as httpOnly cookie
  const token = signToken({ userId: user.id, email: user.email });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    },
  });
});

authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});
