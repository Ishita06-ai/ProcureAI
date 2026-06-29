import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { TeamController } from '../controllers/team.controller.js';
import { z } from 'zod';

const r = new Router();
r.use(authMiddleware());
r.get('/members', requireRole('admin','manager'), TeamController.list);
r.post('/members',     requireRole('admin'), validate(z.object({
  email: z.string().email(), name: z.string().min(2),
  role: z.enum(['admin','manager','buyer','viewer']).optional(),
})), TeamController.invite);
r.patch('/members/:id/role',   requireRole('admin'), validate(z.object({ role: z.enum(['admin','manager','buyer','viewer']) })), TeamController.updateRole);
r.patch('/members/:id/status', requireRole('admin'), validate(z.object({ status: z.enum(['active','invited','disabled']) })), TeamController.setStatus);
r.delete('/members/:id',       requireRole('admin'), TeamController.remove);
r.get('/audit-log', requireRole('admin','manager'), TeamController.auditLog);
export default r;
