import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  country: z.string().optional(),
  status: z.enum(['Preferred', 'Active', 'Watchlist', 'At Risk', 'Inactive']).optional(),
  risk: z.enum(['low', 'medium', 'high']).optional(),
  score: z.number().min(0).max(100).optional(),
  spend: z.number().min(0).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateVendorSchema = createVendorSchema.partial();
