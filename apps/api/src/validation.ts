import { z } from 'zod';

// CONCEPT: Zod Validation Schemas
// Zod validates incoming request data at the API boundary — if a request body
// doesn't match the schema, it's rejected before reaching any business logic.
// This is "validation at system boundaries" — the principle that you trust data
// inside your system, but verify everything that enters from the outside.
// Interview: "I validate all API inputs with Zod schemas at the boundary,
// so the rest of my codebase can assume data is correctly shaped."

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number().positive('Amount must be positive'),
  paidById: z.string().min(1, 'Payer is required'),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1),
        share: z.number().positive('Share must be positive'),
      })
    )
    .min(1, 'At least one split is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
