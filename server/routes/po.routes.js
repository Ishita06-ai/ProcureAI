import { Router } from '../router.js';
import { PoController } from '../controllers/po.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createPoSchema } from '../validators/po.validator.js';
import { commentSchema } from '../validators/purchaseRequest.validator.js';
import { z } from 'zod';

const r = new Router();
r.use(authMiddleware({ required: false }));
r.get('/', PoController.list);
r.get('/recent', PoController.recent);
r.get('/:id', PoController.get);
r.post('/', authMiddleware(), requireRole('admin','manager','buyer'), validate(createPoSchema), PoController.create);
r.patch('/:id/status', authMiddleware(), requireRole('admin','manager'),
  validate(z.object({ status: z.enum(['Draft','Pending','Rejected','Approved','In Transit','Delivered','Cancelled']) })),
  PoController.updateStatus);
// Approval workflow — role is checked per-step in the service (manager/finance/
// director/admin against the currently pending stage).
const approvalActionSchema = z.object({ comment: z.string().max(500).optional() });
r.post('/:id/approve', authMiddleware(), validate(approvalActionSchema), PoController.approve);
r.post('/:id/reject', authMiddleware(), validate(approvalActionSchema), PoController.reject);
r.post('/:id/comments', authMiddleware(), validate(commentSchema), PoController.addComment);
export default r;
