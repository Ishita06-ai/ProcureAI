// Planner is pure (no I/O), so these tests run with plain `node --test`,
// no flags, no mocking, no DB.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { plan } from './planner.js';

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
});