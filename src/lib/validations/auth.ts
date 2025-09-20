import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

// Login request validation
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Session validation
export const sessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.date(),
});

// User creation validation
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['PLAYER', 'COMMISSIONER', 'ADMIN']).default('PLAYER'),
  teamName: z.string().min(1).max(100).optional(),
});

// Password reset request validation
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

// Password reset validation
export const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;