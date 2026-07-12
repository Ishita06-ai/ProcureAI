import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isGrounded, groundedOnly } from './toolResult.js';

describe('toolResult.isGrounded', () => {
  test('rejects executor-level errors', () => {
    assert.equal(isGrounded({ tool: 'x', error: 'boom', data: null }), false);
  });

  test('rejects missing data', () => {
    assert.equal(isGrounded({ tool: 'x', data: null }), false);
  });

  test('rejects a tool-level success:false envelope even with no executor error', () => {
    assert.equal(isGrounded({ tool: 'inventory', data: { success: false, action: 'product_details', error: 'not found' } }), false);
  });

  test('accepts a tool-level success:true envelope', () => {
    assert.equal(isGrounded({ tool: 'inventory', data: { success: true, action: 'low_stock', data: [] } }), true);
  });

  test('accepts plain data with no envelope (tools that predate the convention)', () => {
    assert.equal(isGrounded({ tool: 'legacy', data: { anything: 1 } }), true);
  });
});

describe('toolResult.groundedOnly', () => {
  test('filters a mixed list down to only grounded results', () => {
    const results = [
      { tool: 'a', data: { success: true, action: 'x', data: [1] } },
      { tool: 'b', error: 'failed to load' },
      { tool: 'c', data: { success: false, action: 'y', error: 'no match' } },
      { tool: 'd', data: { success: true, action: 'z', data: [2] } },
    ];
    const kept = groundedOnly(results).map((r) => r.tool);
    assert.deepEqual(kept, ['a', 'd']);
  });
});