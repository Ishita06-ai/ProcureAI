// Unit tests for the shared PO approval-workflow logic (server/utils/approval.js).
// Pure functions — no DB, no mocks required.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVAL_SLA_HOURS, buildPoApprovalChain, canApproveStep, stepSla, deriveApprovalChain,
} from './approval.js';

describe('buildPoApprovalChain', () => {
  test('PO under ₹50,000 needs Manager only', () => {
    const chain = buildPoApprovalChain(30000);
    assert.equal(chain.length, 1);
    assert.equal(chain[0].requiredRole, 'manager');
    assert.equal(chain[0].status, 'pending');
    assert.equal(chain[0].level, 1);
  });

  test('PO of exactly ₹49,999 needs Manager only', () => {
    assert.equal(buildPoApprovalChain(49999).length, 1);
  });

  test('PO of ₹50,000 needs Manager → Finance', () => {
    const chain = buildPoApprovalChain(50000);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
  });

  test('PO of ₹1,00,000 needs Manager → Finance', () => {
    const chain = buildPoApprovalChain(100000);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
  });

  test('PO of exactly ₹2,00,000 needs Manager → Finance (not Director)', () => {
    const chain = buildPoApprovalChain(200000);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
  });

  test('PO above ₹2,00,000 needs Manager → Finance → Director', () => {
    const chain = buildPoApprovalChain(200001);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance', 'director']);
  });

  test('PO of ₹3,00,000 needs Manager → Finance → Director', () => {
    const chain = buildPoApprovalChain(300000);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance', 'director']);
    assert.deepEqual(chain.map(s => s.level), [1, 2, 3]);
  });

  test('zero/undefined amount still requires Manager (defensive)', () => {
    assert.equal(buildPoApprovalChain(0).length, 1);
    assert.equal(buildPoApprovalChain(undefined).length, 1);
  });
});

describe('canApproveStep', () => {
  const pendingManager = { requiredRole: 'manager', status: 'pending' };
  const pendingFinance = { requiredRole: 'finance', status: 'pending' };
  const approvedManager = { requiredRole: 'manager', status: 'approved' };

  test('manager can approve a manager step', () => {
    assert.equal(canApproveStep('manager', pendingManager), true);
  });
  test('manager cannot approve a finance step', () => {
    assert.equal(canApproveStep('manager', pendingFinance), false);
  });
  test('finance can approve a finance step', () => {
    assert.equal(canApproveStep('finance', pendingFinance), true);
  });
  test('finance cannot approve a director step', () => {
    assert.equal(canApproveStep('finance', { requiredRole: 'director', status: 'pending' }), false);
  });
  test('director can approve a director step', () => {
    assert.equal(canApproveStep('director', { requiredRole: 'director', status: 'pending' }), true);
  });
  test('buyer cannot approve any step', () => {
    assert.equal(canApproveStep('buyer', pendingManager), false);
    assert.equal(canApproveStep('buyer', pendingFinance), false);
  });
  test('admin can approve any pending step (admin override)', () => {
    assert.equal(canApproveStep('admin', pendingManager), true);
    assert.equal(canApproveStep('admin', pendingFinance), true);
    assert.equal(canApproveStep('admin', { requiredRole: 'director', status: 'pending' }), true);
  });
  test('already-resolved steps cannot be approved again', () => {
    assert.equal(canApproveStep('manager', approvedManager), false);
    assert.equal(canApproveStep('admin', approvedManager), false);
  });
  test('missing step is not approvable', () => {
    assert.equal(canApproveStep('admin', undefined), false);
  });
});

