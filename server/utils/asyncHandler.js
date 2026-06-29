// Wrap async handlers so thrown errors flow to the error middleware (Express-style).
export const asyncHandler = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (err) { next(err); }
};
