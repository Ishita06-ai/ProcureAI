import crypto from 'crypto';

// Minimal HS256 JWT (header.payload.signature) — portable, no deps.
// In standalone Express, swap to `jsonwebtoken`; signing payload shape is identical.
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlDecode = (str) => Buffer.from(
  str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4), 'base64'
);

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s === 'dev-secret-change-in-prod-9f8a7e6b5c') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET env var is not set or is using the default dev value. Set a strong secret before deploying.');
    }
  }
  return s || 'dev-secret-change-me';
};

export function signJwt(payload, { expiresIn = 60 * 60 * 24 * 7 } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresIn, ...payload };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = b64url(crypto.createHmac('sha256', secret()).update(`${h}.${p}`).digest());
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p).toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
}