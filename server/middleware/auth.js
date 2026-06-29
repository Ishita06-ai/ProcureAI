import { verifyJwt } from '../utils/jwt.js';
import { unauthorized } from '../utils/apiError.js';

// Reads `Authorization: Bearer <token>`. Populates req.user. No DB hit.
export function authMiddleware({ required = true } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token ? verifyJwt(token) : null;
    if (!payload && required) return next(unauthorized('Missing or invalid token'));
    req.user = payload ? { id: payload.sub, role: payload.role, name: payload.name, email: payload.email } : null;
    next();
  };
}
