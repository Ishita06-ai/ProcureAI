import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { NotificationService } from '../services/notification.service.js';

export const NotificationController = {
  list:        asyncHandler(async (req, res) => res.json(ok(await NotificationService.list({ userId: req.user.id, unreadOnly: req.query.unread, limit: Number(req.query.limit) || 30 })))),
  unreadCount: asyncHandler(async (req, res) => res.json(ok({ count: await NotificationService.unreadCount(req.user.id) }))),
  markRead:    asyncHandler(async (req, res) => res.json(ok(await NotificationService.markRead(req.params.id, req.user.id)))),
  markAllRead: asyncHandler(async (req, res) => res.json(ok(await NotificationService.markAllRead(req.user.id)))),
};
