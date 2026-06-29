import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const ProductSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  sku: { type: String, required: true, unique: true, uppercase: true, index: true },
  barcode: { type: String, index: true, sparse: true },
  name: { type: String, required: true, index: true },
  description: String,
  category: { type: String, required: true, index: true },
  unit: { type: String, default: 'pcs' },
  unitCost: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  safetyStock: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 7 },
  expiryTrackable: { type: Boolean, default: false },
  batchTrackable: { type: Boolean, default: false },
  defaultVendorId: { type: String, index: true },
  defaultVendorName: String,
  imageUrl: String,
  tags: [String],
  status: { type: String, enum: ['active', 'discontinued', 'draft'], default: 'active', index: true },
}, { timestamps: true, versionKey: false });

ProductSchema.index({ name: 'text', sku: 'text', description: 'text' });

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
