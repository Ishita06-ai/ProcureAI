import { z } from 'zod';

export const createGrnSchema = z.object({
  poId: z.string().min(1),
  receivedAt: z.string().optional(),
  status: z.enum(['PartiallyReceived', 'Received', 'Disputed']).optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    description: z.string().optional(),
    qtyOrdered: z.number().min(0).optional(),
    qtyReceived: z.number().min(0),
    condition: z.enum(['good', 'damaged', 'wrong-item']).optional(),
    notes: z.string().optional(),
  })).min(1),
});
