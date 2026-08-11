import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(120),
  role: z.enum(['admin', 'manager', 'finance', 'director', 'buyer', 'viewer']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const demoLoginSchema = z.object({
  role: z.enum(['admin', 'buyer', 'manager', 'finance', 'director']),
});
