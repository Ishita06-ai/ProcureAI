import { z } from 'zod';

export const prItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  qty: z.number().min(0),
  unit: z.string().optional(),
  estimatedUnitPrice: z.number().min(0).optional(),
});

export const createPrSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  department: z.string().optional(),
  costCenter: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  neededBy: z.string().optional(),
  items: z.array(prItemSchema).min(1),
});

export const updatePrSchema = createPrSchema.partial();

export const approvalSchema = z.object({
  comment: z.string().optional(),
});

export const quoteSchema = z.object({
  vendorId: z.string(),
  amount: z.number().min(0),
  leadTimeDays: z.number().int().min(0).optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

export const selectVendorSchema = z.object({
  vendorId: z.string(),
  amount: z.number().min(0).optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1),
  internal: z.boolean().optional(),
});

export const convertToPoSchema = z.object({
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});
