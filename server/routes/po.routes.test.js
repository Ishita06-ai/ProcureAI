// Guards the PO approval-workflow endpoints: POST /:id/approve and POST
// /:id/reject must be mounted (authMiddleware → validator → controller), and
// the updateStatus route must reject an unknown status before the handler runs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import poRoutes from './po.routes.js';

function mockReq() {
  return { method: 'POST', path: '/xyz/approve', user: { id: 'u1' }, ip: '127.0.0.1', headers: {}, params: {}, query: {} };
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

describe('po.routes approval workflow', () => {
  test('POST /:id/approve is mounted with authMiddleware + validator + handler', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'POST' && l.path === '/:id/approve');
    assert.ok(layer, 'POST /:id/approve route is registered');
    assert.ok(layer.handlers.length >= 3, 'approve chain includes auth, validator, and controller');
  });

  test('POST /:id/reject is mounted with authMiddleware + validator + handler', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'POST' && l.path === '/:id/reject');
    assert.ok(layer, 'POST /:id/reject route is registered');
    assert.ok(layer.handlers.length >= 3, 'reject chain includes auth, validator, and controller');
  });

  test('approve validator rejects an over-long comment (400) before the handler runs', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'POST' && l.path === '/:id/approve');
    const validator = layer.handlers[1];
    const req = { method: 'POST', path: '/:id/approve', body: { comment: 'x'.repeat(501) }, ip: '127.0.0.1', headers: {}, params: {}, query: {} };
    const res = mockRes();
    let err = null;
    validator(req, res, (e) => { err = e; });
    assert.equal(err?.status, 400, 'over-long comment is rejected by the validator');
    assert.equal(err?.isApiError, true, 'validator forwards an ApiError');
  });

  test('approve validator accepts a missing/empty comment', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'POST' && l.path === '/:id/approve');
    const validator = layer.handlers[1];
    const res = mockRes();
    const nextCalls = [];
    validator({ ...mockReq(), body: {} }, res, (e) => nextCalls.push(e));
    validator({ ...mockReq(), body: { comment: '' } }, res, (e) => nextCalls.push(e));
    // A passing validation calls next() with no error (undefined), not null.
    assert.deepEqual(nextCalls, [undefined, undefined], 'missing/empty comment passes validation');
  });

  // updateStatus chain is [auth, requireRole, validate, controller] → validator is handlers[2].
  test('updateStatus validator rejects statuses outside the PO enum', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'PATCH' && l.path === '/:id/status');
    assert.ok(layer, 'PATCH /:id/status is registered');
    const validator = layer.handlers[2];
    const req = { method: 'PATCH', path: '/:id/status', body: { status: 'Funded' }, ip: '127.0.0.1', headers: {}, params: {}, query: {} };
    const res = mockRes();
    let err = null;
    validator(req, res, (e) => { err = e; });
    assert.equal(err?.status, 400, 'unknown status rejected by the validator');
  });

  test('updateStatus validator accepts the new Rejected status', () => {
    const layer = poRoutes.stack.find((l) => l.method === 'PATCH' && l.path === '/:id/status');
    const validator = layer.handlers[2];
    const res = mockRes();
    const nextCalls = [];
    validator({ method: 'PATCH', path: '/:id/status', body: { status: 'Rejected' }, ip: '127.0.0.1', headers: {}, params: {}, query: {} }, res, (e) => nextCalls.push(e));
    assert.deepEqual(nextCalls, [undefined], 'Rejected status passes the enum validator');
  });
});
