import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { ReportController } from '../controllers/report.controller.js';

const r = new Router();
r.use(authMiddleware());
r.get('/', ReportController.list);
r.get('/:name', requireRole('admin','manager'), ReportController.download);
export default r;
