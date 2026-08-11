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

// Sequential amount-based approval step for a PO. Mirrors the PR approval
// chain but scoped to the manager/finance/director routing and extended with
// `startedAt` so SLA (48h default) can be measured per stage.
const PoApprovalStepSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  requiredRole: { type: String, enum: ['manager', 'finance', 'director'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
  approverId: String,
  approverName: String,
  // When this stage entered the queue (SLA starts here).
  startedAt: Date,
  actedAt: Date,
  comment: String,
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
  status: { type: String, enum: ['Draft', 'Pending', 'Rejected', 'Approved', 'In Transit', 'Delivered', 'Cancelled'], default: 'Pending', index: true },
  deliveryStatus: { type: String, enum: ['NotShipped', 'Shipped', 'PartiallyReceived', 'Received'], default: 'NotShipped' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  eta: { type: String, default: '—' },
  expectedDate: Date,
  deliveredAt: Date,
  lines: [PoLineSchema],
  notes: String,
  comments: [CommentSchema],
  activityLog: [ActivitySchema],
  approvalChain: [PoApprovalStepSchema],
  currentLevel: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

// Hot read paths: status-filtered PO lists + spend-trend grouping by month,
// and the CSV export sorted by createdAt. Compound + plain indexes serve both.
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ createdAt: -1 });

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
