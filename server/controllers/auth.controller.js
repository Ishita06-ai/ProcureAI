import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { AuthService } from '../services/auth.service.js';
import { recordAudit } from '../services/audit.service.js';

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    const { user, token } = await AuthService.register(req.body);
    await recordAudit({ req, action: 'auth.register', resource: 'user', resourceId: user._id });
    res.status(201).json(ok({ user, token }));
  }),
  login: asyncHandler(async (req, res) => {
    const { user, token } = await AuthService.login(req.body);
    await recordAudit({ req, action: 'auth.login', resource: 'user', resourceId: user._id });
    res.json(ok({ user, token }));
  }),
  me: asyncHandler(async (req, res) => {
    const user = await AuthService.me(req.user.id);
    res.json(ok({ user }));
  }),
};
