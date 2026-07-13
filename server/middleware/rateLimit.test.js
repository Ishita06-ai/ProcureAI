// rateLimit is pure middleware (in-memory Map, no DB), so these tests run
// with plain `node --test` — no flags, no mocking.
//
// The rate-limit bucket Map is module-level and shared across every call to
// rateLimit() within this process, so each test uses its own unique key
// (a distinct req.user.id) to stay isolated from the others.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from './rateLimit.js';

function mockReq(userId) {
  return { user: { id: userId }, ip: '127.0.0.1', headers: {} };
}

function mockRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    set(key, value) { headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('rateLimit', () => {
  test('allows requests under the limit and calls next()', () => {
    const mw = rateLimit({ max: 3, windowMs: 60_000 });
    const req = mockReq('user-a');
    let nextCalled = 0;
    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      mw(req, res, () => nextCalled++);
      assert.equal(res.statusCode, 200);
    }
    assert.equal(nextCalled, 3);
  });

  test('blocks the request once the limit is exceeded, with a 429 and no next()', () => {
    const mw = rateLimit({ max: 2, windowMs: 60_000 });
    const req = mockReq('user-b');
    let nextCalled = 0;
    for (let i = 0; i < 2; i++) mw(req, mockRes(), () => nextCalled++);

    const res = mockRes();
    mw(req, res, () => nextCalled++);

    assert.equal(res.statusCode, 429);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, 2);
  });

  test('sets X-RateLimit-Limit and X-RateLimit-Remaining headers on every call', () => {
    const mw = rateLimit({ max: 5, windowMs: 60_000 });
    const req = mockReq('user-c');
    const res1 = mockRes();
    mw(req, res1, () => {});
    assert.equal(res1.headers['X-RateLimit-Limit'], '5');
    assert.equal(res1.headers['X-RateLimit-Remaining'], '4');

    const res2 = mockRes();
    mw(req, res2, () => {});
    assert.equal(res2.headers['X-RateLimit-Remaining'], '3');
  });

  test('sets Retry-After only on the blocked response', () => {
    const mw = rateLimit({ max: 1, windowMs: 60_000 });
    const req = mockReq('user-d');
    const ok = mockRes();
    mw(req, ok, () => {});
    assert.equal(ok.headers['Retry-After'], undefined);

    const blocked = mockRes();
    mw(req, blocked, () => {});
    assert.ok(Number(blocked.headers['Retry-After']) > 0);
  });

  test('different users (different keys) get independent buckets', () => {
    const mw = rateLimit({ max: 1, windowMs: 60_000 });
    const resA1 = mockRes();
    mw(mockReq('user-e1'), resA1, () => {});
    const resB1 = mockRes();
    mw(mockReq('user-e2'), resB1, () => {});
    // Both are each user's first request, so neither should be blocked yet.
    assert.equal(resA1.statusCode, 200);
    assert.equal(resB1.statusCode, 200);
  });

  test('the bucket resets once windowMs has elapsed', async () => {
    const mw = rateLimit({ max: 1, windowMs: 30 });
    const req = mockReq('user-f');
    const first = mockRes();
    mw(req, first, () => {});
    assert.equal(first.statusCode, 200);

    const blocked = mockRes();
    mw(req, blocked, () => {});
    assert.equal(blocked.statusCode, 429);

    await new Promise((resolve) => setTimeout(resolve, 40));

    const afterWindow = mockRes();
    let nextCalled = false;
    mw(req, afterWindow, () => { nextCalled = true; });
    assert.equal(afterWindow.statusCode, 200);
    assert.ok(nextCalled);
  });

  test('a custom keyFn overrides the default user/ip-based key', () => {
    const mw = rateLimit({ max: 1, windowMs: 60_000, keyFn: (req) => req.headers['x-api-key'] });
    const reqA = { user: { id: 'same-user' }, headers: { 'x-api-key': 'key-1' } };
    const reqB = { user: { id: 'same-user' }, headers: { 'x-api-key': 'key-2' } };

    const resA = mockRes();
    mw(reqA, resA, () => {});
    const resB = mockRes();
    mw(reqB, resB, () => {});

    // Same user.id, but different keyFn result — both are "first requests".
    assert.equal(resA.statusCode, 200);
    assert.equal(resB.statusCode, 200);
  });
});