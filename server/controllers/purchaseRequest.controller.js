import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { PrService } from '../services/purchaseRequest.service.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

export const PrController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, status, priority, department, sort } = req.query;
    const { items, total } = await PrService.list({ q, status, priority, department, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  board: asyncHandler(async (req, res) => res.json(ok(await PrService.board()))),
  get:   asyncHandler(async (req, res) => res.json(ok(await PrService.get(req.params.id)))),
  create: asyncHandler(async (req, res) => {
    const pr = await PrService.create(req.body, req.user);
    await recordAudit({ req, action: 'pr.create', resource: 'pr', resourceId: pr._id, meta: { number: pr.number } });
    res.status(201).json(ok(pr));
  }),
  update: asyncHandler(async (req, res) => {
    const pr = await PrService.update(req.params.id, req.body, req.user);
    await recordAudit({ req, action: 'pr.update', resource: 'pr', resourceId: pr._id });
    res.json(ok(pr));
  }),
  submit: asyncHandler(async (req, res) => {
    const pr = await PrService.submit(req.params.id, req.user);
    await recordAudit({ req, action: 'pr.submit', resource: 'pr', resourceId: pr._id });
    res.json(ok(pr));
  }),
  startReview: asyncHandler(async (req, res) => res.json(ok(await PrService.startReview(req.params.id, req.user)))),
  approve: asyncHandler(async (req, res) => {
    const pr = await PrService.approve(req.params.id, req.body, req.user);
    await recordAudit({ req, action: 'pr.approve', resource: 'pr', resourceId: pr._id });
    res.json(ok(pr));
  }),
  reject: asyncHandler(async (req, res) => {
    const pr = await PrService.reject(req.params.id, req.body, req.user);
    await recordAudit({ req, action: 'pr.reject', resource: 'pr', resourceId: pr._id });
    res.json(ok(pr));
  }),
  addQuote: asyncHandler(async (req, res) => res.json(ok(await PrService.addQuote(req.params.id, req.body, req.user)))),
  selectVendor: asyncHandler(async (req, res) => res.json(ok(await PrService.selectVendor(req.params.id, req.body, req.user)))),
  addComment: asyncHandler(async (req, res) => res.json(ok(await PrService.addComment(req.params.id, req.body, req.user)))),
  convertToPo: asyncHandler(async (req, res) => {
    const result = await PrService.convertToPo(req.params.id, req.body, req.user);
    await recordAudit({ req, action: 'pr.convertToPo', resource: 'pr', resourceId: req.params.id, meta: { po: result.po.number } });
    res.status(201).json(ok(result));
  }),
};
