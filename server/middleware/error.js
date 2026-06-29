import { ApiError } from '../utils/apiError.js';

// Express-style 4-arg error middleware. Final handler.
export function errorMiddleware(err, req, res, next) {
  // Mongoose/Zod normalization
  const isApi = err && err.isApiError;
  const status = isApi ? err.status : (err.status || 500);
  const payload = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(err.details && { details: err.details }),
    },
  };
  if (status >= 500) console.error('[server-error]', req.method, req.path, err);
  res.status(status).json(payload);
}