describe('stepSla', () => {
  const now = new Date('2026-08-11T12:00:00Z');

  test('freshly-started pending step has ~0h and is not breached', () => {
    const step = { status: 'pending', startedAt: new Date(now.getTime() - 10 * 3600000) };
    const sla = stepSla(step, now);
    assert.equal(sla.pending, true);
    assert.equal(sla.breached, false);
    assert.ok(Math.abs(sla.durationHours - 10) < 0.01);
  });

  test('pending step older than the 48h SLA is breached', () => {
    const step = { status: 'pending', startedAt: new Date(now.getTime() - 50 * 3600000) };
    const sla = stepSla(step, now);
    assert.equal(sla.pending, true);
    assert.equal(sla.breached, true);
    assert.ok(Math.abs(sla.durationHours - 50) < 0.01);
  });

  test('exactly 48h pending is NOT yet breached (strictly over)', () => {
    const step = { status: 'pending', startedAt: new Date(now.getTime() - APPROVAL_SLA_HOURS * 3600000) };
    assert.equal(stepSla(step, now).breached, false);
  });

  test('resolved step reports actedAt − startedAt and is not pending/breached', () => {
    const step = {
      status: 'approved', startedAt: new Date(now.getTime() - 53 * 3600000),
      actedAt: new Date(now.getTime() - 53 * 3600000 + 5 * 3600000),
    };
    const sla = stepSla(step, now);
    assert.equal(sla.pending, false);
    assert.equal(sla.breached, false);
    assert.ok(Math.abs(sla.durationHours - 5) < 0.01);
  });

  test('missing step yields a safe empty result', () => {
    const sla = stepSla(undefined, now);
    assert.deepEqual(sla, { pending: false, durationHours: 0, breached: false });
  });
});

describe('deriveApprovalChain', () => {
  test('returns the persisted chain when present', () => {
    const chain = [{ level: 1, requiredRole: 'manager', status: 'approved' }];
    const po = { amount: 300000, approvalChain: chain };
    assert.equal(deriveApprovalChain(po), chain);
  });

  test('builds a chain from amount for legacy POs, backfilling stage-1 start', () => {
    const createdAt = new Date('2026-08-01T00:00:00Z');
    const po = { amount: 100000, createdAt };
    const chain = deriveApprovalChain(po);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
    assert.equal(new Date(chain[0].startedAt).getTime(), createdAt.getTime());
  });

  test('empty/missing chain defaults to manager-only chain for small amounts', () => {
    const po = { amount: 30000 };
    assert.deepEqual(deriveApprovalChain(po).map(s => s.requiredRole), ['manager']);
  });

  test('legacy Approved PO derives an all-approved chain, never pending', () => {
    const createdAt = new Date('2026-08-01T00:00:00Z');
    const po = { amount: 100000, status: 'Approved', createdAt };
    const chain = deriveApprovalChain(po);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
    assert.ok(chain.every(s => s.status === 'approved'), 'every step approved');
    assert.ok(chain.every(s => !!(s.startedAt && s.actedAt)), 'steps carry start + acted timestamps');
  });

  test('legacy Approved small PO derives a single approved step', () => {
    const chain = deriveApprovalChain({ amount: 30000, status: 'Approved' });
    assert.equal(chain.length, 1);
    assert.equal(chain[0].status, 'approved');
  });

  test('legacy In Transit / Delivered / Cancelled PO also derives approved steps', () => {
    for (const status of ['In Transit', 'Delivered', 'Cancelled']) {
      const chain = deriveApprovalChain({ amount: 50000, status });
      assert.ok(chain.every(s => s.status === 'approved'), `${status} → all approved`);
    }
  });

  test('legacy Rejected PO derives a rejected first step (never pending)', () => {
    const chain = deriveApprovalChain({ amount: 300000, status: 'Rejected' });
    assert.equal(chain[0].status, 'rejected');
    assert.ok(chain.slice(1).every(s => s.status === 'pending'), 'later steps untouched, but non-current');
  });

  test('legacy Pending PO still backfills stage-1 start for SLA measurement', () => {
    const createdAt = new Date('2026-08-01T00:00:00Z');
    const po = { amount: 100000, status: 'Pending', createdAt };
    const chain = deriveApprovalChain(po);
    assert.deepEqual(chain.map(s => s.requiredRole), ['manager', 'finance']);
    assert.equal(chain[0].status, 'pending');
    assert.equal(new Date(chain[0].startedAt).getTime(), createdAt.getTime());
  });
});
