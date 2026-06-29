import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const NotificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, index: true },         // null = broadcast to all users
  kind: { type: String, enum: ['pr','po','grn','stock','ai','system'], default: 'system', index: true },
  severity: { type: String, enum: ['info','success','warning','error'], default: 'info' },
  title: { type: String, required: true },
  body: String,
  link: String,                                    // e.g. "procurement"
  meta: mongoose.Schema.Types.Mixed,
  readAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
