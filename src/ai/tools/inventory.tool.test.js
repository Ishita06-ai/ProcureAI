// Tool-level tests stub the service layer with node:test's built-in ESM
// mocking (mock.module), so these run with no live MongoDB connection.
//
// Requires Node >= 22.3 and the --experimental-test-module-mocks flag
// (see package.json's "test:tools" script). If your Node/CI doesn't support
// it yet, the planner/executor/toolRegistry tests above still give solid
// coverage without any flag.
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../../../server/services/product.service.js', {
  namedExports: {
    ProductService: {
      searchByName: async (term) => (term === 'Widget' ? [{ _id: 'p1', name: 'Widget', sku: 'W-1', available: 5 }] : []),
      searchBySku: async (sku) => (sku === 'W-1' ? [{ _id: 'p1', name: 'Widget', sku: 'W-1', available: 5 }] : []),
      get: async (id) => (id === 'p1' ? { _id: 'p1', name: 'Widget', sku: 'W-1', available: 5 } : null),
    },
  },
});
mock.module('../../../server/services/stock.service.js', {
  namedExports: {
    StockService: {
      lowStockReport: async () => [{ _id: 'p2', sku: 'LOW-1', name: 'Low Item', available: 1, reorderLevel: 10, deficit: 9 }],
      outOfStockReport: async () => [{ _id: 'p3', sku: 'OUT-1', name: 'Out Item', onHand: 0, available: 0 }],
      dashboard: async () => ({ kpis: { totalSkus: 42 }, byCategory: [], byWarehouse: [], lowStock: [] }),
    },
  },
});

const { default: inventoryTool, ACTIONS } = await import('./inventory.tool.js');

describe('inventory.tool', () => {
  test('low_stock returns success envelope with mapped fields', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.LOW_STOCK });
    assert.equal(result.success, true);
    assert.equal(result.action, 'low_stock');
    assert.equal(result.data[0].sku, 'LOW-1');
    assert.equal(result.data[0].deficit, 9);
  });

  test('out_of_stock returns success envelope', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.OUT_OF_STOCK });
    assert.equal(result.success, true);
    assert.equal(result.data[0].sku, 'OUT-1');
  });

  test('search_by_name via explicit action', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.SEARCH_BY_NAME, name: 'Widget' });
    assert.equal(result.success, true);
    assert.equal(result.data[0].sku, 'W-1');
  });

  test('free-text query without a "low stock"/"out of stock" keyword defaults to summary', async () => {
    const result = await inventoryTool.execute({ query: 'tell me about our procurement process' });
    assert.equal(result.action, ACTIONS.SUMMARY);
    assert.equal(result.data.kpis.totalSkus, 42);
  });

  test('free-text query containing "low stock" infers the low_stock action', async () => {
    const result = await inventoryTool.execute({ query: 'what is running low on stock right now?' });
    assert.equal(result.action, ACTIONS.LOW_STOCK);
  });

  test('product_details resolves by sku when productId is absent', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.PRODUCT_DETAILS, sku: 'W-1' });
    assert.equal(result.success, true);
    assert.equal(result.data.name, 'Widget');
  });

  test('unknown product_details lookup fails gracefully, never throws', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.PRODUCT_DETAILS, sku: 'NOPE' });
    assert.equal(result.success, false);
    assert.match(result.error, /No product found/);
  });

  test('search_by_name with no term produces a structured error, not a throw', async () => {
    const result = await inventoryTool.execute({ action: ACTIONS.SEARCH_BY_NAME });
    assert.equal(result.success, false);
    assert.match(result.error, /name.*query.*required/i);
  });
});