import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../../../server/services/po.service.js', {
  namedExports: {
    PoService: {
      recent: async () => [
        { _id: 'p1', number: 'PO-10001', vendorName: 'Acme Co', status: 'Approved', amount: 5000, lines: [{}, {}] },
      ],
      list: async ({ q, status }) => ({
        items: q === 'PO-10001'
          ? [{ _id: 'p1', number: 'PO-10001', vendorName: 'Acme Co', status: 'Approved', amount: 5000 }]
          : status === 'In Transit'
            ? [{ _id: 'p2', number: 'PO-10002', vendorName: 'Shaky Ltd', status: 'In Transit', amount: 2000 }]
            : [],
        total: 1,
      }),
      get: async (id) => (id === 'p1'
        ? { _id: 'p1', number: 'PO-10001', vendorName: 'Acme Co', status: 'Approved', amount: 5000, lines: [{ sku: 'A1', qty: 2, unitPrice: 100 }] }
        : null),
    },
  },
});

const { default: poTool, ACTIONS } = await import('./po.tool.js');

describe('po.tool', () => {
  test('recent returns success envelope', async () => {
    const result = await poTool.execute({ action: ACTIONS.RECENT });
    assert.equal(result.success, true);
    assert.equal(result.data[0].number, 'PO-10001');
  });

  test('search by number returns items', async () => {
    const result = await poTool.execute({ action: ACTIONS.SEARCH, q: 'PO-10001' });
    assert.equal(result.success, true);
    assert.equal(result.data[0].vendor, 'Acme Co');
  });

  test('by_status returns filtered items', async () => {
    const result = await poTool.execute({ action: ACTIONS.BY_STATUS, status: 'In Transit' });
    assert.equal(result.success, true);
    assert.equal(result.data[0].status, 'In Transit');
  });

  test('free-text "in transit" infers by_status', async () => {
    const result = await poTool.execute({ query: 'which orders are in transit?' });
    assert.equal(result.action, ACTIONS.BY_STATUS);
    assert.equal(result.data[0].status, 'In Transit');
  });

  test('free-text "most recent purchase orders" infers recent', async () => {
    const result = await poTool.execute({ query: 'show me our most recent purchase orders' });
    assert.equal(result.action, ACTIONS.RECENT);
  });

  test('free-text "how many orders" defaults to summary', async () => {
    const result = await poTool.execute({ query: 'how many orders do we have?' });
    assert.equal(result.action, ACTIONS.SUMMARY);
    assert.equal(typeof result.data.totalCount, 'number');
  });

  test('details resolves by number when poId absent', async () => {
    const result = await poTool.execute({ action: ACTIONS.DETAILS, number: 'PO-10001' });
    assert.equal(result.success, true);
    assert.equal(result.data.number, 'PO-10001');
    assert.ok(Array.isArray(result.data.lines));
  });

  test('details fails gracefully for unknown PO', async () => {
    const result = await poTool.execute({ action: ACTIONS.DETAILS, number: 'PO-99999' });
    assert.equal(result.success, false);
    assert.match(result.error, /No purchase order found/);
  });

  test('by_status with no valid status produces structured error', async () => {
    const result = await poTool.execute({ action: ACTIONS.BY_STATUS });
    assert.equal(result.success, false);
  });
});
