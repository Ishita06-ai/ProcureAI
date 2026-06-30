import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { hashPassword } from '../utils/password.js';
import { conflict, notFound, badRequest } from '../utils/apiError.js';
import { EmailNotify } from './emailNotify.service.js';

export const TeamService = {
  async list() {
    return User.find().sort({ createdAt: -1 }).lean();
  },
  async invite({ email, name, role = 'buyer' }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw conflict('Email already exists');
    const tempPassword = `Welcome-${Math.random().toString(36).slice(2, 8)}`;
    const user = await User.create({
      email, name, role,
      status: 'invited',
      passwordHash: await hashPassword(tempPassword),
    });
    await EmailNotify.teamInvite({ email, name, role, tempPassword });
    return { user: user.toObject(), tempPassword };
  },
  async updateRole(id, role) {
    if (!['admin','manager','buyer','viewer'].includes(role)) throw badRequest('Invalid role');
    const u = await User.findByIdAndUpdate(id, { role }, { new: true }).lean();
    if (!u) throw notFound('User not found');
    return u;
  },
  async setStatus(id, status) {
    if (!['active','invited','disabled'].includes(status)) throw badRequest('Invalid status');
    const u = await User.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!u) throw notFound('User not found');
    return u;
  },
  async remove(id) {
    const u = await User.findByIdAndDelete(id);
    if (!u) throw notFound('User not found');
    return { id };
  },
  async auditLog({ limit = 100 } = {}) {
    return AuditLog.find().sort({ at: -1 }).limit(limit).lean();
  },
};