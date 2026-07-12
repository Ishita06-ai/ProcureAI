import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../../../server/services/vendor.service.js', {
  namedExports: {
    VendorService: {
      topPerformers: async () => [{ _id: 'v1', name: 'Acme Co', category: 'Electronics', score: 92, risk: 'low', spend: 50000 }],
      riskyVendors: async () => [{ _id: 'v2', name: 'Shaky Ltd', category: 'Packaging', score: 30, risk: 'high', spend: 8000 }],
      list: async ({ q }) => ({
        items: q === 'Acme' ? [{ _id: 'v1', name: 'Acme Co', category: 'Electronics', score: 92, risk: 'low', spend: 50000 }] : [],
        total: q === 'Acme' ? 1 : 0,
      }),
      get: async (id) => (id === 'v1' ? { _id: 'v1', name: 'Acme Co', score: 92 } : null),
      categoryDistribution: async () => [{ name: 'Electronics', spend: 50000, count: 3 }],
    },
  },
});

const { default: vendorTool, ACTIONS } = await import('./vendor.tool.js');

describe('vendor.tool', () => {
  test('top_vendors returns success envelope', async () => {
    const result = await vendorTool.execute({ action: ACTIONS.TOP_VENDORS });
    assert.equal(result.success, true);
    assert.equal(result.data[0].name, 'Acme Co');
  });

  test('risky_vendors returns success envelope', async () => {
    const result = await vendorTool.execute({ action: ACTIONS.RISKY_VENDORS });
    assert.equal(result.data[0].risk, 'high');
  });

  test('free-text "risk" query infers risky_vendors', async () => {
    const result = await vendorTool.execute({ query: 'which vendors are at risk?' });
    assert.equal(result.action, ACTIONS.RISKY_VENDORS);
  });

  test('free-text with no keyword defaults to summary', async () => {
    const result = await vendorTool.execute({ query: 'how is the company doing?' });
    assert.equal(result.action, ACTIONS.SUMMARY);
    assert.ok(result.data.topVendors);
    assert.ok(result.data.riskyVendors);
    assert.ok(result.data.byCategory);
  });

  test('vendor_details resolves by name when vendorId absent', async () => {
    const result = await vendorTool.execute({ action: ACTIONS.VENDOR_DETAILS, name: 'Acme' });
    assert.equal(result.success, true);
    assert.equal(result.data.name, 'Acme Co');
  });

  test('vendor_details fails gracefully for unknown vendor', async () => {
    const result = await vendorTool.execute({ action: ACTIONS.VENDOR_DETAILS, name: 'Nobody' });
    assert.equal(result.success, false);
    assert.match(result.error, /No vendor found/);
  });

  test('search_vendor with no term produces structured error', async () => {
    const result = await vendorTool.execute({ action: ACTIONS.SEARCH });
    assert.equal(result.success, false);
  });
});