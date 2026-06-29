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
  validate(z.object({ status: z.enum(['Draft','Pending','Approved','In Transit','Delivered','Cancelled']) })),
  PoController.updateStatus);
r.post('/:id/comments', authMiddleware(), validate(commentSchema), PoController.addComment);
export default r;
