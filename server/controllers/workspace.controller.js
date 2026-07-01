import { WorkspaceService } from '../services/workspace.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

export const WorkspaceController = {
  get: asyncHandler(async (_req, res) => {
    const ws = await WorkspaceService.get();
    ok(res, ws);
  }),

  update: asyncHandler(async (req, res) => {
    const ws = await WorkspaceService.update(req.body);
    ok(res, ws, 'Workspace updated');
  }),
};