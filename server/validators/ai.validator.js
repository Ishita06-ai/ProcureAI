import { z } from 'zod';

export const chatSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().min(1).max(2000),
});
