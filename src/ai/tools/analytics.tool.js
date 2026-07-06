// AnalyticsTool — spend trend, spend by category/department, approval
// funnel, and top-level procurement KPIs. Reuses the existing
// AnalyticsService and DashboardService (both already cached internally).
import { AnalyticsService } from '../../../server/services/analytics.service.js';
import { DashboardService } from '../../../server/services/dashboard.service.js';

export default {
  name: 'analytics',
  description: 'Spend trend, spend by category/department, approval funnel, and top-level procurement KPIs.',

  async execute() {
    const [overview, dashboard] = await Promise.all([
      AnalyticsService.overview(),
      DashboardService.overview(),
    ]);

    return {
      kpis: dashboard.kpis,
      spendTrend: overview.trend,
      spendByCategory: overview.byCat,
      spendByDepartment: overview.byDept,
      approvalFunnel: overview.funnel,
      topVendorsBySpend: overview.topVendors,
    };
  },
};