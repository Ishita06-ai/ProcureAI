// Security headers (Helmet-style, dependency-free).
export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.set('X-DNS-Prefetch-Control', 'off');
  res.set('X-XSS-Protection', '0');
  next();
}

// Recursive string sanitizer to neutralize basic XSS payloads in body.
function strip(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<\s*script\b[^>]*>([\s\S]*?)<\s*\/\s*script\s*>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bjavascript:/gi, '');
}
function sanitize(v) {
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = sanitize(v[k]);
    return out;
  }
  return strip(v);
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  next();
}
