import { Notification } from '../models/notification.model.js';

export const NotificationService = {
  async list({ userId, unreadOnly, limit = 30 }) {
    const filter = { $or: [{ userId }, { userId: null }] };
    if (unreadOnly === 'true' || unreadOnly === true) filter.readAt = null;
    return Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  },
  async unreadCount(userId) {
    return Notification.countDocuments({ $or: [{ userId }, { userId: null }], readAt: null });
  },
  async markRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, $or: [{ userId }, { userId: null }] },
      { readAt: new Date() }, { new: true }
    ).lean();
  },
  async markAllRead(userId) {
    await Notification.updateMany({ $or: [{ userId }, { userId: null }], readAt: null }, { readAt: new Date() });
    return { ok: true };
  },
  async create(data) {
    return (await Notification.create(data)).toObject();
  },
  async emit({ userId = null, kind = 'system', severity = 'info', title, body, link, meta }) {
    return this.create({ userId, kind, severity, title, body, link, meta });
  },
};
