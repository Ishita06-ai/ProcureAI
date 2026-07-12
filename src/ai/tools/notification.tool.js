// NotificationTool — read-only data access for the Agent.
//
// Same rules as the other tools: delegates entirely to NotificationService,
// never calls an LLM, and returns { success, action, data } / { success:false,
// action, error }. `userId` normally arrives via the shared context the
// executor merges into every tool's input (see core/executor.js + core/agent.js),
// not from the user's message text.
import { NotificationService } from '../../../server/services/notification.service.js';
import { logger } from '../utils/logger.js';

export const ACTIONS = {
  RECENT: 'recent',
  UNREAD: 'unread',
  UNREAD_COUNT: 'unread_count',
  BY_KIND: 'by_kind',
  SUMMARY: 'summary',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function inferAction(input) {
  if (input.action) return input.action;
  if (input.kind) return ACTIONS.BY_KIND;

  const text = input.query || '';
  if (matches(text, 'how many unread', 'unread count', 'count of')) return ACTIONS.UNREAD_COUNT;
  if (matches(text, 'unread')) return ACTIONS.UNREAD;
  if (matches(text, 'notification', 'alert', 'attention')) return ACTIONS.RECENT;
  return ACTIONS.SUMMARY;
}

function simplifyNotification(n) {
  return {
    id: n._id,
    kind: n.kind,
    severity: n.severity,
    title: n.title,
    body: n.body,
    link: n.link,
    read: !!n.readAt,
    createdAt: n.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Action handlers — thin adapters over NotificationService.
// ---------------------------------------------------------------------------

async function handleRecent(input) {
  const limit = input.limit ?? 10;
  const items = await NotificationService.list({ userId: input.userId ?? null, limit });
  return items.map(simplifyNotification);
}

async function handleUnread(input) {
  const limit = input.limit ?? 10;
  const items = await NotificationService.list({ userId: input.userId ?? null, unreadOnly: true, limit });
  return items.map(simplifyNotification);
}

async function handleUnreadCount(input) {
  const count = await NotificationService.unreadCount(input.userId ?? null);
  return { unreadCount: count };
}

async function handleByKind(input) {
  if (!input.kind) throw new Error('"kind" is required for by_kind (one of: pr, po, grn, stock, ai, system)');
  const limit = input.limit ?? 10;
  const items = await NotificationService.list({ userId: input.userId ?? null, kind: input.kind, limit });
  return items.map(simplifyNotification);
}

async function handleSummary(input) {
  const limit = input.limit ?? 5;
  const [unreadCount, recent] = await Promise.all([
    NotificationService.unreadCount(input.userId ?? null),
    NotificationService.list({ userId: input.userId ?? null, limit }),
  ]);
  // Cheap severity breakdown computed from the already-fetched recent items —
  // no extra DB query, so it's not duplicate database logic, just shaping.
  const bySeverity = recent.reduce((acc, n) => {
    acc[n.severity] = (acc[n.severity] || 0) + 1;
    return acc;
  }, {});
  return { unreadCount, bySeverity, recent: recent.map(simplifyNotification) };
}

const HANDLERS = {
  [ACTIONS.RECENT]: handleRecent,
  [ACTIONS.UNREAD]: handleUnread,
  [ACTIONS.UNREAD_COUNT]: handleUnreadCount,
  [ACTIONS.BY_KIND]: handleByKind,
  [ACTIONS.SUMMARY]: handleSummary,
};

export default {
  name: 'notification',
  description:
    'Recent notifications, unread notifications, unread count, notifications filtered by kind ' +
    '(pr/po/grn/stock/ai/system), and a notification summary for the current user. Read-only.',

  /**
   * @param {object} input
   * @param {string} [input.action] - one of ACTIONS; inferred from `query` if omitted
   * @param {string} [input.query]  - the original user message, used for inference only
   * @param {string} [input.userId] - the requesting user's id (normally injected by the executor)
   * @param {string} [input.kind]   - notification kind filter for by_kind
   * @param {number} [input.limit]  - max results for list-style actions
   * @returns {Promise<{success:boolean, action:string, data?:any, error?:string}>}
   */
  async execute(input = {}) {
    const action = inferAction(input);
    const handler = HANDLERS[action];

    if (!handler) {
      logger.warn('notification.tool.unknown_action', { action });
      return { success: false, action, error: `Unknown notification action: "${action}"` };
    }

    try {
      const data = await handler(input);
      logger.info('notification.tool.executed', { action, userId: input.userId ?? null });
      return { success: true, action, data };
    } catch (err) {
      logger.error('notification.tool.failed', { action, err: err.message });
      return { success: false, action, error: err.message };
    }
  },
};