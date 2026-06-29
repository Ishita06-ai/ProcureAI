import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const PrItemSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  description: String,
  category: String,
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'pcs' },
  estimatedUnitPrice: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, default: 0 },
}, { _id: false });

const ApprovalStepSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  requiredRole: { type: String, enum: ['admin', 'manager'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
  approverId: String,
  approverName: String,
  actedAt: Date,
  comment: String,
}, { _id: false });

const VendorQuoteSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  vendorId: { type: String, required: true },
  vendorName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  leadTimeDays: Number,
  validUntil: Date,
  notes: String,
  attachmentId: String,
  submittedAt: { type: Date, default: Date.now },
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: String,
  userName: String,
  text: { type: String, required: true },
  internal: { type: Boolean, default: false },
  at: { type: Date, default: Date.now },
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  url: { type: String, required: true },
  mime: String,
  size: Number,
  kind: { type: String, enum: ['quotation', 'invoice', 'contract', 'other'], default: 'other' },
  uploadedBy: String,
  uploadedByName: String,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  at: { type: Date, default: Date.now },
  actorId: String,
  actorName: String,
  action: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
}, { _id: false });

const PurchaseRequestSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  number: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  department: { type: String, default: 'Operations', index: true },
  costCenter: String,
  requesterId: { type: String, index: true },
  requesterName: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Cancelled'], default: 'Draft', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
  neededBy: Date,
  currency: { type: String, default: 'USD' },
  items: [PrItemSchema],
  estimatedTotal: { type: Number, default: 0, index: true },
  approvalChain: [ApprovalStepSchema],
  currentLevel: { type: Number, default: 0 },
  vendorQuotes: [VendorQuoteSchema],
  selectedVendorId: String,
  selectedVendorName: String,
  selectedQuoteAmount: Number,
  poId: String,
  poNumber: String,
  comments: [CommentSchema],
  attachments: [AttachmentSchema],
  activityLog: [ActivitySchema],
}, { timestamps: true, versionKey: false });

PurchaseRequestSchema.index({ status: 1, createdAt: -1 });
PurchaseRequestSchema.index({ title: 'text', description: 'text', number: 'text' });

export const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', PurchaseRequestSchema);
