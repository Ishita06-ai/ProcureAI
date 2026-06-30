import { z } from 'zod';

export const uploadFileSchema = z.object({
  base64: z.string().min(10, 'base64 file data is required'),
  filename: z.string().min(1).default('file'),
  contentType: z.string().min(1).default('application/octet-stream'),
  folder: z.string().min(1).optional(),
});