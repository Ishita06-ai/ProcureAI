import { Router } from '../router.js';
import { GrnController } from '../controllers/grn.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createGrnSchema } from '../validators/grn.validator.js';

const r = new Router();
r.use(authMiddleware({ required: false }));
r.get('/', GrnController.list);
r.get('/:id', GrnController.get);
r.post('/', authMiddleware(), requireRole('admin','manager','buyer'), validate(createGrnSchema), GrnController.create);
export default r;
