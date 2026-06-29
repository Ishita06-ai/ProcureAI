import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const AuditSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  actorId: { type: String, index: true },
  actorName: String,
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true, index: true },
  resourceId: { type: String, index: true },
  meta: mongoose.Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: 'at', updatedAt: false }, versionKey: false });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditSchema);
