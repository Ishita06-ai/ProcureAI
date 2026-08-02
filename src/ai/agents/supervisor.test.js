// runSupervisor tests — the full multi-agent handoff
// (supervisor routes → specialist runs → supervisor synthesizes), plus the
// generalist path. The LLM service is stubbed with a dispatcher that answers
// differently per prompt stage, and the data services are stubbed so tools
// return real-shaped data without a database.
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../services/gemini.service.js', {
  namedExports: {
    generateReply: async ({ systemPrompt, messages }) => {
      const userMsg = messages?.[0]?.content || '';
      if (systemPrompt.includes('SPECIALIST FINDINGS')) {
        return { content: 'Synthesized final answer', provider: 'test-mock' };
      }
      if (systemPrompt.includes('Supervisor of a multi-agent procurement AI')) {
        return userMsg.toLowerCase().includes('notification')
          ? { content: '{"specialist":"generalist"}', provider: 'test-mock' }
          : { content: '{"specialist":"inventory-agent"}', provider: 'test-mock' };
      }
      return { content: 'Mock model answer', provider: 'test-mock' };
    },
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

mock.module('../../../server/services/notification.service.js', {
  namedExports: {
    NotificationService: {
      list: async () => [{ _id: 'n1', kind: 'pr', severity: 'info', title: 'PR-001 approved', readAt: null }],
      unreadCount: async () => 1,
    },
  },
});

const { runSupervisor } = await import('./supervisor.js');

describe('runSupervisor — multi-agent handoff (supervisor → worker → supervisor)', () => {
  test('routes to a specialist, runs it, and synthesizes the final answer', async () => {
    const r = await runSupervisor({ message: 'list low stock items', history: [], actor: { id: 'u1' } });

    assert.equal(r.content, 'Synthesized final answer');
    assert.equal(r.provider, 'test-mock');
    assert.equal(r.usedFallback, false);

    // Citations and tool results come from the specialist's grounded work,
    // so the UI popovers keep working through the handoff.
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, 'inventory');
    assert.equal(r.toolResults[0].tool, 'inventory');
  });

  test('runs the generalist path when routing says generalist', async () => {
    const r = await runSupervisor({ message: 'do i have unread notifications?', history: [] });

    assert.equal(r.content, 'Mock model answer');
    assert.equal(r.toolResults[0].tool, 'notification');
    assert.equal(r.citations[0].kind, 'notification');
  });
});
