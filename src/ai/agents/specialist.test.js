// runSpecialist tests. The LLM service (gemini.service.js) is stubbed so no
// real provider call happens; the inventory tool's data service is stubbed so
// the specialist can ground a real answer without a database.
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../services/gemini.service.js', {
  namedExports: {
    generateReply: async () => ({ content: 'Mock specialist answer', provider: 'test-mock' }),
  },
});

mock.module('../../../server/services/stock.service.js', {
  namedExports: {
    StockService: {
      lowStockReport: async () => [
        { _id: 'p1', sku: 'SKU-1', name: 'Widget', available: 3, reorderLevel: 10, deficit: 7, leadTimeDays: 5, defaultVendorName: 'Acme Co' },
      ],
    },
  },
});

const { runSpecialist } = await import('./specialist.js');
const { getSpecialist, getSpecialists } = await import('./specialists.js');

describe('runSpecialist', () => {
  test('runs only within its own tool subset and returns grounded citations', async () => {
    const specialist = getSpecialist('inventory-agent');
    const result = await runSpecialist({
      message: 'list low stock items',
      specialist,
      context: { userId: 'u1' },
    });

    // The inventory-agent may only call the inventory tool.
    assert.equal(result.toolResults.length, 1);
    assert.equal(result.toolResults[0].tool, 'inventory');
    assert.equal(result.toolResults[0].error, undefined);

    assert.equal(result.content, 'Mock specialist answer');
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].kind, 'inventory');
    assert.equal(result.provider, 'test-mock');
    assert.equal(result.usedFallback, false);
  });

  test('every specialist has a distinct role prompt and a non-empty tool subset', () => {
    const names = getSpecialists().map((s) => s.name);
    assert.deepEqual(names, ['procurement-analyst', 'inventory-agent', 'vendor-risk-agent']);

    const prompts = new Set(getSpecialists().map((s) => s.systemPrompt));
    assert.equal(prompts.size, 3, 'role prompts must be distinct per agent');

    for (const s of getSpecialists()) {
      assert.ok(s.systemPrompt.length > 50, `${s.name} needs a real role prompt`);
      assert.ok(s.tools.length > 0, `${s.name} needs tools`);
      assert.ok(s.tools.every((t) => ['analytics', 'inventory', 'notification', 'po', 'vendor'].includes(t)));
    }
  });
});
