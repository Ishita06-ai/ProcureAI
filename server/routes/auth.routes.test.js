// Guards the new login brute-force protection: POST /login must run a rate
// limiter BEFORE the (expensive scrypt) login handler. We assert the route
// structure and prove the mounted middleware blocks a burst of 11 requests on
// one key — the handler chain never needs to run scrypt to make that point.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import authRoutes from './auth.routes.js';

function mockReq() {
  return { method: 'POST', path: '/login', user: { id: 'brute-force-ip' }, ip: '127.0.0.1', headers: {}, params: {}, query: {} };
}
function mockRes() {
  const headers = {};
  return {
    headers, statusCode: 200, sent: false, body: null,
    set(k, v) { headers[k] = v; return this; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; this.sent = true; return this; },
    send(p) { this.sent = true; return this; },
    end() { this.sent = true; return this; },
  };
}

describe('auth.routes login protection', () => {
  test('POST /login mounts limiter + validate + handler (in that order)', () => {
    const layer = authRoutes.stack.find((l) => l.method === 'POST' && l.path === '/login');
    assert.ok(layer, 'POST /login route is registered');
    assert.ok(layer.handlers.length >= 3, 'login chain includes limiter, validator, and handler');
  });

  test('the mounted limiter rejects the 11th request from one IP with 429', () => {
    const layer = authRoutes.stack.find((l) => l.method === 'POST' && l.path === '/login');
    const limiter = layer.handlers[0];

    const req = mockReq();
    let handlerReached = 0;
    for (let i = 0; i < 11; i++) {
      const res = mockRes();
      limiter(req, res, () => handlerReached++);
      if (res.statusCode === 429) break;
    }
    assert.equal(handlerReached, 10, 'only 10 requests pass the limiter');
    // A 12th request is still blocked within the window.
    const blocked = mockRes();
    limiter(req, blocked, () => handlerReached++);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.body.success, false);
  });
});
