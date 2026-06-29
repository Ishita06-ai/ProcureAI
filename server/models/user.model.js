import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'buyer', 'viewer'], default: 'buyer', index: true },
  avatar: { type: String },
  status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
  lastLoginAt: { type: Date },
}, { timestamps: true, versionKey: false });

UserSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  return o;
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
