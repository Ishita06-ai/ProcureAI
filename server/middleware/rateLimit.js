// Token-bucket rate limiter (in-memory). For multi-instance use a Redis backend.
const buckets = new Map();

export function rateLimit({ max = 60, windowMs = 60_000, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.user?.id || req.ip || req.headers['x-forwarded-for'] || 'global');
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || (now - b.start) > windowMs) {
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    b.count++;
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - b.count)));
    if (b.count > max) {
      res.set('Retry-After', String(Math.ceil((b.start + windowMs - now) / 1000)));
      return res.status(429).json({ success: false, error: { message: 'Too many requests' } });
    }
    next();
  };
}

// Periodic cleanup so map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if ((now - b.start) > 600_000) buckets.delete(k);
}, 300_000).unref?.();
