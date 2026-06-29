import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { PoService } from '../services/po.service.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

export const PoController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, status, sort } = req.query;
    const { items, total } = await PoService.list({ q, status, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  get: asyncHandler(async (req, res) => res.json(ok(await PoService.get(req.params.id)))),
  create: asyncHandler(async (req, res) => {
    const po = await PoService.create(req.body, req.user);
    await recordAudit({ req, action: 'po.create', resource: 'po', resourceId: po._id });
    res.status(201).json(ok(po));
  }),
  updateStatus: asyncHandler(async (req, res) => {
    const po = await PoService.updateStatus(req.params.id, req.body.status, req.user);
    await recordAudit({ req, action: 'po.statusChange', resource: 'po', resourceId: po._id, meta: { status: po.status } });
    res.json(ok(po));
  }),
  addComment: asyncHandler(async (req, res) => res.json(ok(await PoService.addComment(req.params.id, req.body.text, req.user)))),
  recent: asyncHandler(async (req, res) => res.json(ok(await PoService.recent(Number(req.query.limit) || 6)))),
};
