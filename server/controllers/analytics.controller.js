import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { AnalyticsService } from '../services/analytics.service.js';

export const AnalyticsController = {
  overview:           asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.overview()))),
  spendTrend:         asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.spendTrend()))),
  spendByCategory:    asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.spendByCategory()))),
  spendByDepartment:  asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.spendByDepartment()))),
  approvalFunnel:     asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.approvalFunnel()))),
  topVendors:         asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.topVendorsBySpend()))),
  cycleTimes:         asyncHandler(async (req, res) => res.json(ok(await AnalyticsService.cycleTimes()))),
};
