import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const PoLineSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  sku: String,
  description: String,
  qty: { type: Number, default: 1 },
  unit: { type: String, default: 'pcs' },
  unitPrice: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: String, userName: String, text: String,
  at: { type: Date, default: Date.now },
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  at: { type: Date, default: Date.now },
  actorId: String, actorName: String,
  action: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
}, { _id: false });

const PurchaseOrderSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  number: { type: String, required: true, unique: true, index: true },
  requestId: { type: String, index: true },
  requestNumber: String,
  vendorId: { type: String, required: true, index: true },
  vendorName: { type: String, required: true },
  ownerId: { type: String, index: true },
  ownerName: { type: String },
  status: { type: String, enum: ['Draft', 'Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled'], default: 'Pending', index: true },
  deliveryStatus: { type: String, enum: ['NotShipped', 'Shipped', 'PartiallyReceived', 'Received'], default: 'NotShipped' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  eta: { type: String, default: '—' },
  expectedDate: Date,
  deliveredAt: Date,
  lines: [PoLineSchema],
  notes: String,
  comments: [CommentSchema],
  activityLog: [ActivitySchema],
}, { timestamps: true, versionKey: false });

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
