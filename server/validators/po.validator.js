import { z } from 'zod';

export const createPoSchema = z.object({
  vendorId: z.string().min(1),
  amount: z.number().min(0),
  status: z.enum(['Draft', 'Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled']).optional(),
  eta: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    description: z.string().optional(),
    qty: z.number().min(0).optional(),
    unitPrice: z.number().min(0).optional(),
  })).optional(),
  notes: z.string().optional(),
});
