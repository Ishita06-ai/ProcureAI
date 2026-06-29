import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const VendorSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  country: { type: String },
  status: { type: String, enum: ['Preferred', 'Active', 'Watchlist', 'At Risk', 'Inactive'], default: 'Active' },
  risk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  score: { type: Number, min: 0, max: 100, default: 70 },
  spend: { type: Number, default: 0 },
  contactEmail: { type: String },
  contactPhone: { type: String },
  tags: [{ type: String }],
  createdBy: { type: String },
}, { timestamps: true, versionKey: false });

VendorSchema.index({ name: 'text', category: 'text', country: 'text' });

export const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
