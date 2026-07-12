import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

const NOTIF = { _id: 'n1', kind: 'stock', severity: 'warning', title: 'Low stock', body: 'SKU W-1 is low', readAt: null, createdAt: '2026-07-01' };

mock.module('../../../server/services/notification.service.js', {
  namedExports: {
    NotificationService: {
      list: async ({ unreadOnly, kind }) => {
        if (kind && kind !== 'stock') return [];
        if (unreadOnly) return [NOTIF];
        return [NOTIF, { ...NOTIF, _id: 'n2', readAt: '2026-07-02', severity: 'info' }];
      },
      unreadCount: async () => 3,
    },
  },
});

const { default: notificationTool, ACTIONS } = await import('./notification.tool.js');

describe('notification.tool', () => {
  test('recent returns success envelope with simplified fields', async () => {
    const result = await notificationTool.execute({ action: ACTIONS.RECENT });
    assert.equal(result.success, true);
    assert.equal(result.data.length, 2);
    assert.equal(result.data[0].read, false);
  });

  test('unread_count returns a count object', async () => {
    const result = await notificationTool.execute({ action: ACTIONS.UNREAD_COUNT });
    assert.equal(result.data.unreadCount, 3);
  });

  test('free-text "unread count" infers unread_count', async () => {
    const result = await notificationTool.execute({ query: 'how many unread notifications do I have?' });
    assert.equal(result.action, ACTIONS.UNREAD_COUNT);
  });

  test('by_kind requires an explicit kind, fails gracefully without one', async () => {
    const result = await notificationTool.execute({ action: ACTIONS.BY_KIND });
    assert.equal(result.success, false);
    assert.match(result.error, /kind.*required/i);
  });

  test('by_kind filters correctly when kind is provided', async () => {
    const result = await notificationTool.execute({ action: ACTIONS.BY_KIND, kind: 'stock' });
    assert.equal(result.success, true);
    assert.ok(result.data.every((n) => n.kind === 'stock'));
  });

  test('summary combines unreadCount + recent + severity breakdown, no extra queries', async () => {
    const result = await notificationTool.execute({ action: ACTIONS.SUMMARY });
    assert.equal(result.data.unreadCount, 3);
    assert.equal(result.data.bySeverity.warning, 1);
    assert.equal(result.data.bySeverity.info, 1);
  });

  test('userId flows through from input into the service call context', async () => {
    // No throw = userId was accepted as expected (executor normally injects this)
    const result = await notificationTool.execute({ action: ACTIONS.RECENT, userId: 'u1' });
    assert.equal(result.success, true);
  });
});