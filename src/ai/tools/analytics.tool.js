// AnalyticsTool — read-only data access for the Agent.
//
// Unlike inventory/vendor, AnalyticsService already exposes one granular,
// individually-cached method per metric — so this tool adds ZERO new
// service code. Every action below is a direct pass-through.
import { AnalyticsService } from '../../../server/services/analytics.service.js';
import { DashboardService } from '../../../server/services/dashboard.service.js';
import { logger } from '../utils/logger.js';

export const ACTIONS = {
  SPEND_TREND: 'spend_trend',
  SPEND_BY_CATEGORY: 'spend_by_category',
  SPEND_BY_DEPARTMENT: 'spend_by_department',
  APPROVAL_FUNNEL: 'approval_funnel',
  TOP_VENDORS_BY_SPEND: 'top_vendors_by_spend',
  CYCLE_TIMES: 'cycle_times',
  SUMMARY: 'summary',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// Explicit action wins; otherwise infer from free-text (useful until the
// planner passes structured actions); default to the broad summary.
function inferAction(input) {
  if (input.action) return input.action;
  const text = input.query || '';
  if (!text) return ACTIONS.SUMMARY;
  if (matches(text, 'trend', 'monthly', 'over time')) return ACTIONS.SPEND_TREND;
  if (matches(text, 'category')) return ACTIONS.SPEND_BY_CATEGORY;
  if (matches(text, 'department')) return ACTIONS.SPEND_BY_DEPARTMENT;
  if (matches(text, 'approval', 'funnel', 'pending')) return ACTIONS.APPROVAL_FUNNEL;
  if (matches(text, 'top vendor', 'vendor spend')) return ACTIONS.TOP_VENDORS_BY_SPEND;
  if (matches(text, 'cycle time', 'turnaround', 'how long')) return ACTIONS.CYCLE_TIMES;
  return ACTIONS.SUMMARY;
}

// ---------------------------------------------------------------------------
// Action handlers — direct pass-throughs to AnalyticsService.
// ---------------------------------------------------------------------------

async function handleSummary() {
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
}

const HANDLERS = {
  [ACTIONS.SPEND_TREND]: () => AnalyticsService.spendTrend(),
  [ACTIONS.SPEND_BY_CATEGORY]: () => AnalyticsService.spendByCategory(),
  [ACTIONS.SPEND_BY_DEPARTMENT]: () => AnalyticsService.spendByDepartment(),
  [ACTIONS.APPROVAL_FUNNEL]: () => AnalyticsService.approvalFunnel(),
  [ACTIONS.TOP_VENDORS_BY_SPEND]: () => AnalyticsService.topVendorsBySpend(),
  [ACTIONS.CYCLE_TIMES]: () => AnalyticsService.cycleTimes(),
  [ACTIONS.SUMMARY]: handleSummary,
};

export default {
  name: 'analytics',
  description:
    'Spend trend, spend by category/department, approval funnel, top vendors by spend, PR cycle times, ' +
    'and an overall procurement KPI summary. Read-only — fetches data, never generates text.',

  /**
   * @param {object} input
   * @param {string} [input.action] - one of ACTIONS; inferred from `query` if omitted
   * @param {string} [input.query]  - the original user message, used for inference only
   * @returns {Promise<{success:boolean, action:string, data?:any, error?:string}>}
   */
  async execute(input = {}) {
    const action = inferAction(input);
    const handler = HANDLERS[action];

    if (!handler) {
      logger.warn('analytics.tool.unknown_action', { action });
      return { success: false, action, error: `Unknown analytics action: "${action}"` };
    }

    try {
      const data = await handler();
      logger.info('analytics.tool.executed', { action });
      return { success: true, action, data };
    } catch (err) {
      logger.error('analytics.tool.failed', { action, err: err.message });
      return { success: false, action, error: err.message };
    }
  },
};