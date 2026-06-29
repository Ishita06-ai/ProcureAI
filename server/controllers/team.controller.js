import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { TeamService } from '../services/team.service.js';
import { recordAudit } from '../services/audit.service.js';

export const TeamController = {
  list:    asyncHandler(async (req, res) => res.json(ok(await TeamService.list()))),
  invite:  asyncHandler(async (req, res) => {
    const { user, tempPassword } = await TeamService.invite(req.body);
    await recordAudit({ req, action: 'team.invite', resource: 'user', resourceId: user._id, meta: { email: user.email, role: user.role } });
    res.status(201).json(ok({ user, tempPassword }));
  }),
  updateRole: asyncHandler(async (req, res) => {
    const u = await TeamService.updateRole(req.params.id, req.body.role);
    await recordAudit({ req, action: 'team.updateRole', resource: 'user', resourceId: u._id, meta: { role: u.role } });
    res.json(ok(u));
  }),
  setStatus: asyncHandler(async (req, res) => {
    const u = await TeamService.setStatus(req.params.id, req.body.status);
    await recordAudit({ req, action: 'team.setStatus', resource: 'user', resourceId: u._id, meta: { status: u.status } });
    res.json(ok(u));
  }),
  remove: asyncHandler(async (req, res) => {
    await TeamService.remove(req.params.id);
    await recordAudit({ req, action: 'team.delete', resource: 'user', resourceId: req.params.id });
    res.json(ok({ id: req.params.id }));
  }),
  auditLog: asyncHandler(async (req, res) => res.json(ok(await TeamService.auditLog({ limit: Number(req.query.limit) || 100 })))),
};
