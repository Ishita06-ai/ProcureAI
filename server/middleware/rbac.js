import { forbidden } from '../utils/apiError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(forbidden('Authentication required'));
  if (!roles.includes(req.user.role)) return next(forbidden(`Requires role: ${roles.join(' or ')}`));
  next();
};
