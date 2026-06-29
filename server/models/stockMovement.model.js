import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const StockMovementSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  productId: { type: String, required: true, index: true },
  productSku: String,
  productName: String,
  warehouseId: { type: String, required: true, index: true },
  warehouseCode: String,
  type: { type: String, enum: ['IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT'], required: true, index: true },
  qty: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
  // For transfers
  counterWarehouseId: String,
  counterWarehouseCode: String,
  // For traceability
  refType: { type: String, enum: ['GRN', 'PO', 'Manual', 'Transfer', 'Adjustment', 'Sale'], default: 'Manual' },
  refId: String,
  refNumber: String,
  reason: String,
  // Batch info (optional)
  lotNumber: String,
  expiryDate: Date,
  actorId: String,
  actorName: String,
  at: { type: Date, default: Date.now, index: true },
}, { timestamps: false, versionKey: false });

StockMovementSchema.index({ at: -1 });
StockMovementSchema.index({ productId: 1, at: -1 });
StockMovementSchema.index({ warehouseId: 1, at: -1 });

export const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);
