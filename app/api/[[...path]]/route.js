// Next.js ↔ Express adapter. The ONLY file coupled to Next.js.
// Builds Express-shaped req/res and delegates to the portable server.
import { NextResponse } from 'next/server';
import app from '@/server/index.js';

async function adapt(request, ctx, method) {
  const url = new URL(request.url);
  const segments = (await ctx.params).path || [];
  const path = '/' + segments.join('/');

  let body = undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      const ct = request.headers.get('content-type') || '';
      if (ct.includes('application/json')) body = await request.json();
      else if (ct.includes('text/')) body = await request.text();
    } catch { body = undefined; }
  }

  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  const query = Object.fromEntries(url.searchParams.entries());

  const req = {
    method, path, query, params: {}, headers, body,
    ip: request.headers.get('x-forwarded-for') || '',
    originalUrl: url.pathname + url.search,
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

  await app.handle(req, res);

  if (!sent) {
    statusCode = 404;
    responseBody = JSON.stringify({ success: false, error: { message: 'Not found' } });
  }
  return new NextResponse(responseBody, { status: statusCode, headers: responseHeaders });
}

export const GET    = (req, ctx) => adapt(req, ctx, 'GET');
export const POST   = (req, ctx) => adapt(req, ctx, 'POST');
export const PUT    = (req, ctx) => adapt(req, ctx, 'PUT');
export const PATCH  = (req, ctx) => adapt(req, ctx, 'PATCH');
export const DELETE = (req, ctx) => adapt(req, ctx, 'DELETE');
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization' } });
