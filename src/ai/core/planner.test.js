// Planner is pure (no I/O), so these tests run with plain `node --test`,
// no flags, no mocking, no DB.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { plan, hasIntent } from './planner.js';

describe('planner.plan', () => {
  test('routes stock/inventory language to the inventory tool', () => {
    const steps = plan('what products are low on stock?');
    assert.ok(steps.some((s) => s.tool === 'inventory'));
  });

  test('routes vendor/supplier language to the vendor tool', () => {
    const steps = plan('which suppliers are high risk?');
    assert.ok(steps.some((s) => s.tool === 'vendor'));
  });

  test('routes spend/budget language to the analytics tool', () => {
    const steps = plan('what did we spend last month?');
    assert.ok(steps.some((s) => s.tool === 'analytics'));
  });

  test('routes notification language to the notification tool', () => {
    const steps = plan('do I have any unread alerts?');
    assert.ok(steps.some((s) => s.tool === 'notification'));
  });

  test('can select multiple tools when a message spans intents', () => {
    const steps = plan('are any of our risky vendors tied to low stock products?');
    const tools = steps.map((s) => s.tool);
    assert.ok(tools.includes('vendor'));
    assert.ok(tools.includes('inventory'));
  });

  test('falls back to analytics + inventory for vague/general questions', () => {
    const steps = plan('how are we doing?');
    const tools = steps.map((s) => s.tool);
    assert.deepEqual(tools.sort(), ['analytics', 'inventory'].sort());
  });

  test('every step forwards the original message as input.query', () => {
    const message = 'show me low stock items';
    const steps = plan(message);
    for (const step of steps) {
      assert.equal(step.input.query, message);
    }
  });

  test('handles empty input without throwing', () => {
    assert.doesNotThrow(() => plan());
    assert.doesNotThrow(() => plan(''));
  });

  // Vendor-domain questions that only touch spend/category do NOT also fire the
  // analytics tool — the vendor tool already returns spend + category breakdown,
  // so the analytics call would duplicate it (measured waste in bench-eval).
  test('vendor + spend question selects vendor only (no analytics duplicate)', () => {
    const steps = plan('who are our top vendors by spend?');
    assert.deepEqual(steps.map((s) => s.tool), ['vendor']);
  });

  test('vendor + category breakdown selects vendor only', () => {
    const steps = plan('give me a vendor category breakdown');
    assert.deepEqual(steps.map((s) => s.tool), ['vendor']);
  });

  test('vendor + deeper analytics signal (trend) keeps BOTH tools', () => {
    const steps = plan('what is the spend trend by vendor category?');
    const tools = steps.map((s) => s.tool);
    assert.ok(tools.includes('vendor'));
    assert.ok(tools.includes('analytics'));
  });

  test('"pending purchase orders" selects po only (pending is not analytics)', () => {
    const steps = plan('show pending purchase orders');
    assert.deepEqual(steps.map((s) => s.tool), ['po']);
  });

  test('"approvals pending" still routes to analytics', () => {
    const steps = plan('what approvals are pending?');
    assert.deepEqual(steps.map((s) => s.tool), ['analytics']);
  });

  test('cycle-time questions route to analytics (no fallback waste)', () => {
    const steps = plan('what is the average cycle time for purchase requests?');
    assert.deepEqual(steps.map((s) => s.tool), ['analytics']);
  });

  test('turnaround questions route to analytics', () => {
    const steps = plan('how long is the turnaround for purchase requests?');
    assert.deepEqual(steps.map((s) => s.tool), ['analytics']);
  });

  test('pure analytics spend-by-category is unaffected', () => {
    const steps = plan('what is the spend by category?');
    assert.deepEqual(steps.map((s) => s.tool), ['analytics']);
  });
});

describe('planner.hasIntent', () => {
  test('true when a concrete intent matches', () => {
    assert.equal(hasIntent('which vendors are high risk?'), true);
    assert.equal(hasIntent('do I have unread alerts?'), true);
  });

  test('false for vague/general questions that hit the fallback', () => {
    assert.equal(hasIntent('how are we doing?'), false);
    assert.equal(hasIntent(''), false);
  });
});