// NotificationTool — recent notifications and unread count, useful when the
// user asks things like "what needs my attention". Reuses NotificationService.
import { NotificationService } from '../../../server/services/notification.service.js';

export default {
  name: 'notification',
  description: 'Recent notifications and unread count for the current user.',

  /**
   * @param {{userId?: string|null, limit?: number}} input
   */
  async execute(input = {}) {
    const { userId = null, limit = 10 } = input;
    const [items, unreadCount] = await Promise.all([
      NotificationService.list({ userId, limit }),
      NotificationService.unreadCount(userId),
    ]);

    return {
      unreadCount,
      recent: items.map((n) => ({
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        body: n.body,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  },
};