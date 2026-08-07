/**
 * Drives the app's request handler (the same Router the Next.js adapter calls)
 * with a Next-adapter-shaped req/res, returning status + timing + DB stats.
 *
 * This measures the full request-handling path (middleware → controller →
 * service → MongoDB) minus only the HTTP transport layer, which is identical
 * before and after — so before/after deltas are valid.
 */
import { signJwt } from '../../server/utils/jwt.js';

export function buildReqRes({ method = 'GET', path = '/', query = {}, body, user, headers = {} }) {
  const queryStr = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined)).toString();
  const url = `http://localhost${path}${queryStr ? `?${queryStr}` : ''}`;
  const u = new URL(url);

  const token = user ? signJwt({ sub: user.id, role: user.role, name: user.name, email: user.email }) : null;

  const req = {
    method,
    path: u.pathname,
    query: Object.fromEntries(u.searchParams.entries()),
    params: {},
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
    ip: '127.0.0.1',
    originalUrl: u.pathname + u.search,
  };

  let statusCode = 200;
  let responseHeaders = { 'content-type': 'application/json' };
  let responseBody = null;
  let sent = false;
  const res = {
    _sent: false,
    status(code) { statusCode = code; return this; },
    set(name, value) { responseHeaders[name.toLowerCase()] = value; return this; },
    json(data) { responseBody = JSON.stringify(data); this._sent = true; sent = true; return this; },
    send(data) { responseBody = typeof data === 'string' ? data : JSON.stringify(data); this._sent = true; sent = true; return this; },
    end() { this._sent = true; sent = true; },
  };
  return { req, res, get: () => ({ status: statusCode, body: responseBody, headers: responseHeaders, sent }) };
}

/**
 * Run one request through the app and measure wall-clock time.
 * DB query accounting is NOT managed here — callers wrap drive() in
 * queryCounter.start()/stop() when they want DB stats (avoids nested
 * start/stop clobbering an outer measurement window).
 * @param {object} app the composed Router from server/index.js
 */
export async function drive(app, opts) {
  const { req, res, get } = buildReqRes(opts);
  const t0 = performance.now();
  await app.handle(req, res);
  const ms = performance.now() - t0;
  return { ...get(), ms: Math.round(ms * 1000) / 1000 };
}

export default { buildReqRes, drive };