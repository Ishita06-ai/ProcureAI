import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { GrnService } from '../services/grn.service.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

export const GrnController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, status, sort } = req.query;
    const { items, total } = await GrnService.list({ q, status, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  get: asyncHandler(async (req, res) => res.json(ok(await GrnService.get(req.params.id)))),
  create: asyncHandler(async (req, res) => {
    const grn = await GrnService.create(req.body, req.user);
    await recordAudit({ req, action: 'grn.create', resource: 'grn', resourceId: grn._id, meta: { number: grn.number, po: grn.poNumber } });
    res.status(201).json(ok(grn));
  }),
};
