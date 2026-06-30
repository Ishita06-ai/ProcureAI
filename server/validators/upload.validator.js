import { z } from 'zod';

export const uploadSchema = z.object({
  base64: z.string().min(10, 'base64 file data is required'),
  filename: z.string().min(1).default('file'),
  contentType: z.string().min(1).default('application/octet-stream'),
  folder: z.enum(['pr-attachments', 'po-attachments', 'invoices', 'avatars', 'uploads']).optional(),
  // Optional linkage so the file can be attached to a PR in the same call.
  purchaseRequestId: z.string().optional(),
  kind: z.enum(['quote', 'invoice', 'spec', 'image', 'other']).optional(),
});