import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const GrnLineSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  sku: String, description: String,
  qtyOrdered: { type: Number, default: 0 },
  qtyReceived: { type: Number, required: true, min: 0 },
  condition: { type: String, enum: ['good', 'damaged', 'wrong-item'], default: 'good' },
  notes: String,
}, { _id: false });

const GoodsReceivedNoteSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  number: { type: String, required: true, unique: true, index: true },
  poId: { type: String, required: true, index: true },
  poNumber: { type: String, required: true },
  vendorId: String,
  vendorName: String,
  receivedById: String,
  receivedByName: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PartiallyReceived', 'Received', 'Disputed'], default: 'Received', index: true },
  lines: [GrnLineSchema],
  notes: String,
}, { timestamps: true, versionKey: false });

export const GoodsReceivedNote = mongoose.models.GoodsReceivedNote || mongoose.model('GoodsReceivedNote', GoodsReceivedNoteSchema);
