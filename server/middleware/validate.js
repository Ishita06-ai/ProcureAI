import { badRequest } from '../utils/apiError.js';

// Generic schema validator. Accepts a zod schema; returns a middleware.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(badRequest('Validation failed', result.error.flatten()));
  }
  req[source] = result.data;
  next();
};
