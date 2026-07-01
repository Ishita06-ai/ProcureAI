import { Router } from '../router.js';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const r = new Router();

r.get('/', authMiddleware(), WorkspaceController.get);
r.patch('/', authMiddleware(), requireRole('admin'), WorkspaceController.update);

export default r;