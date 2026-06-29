import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { VendorService } from '../services/vendor.service.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

export const VendorController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, category, risk, status, sort } = req.query;
    const { items, total } = await VendorService.list({ q, category, risk, status, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  get: asyncHandler(async (req, res) => {
    res.json(ok(await VendorService.get(req.params.id)));
  }),
  create: asyncHandler(async (req, res) => {
    const v = await VendorService.create(req.body, req.user);
    await recordAudit({ req, action: 'vendor.create', resource: 'vendor', resourceId: v._id, meta: { name: v.name } });
    res.status(201).json(ok(v));
  }),
  update: asyncHandler(async (req, res) => {
    const v = await VendorService.update(req.params.id, req.body);
    await recordAudit({ req, action: 'vendor.update', resource: 'vendor', resourceId: v._id });
    res.json(ok(v));
  }),
  remove: asyncHandler(async (req, res) => {
    await VendorService.remove(req.params.id);
    await recordAudit({ req, action: 'vendor.delete', resource: 'vendor', resourceId: req.params.id });
    res.json(ok({ id: req.params.id }));
  }),
  top: asyncHandler(async (req, res) => {
    res.json(ok(await VendorService.topPerformers(Number(req.query.limit) || 6)));
  }),
};
