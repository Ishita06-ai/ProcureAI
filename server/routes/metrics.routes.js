import { Router } from '../router.js';
import { MetricsController } from '../controllers/metrics.controller.js';

const r = new Router();
r.get('/health', MetricsController.health);
r.get('/metrics', MetricsController.metrics);
export default r;
