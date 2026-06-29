import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const StockLevelSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  productId: { type: String, required: true, index: true },
  warehouseId: { type: String, required: true, index: true },
  onHand: { type: Number, default: 0, min: 0 },
  reserved: { type: Number, default: 0, min: 0 },
  inbound: { type: Number, default: 0, min: 0 },
  lastMovementAt: Date,
}, { timestamps: true, versionKey: false });

StockLevelSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

StockLevelSchema.virtual('available').get(function () {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0));
});
StockLevelSchema.set('toJSON', { virtuals: true });
StockLevelSchema.set('toObject', { virtuals: true });

export const StockLevel = mongoose.models.StockLevel || mongoose.model('StockLevel', StockLevelSchema);
