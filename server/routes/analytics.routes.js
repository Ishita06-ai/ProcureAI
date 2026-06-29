import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';

const r = new Router();
r.use(authMiddleware({ required: false }));
r.get('/overview', AnalyticsController.overview);
r.get('/spend-trend', AnalyticsController.spendTrend);
r.get('/spend-by-category', AnalyticsController.spendByCategory);
r.get('/spend-by-department', AnalyticsController.spendByDepartment);
r.get('/approval-funnel', AnalyticsController.approvalFunnel);
r.get('/top-vendors', AnalyticsController.topVendors);
r.get('/cycle-times', AnalyticsController.cycleTimes);
export default r;
