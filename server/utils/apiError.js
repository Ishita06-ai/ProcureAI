// Express-portable utilities. No Next.js imports.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.isApiError = true;
  }
}
export const badRequest = (m, d) => new ApiError(400, m, d);
export const unauthorized = (m = 'Unauthorized') => new ApiError(401, m);
export const forbidden = (m = 'Forbidden') => new ApiError(403, m);
export const notFound = (m = 'Not found') => new ApiError(404, m);
export const conflict = (m = 'Conflict') => new ApiError(409, m);
export const serverError = (m = 'Internal server error') => new ApiError(500, m);
