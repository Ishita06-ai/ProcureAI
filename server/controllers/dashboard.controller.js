import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { DashboardService } from '../services/dashboard.service.js';

export const DashboardController = {
  overview: asyncHandler(async (req, res) => {
    res.json(ok(await DashboardService.overview()));
  }),
};
