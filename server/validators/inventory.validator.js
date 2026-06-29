import { z } from 'zod';

export const createWarehouseSchema = z.object({
  code: z.string().min(2).max(12),
  name: z.string().min(2),
  type: z.enum(['main', 'distribution', 'transit', 'storage']).optional(),
  city: z.string().optional(), country: z.string().optional(), address: z.string().optional(),
  managerName: z.string().optional(),
  capacityUnits: z.number().min(0).optional(),
});

export const createProductSchema = z.object({
  sku: z.string().min(2),
  barcode: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(1),
  unit: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  safetyStock: z.number().min(0).optional(),
  leadTimeDays: z.number().min(0).optional(),
  expiryTrackable: z.boolean().optional(),
  batchTrackable: z.boolean().optional(),
  defaultVendorId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const adjustStockSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  qty: z.number().refine(v => v !== 0, 'qty must be non-zero'),
  reason: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const transferStockSchema = z.object({
  productId: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  qty: z.number().positive(),
  reason: z.string().optional(),
});
