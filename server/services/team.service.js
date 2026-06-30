import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { hashPassword } from '../utils/password.js';
import { conflict, notFound, badRequest } from '../utils/apiError.js';
import { getEmailProvider } from '../providers/email/index.js';
import { NotificationService } from './notification.service.js';

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

    try {
      const provider = getEmailProvider();
      await provider.send({
        to: email,
        subject: 'You have been invited to ProcureAI',
        html: `<div style="font-family:sans-serif"><h2>Welcome to ProcureAI, ${name}</h2><p>You've been added as a <b>${role}</b>.</p><p>Temporary password: <code>${tempPassword}</code></p><p>Please log in and change your password.</p></div>`,
        text: `Welcome to ProcureAI, ${name}. You've been added as a ${role}. Temporary password: ${tempPassword}`,
        meta: { kind: 'team.invite', userId: user._id },
      });
    } catch { /* never block invite flow on email failure */ }

    await NotificationService.emit({
      kind: 'system', severity: 'info', title: 'New team member invited',
      body: `${name} (${email}) was invited as ${role}.`, link: 'settings',
    }).catch(() => {});

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