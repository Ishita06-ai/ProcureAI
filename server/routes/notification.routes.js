import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotificationController } from '../controllers/notification.controller.js';

const r = new Router();
r.use(authMiddleware());
r.get('/', NotificationController.list);
r.get('/unread-count', NotificationController.unreadCount);
r.post('/:id/read', NotificationController.markRead);
r.post('/read-all', NotificationController.markAllRead);
export default r;
