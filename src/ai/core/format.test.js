// Pure tests for shared context-formatting helpers — no DB, no LLM.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { serializeToolResults, toCitations } from './format.js';

const result = (tool, action, payload) => ({
  tool,
  description: `desc-${tool}`,
  data: { success: true, action, data: payload },
});

describe('serializeToolResults', () => {
  test('returns empty string for no results', () => {
    assert.equal(serializeToolResults([]), '');
  });

  test('serializes all blocks when under the budget', () => {
    const r = result('inventory', 'low_stock', [{ sku: 'A1', qty: 2 }]);
    const out = serializeToolResults([r], { maxTotalChars: 10000 });
    assert.ok(out.includes('# inventory — low_stock'));
    assert.ok(out.includes('"A1"'));
  });

  test('with Infinity budget nothing is truncated', () => {
    const big = result('vendor', 'summary', { topVendors: Array.from({ length: 500 }, (_, i) => ({ name: `V${i}` })) });
    const out = serializeToolResults([big], { maxTotalChars: Infinity });
    assert.ok(out.length > 5000);
  });

  test('caps total length and keeps earlier (more important) results whole', () => {
    const a = result('analytics', 'spend_trend', { months: Array.from({ length: 12 }, () => 12345) });
    const b = result('vendor', 'summary', { topVendors: Array.from({ length: 50 }, (_, i) => ({ name: `Vendor ${i}` })) });
    const budget = 800;
    const out = serializeToolResults([a, b], { maxTotalChars: budget });
    assert.ok(out.length <= budget + 1, `length ${out.length} exceeded budget ${budget}`);
    // The first block must appear intact (planner order = priority).
    assert.ok(out.startsWith('# analytics — spend_trend'));
  });

  test('skips ungrounded (failed) results', () => {
    const ok = result('inventory', 'summary', { kpis: { onHand: 1 } });
    const failed = { tool: 'po', description: 'x', data: { success: false, action: 'x', error: 'boom' } };
    const errored = { tool: 'po', description: 'x', data: null, error: 'executor failure' };
    const out = serializeToolResults([failed, ok, errored], { maxTotalChars: 10000 });
    assert.ok(out.includes('inventory'));
    assert.ok(!out.includes('boom'));
    assert.ok(!out.includes('executor failure'));
  });
});

describe('toCitations', () => {
  test('builds one citation per grounded result with a preview', () => {
    const r = result('inventory', 'low_stock', [{ sku: 'A1', qty: 2 }]);
    const cites = toCitations([r]);
    assert.equal(cites.length, 1);
    assert.equal(cites[0].kind, 'inventory');
    assert.equal(cites[0].value.action, 'low_stock');
    assert.ok(cites[0].value.preview.includes('A1'));
  });
});
