import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// CONCEPT: JWT Authentication Middleware
// This middleware runs before every protected route. It:
//   1. Reads the JWT from an httpOnly cookie (NOT from Authorization header or localStorage)
//   2. Verifies the signature using the server's secret key
//   3. Attaches the decoded user data to req.user so route handlers can use it
//
// Why httpOnly cookie instead of localStorage?
//   - localStorage is accessible via JavaScript → any XSS attack can steal the token
//   - httpOnly cookies are NEVER accessible to JavaScript (document.cookie won't show it)
//   - The browser automatically sends it with every request — no manual "Bearer" header needed
//
// Interview: "I store JWTs in httpOnly cookies to prevent XSS token theft.
// The cookie is invisible to client-side JavaScript, and the browser sends it automatically."

interface JwtPayload {
  userId: string;
  email: string;
}

// Extend Express Request to include our user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated — no token found' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' });
}
