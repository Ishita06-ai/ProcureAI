import { Router } from '../router.js';
import { DashboardController } from '../controllers/dashboard.controller.js';

const r = new Router();
r.get('/overview', DashboardController.overview);
export default r;
