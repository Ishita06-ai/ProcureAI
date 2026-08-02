// PoTool — read-only data access for the Agent.
//
// Same rules as the other tools:
// - No direct Mongo queries here. Every action delegates to PoService
//   (the one place that owns purchase-order query logic).
// - Never calls Gemini / any LLM — only fetches and shapes data.
// - Every action returns { success, action, data } on success, or
//   { success:false, action, error } on failure. Never throws.
import { PoService } from '../../../server/services/po.service.js';
import { logger } from '../utils/logger.js';

export const ACTIONS = {
  RECENT: 'recent',
  SEARCH: 'search',
  BY_STATUS: 'by_status',
  DETAILS: 'details',
  SUMMARY: 'summary',
};

const STATUSES = ['Draft', 'Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function statusFromText(text) {
  const lower = (text || '').toLowerCase();
  if (matches(lower, 'in transit', 'shipped', 'transit')) return 'In Transit';
  if (matches(lower, 'delivered', 'received')) return 'Delivered';
  if (matches(lower, 'approved')) return 'Approved';
  if (matches(lower, 'pending')) return 'Pending';
  if (matches(lower, 'cancelled', 'canceled')) return 'Cancelled';
  if (matches(lower, 'draft')) return 'Draft';
  return null;
}

function inferAction(input) {
  if (input.action) return input.action;
  if (input.poId) return ACTIONS.DETAILS;
  if (input.number) return ACTIONS.DETAILS;

  const text = input.query || '';
  const status = statusFromText(text);
  if (status) return ACTIONS.BY_STATUS;
  if (matches(text, 'recent', 'latest')) return ACTIONS.RECENT;
  if (matches(text, 'purchase order', 'po number', 'look up', 'find order')) return ACTIONS.SEARCH;
  if (matches(text, 'summary', 'overview', 'how many', 'status')) return ACTIONS.SUMMARY;
  return ACTIONS.RECENT;
}

// Trim each PO down to the fields useful for grounding an LLM answer.
function simplifyPo(p) {
  return {
    id: p._id,
    number: p.number,
    vendor: p.vendorName,
    owner: p.ownerName,
    status: p.status,
    deliveryStatus: p.deliveryStatus,
    amount: p.amount,
    currency: p.currency,
    eta: p.eta,
    expectedDate: p.expectedDate,
    createdAt: p.createdAt,
    lineCount: Array.isArray(p.lines) ? p.lines.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Action handlers — thin adapters over PoService.
// ---------------------------------------------------------------------------

async function handleRecent(input) {
  const limit = input.limit ?? 8;
  const pos = await PoService.recent(limit);
  return pos.map(simplifyPo);
}

async function handleSearch(input) {
  const term = (input.q || input.number || input.query || '').trim();
  if (!term) throw new Error('A search term (order number, vendor, or owner) is required for search');
  const limit = input.limit ?? 10;
  const { items } = await PoService.list({ q: term, page: 1, limit, skip: 0 });
  return items.map(simplifyPo);
}

async function handleByStatus(input) {
  const status = input.status || statusFromText(input.query);
  if (!status || !STATUSES.includes(status)) {
    throw new Error(`A valid status is required for by_status (one of: ${STATUSES.join(', ')})`);
  }
  const limit = input.limit ?? 10;
  const { items } = await PoService.list({ status, page: 1, limit, skip: 0 });
  return items.map(simplifyPo);
}

async function handleDetails(input) {
  let poId = input.poId;
  if (!poId) {
    const term = input.number || input.query || '';
    const { items } = await PoService.list({ q: term, page: 1, limit: 1, skip: 0 });
    if (!items.length) throw new Error(`No purchase order found matching "${term}"`);
    poId = items[0]._id;
  }
  const po = await PoService.get(poId);
  return {
    ...simplifyPo(po),
    lines: (po.lines || []).map((l) => ({
      sku: l.sku, description: l.description, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, lineTotal: l.lineTotal,
    })),
  };
}

async function handleSummary(input) {
  const limit = input.limit ?? 5;
  const [recent, { total }] = await Promise.all([
    PoService.recent(limit),
    PoService.list({ page: 1, limit: 1, skip: 0 }),
  ]);
  return {
    totalCount: total,
    recent: recent.map(simplifyPo),
  };
}

const HANDLERS = {
  [ACTIONS.RECENT]: handleRecent,
  [ACTIONS.SEARCH]: handleSearch,
  [ACTIONS.BY_STATUS]: handleByStatus,
  [ACTIONS.DETAILS]: handleDetails,
  [ACTIONS.SUMMARY]: handleSummary,
};

export default {
  name: 'po',
  description:
    'Purchase orders: most recent POs, PO search by number/vendor/owner, POs filtered by status ' +
    '(Draft/Pending/Approved/In Transit/Delivered/Cancelled), single-PO details with line items, ' +
    'and a PO summary. Read-only — fetches data, never generates text.',

  /**
   * @param {object} input
   * @param {string} [input.action] - one of ACTIONS; inferred from `query` if omitted
   * @param {string} [input.query]  - free-text search term or original user message (for inference)
   * @param {string} [input.q]      - explicit search term (number/vendor/owner)
   * @param {string} [input.status] - PO status filter for by_status
   * @param {string} [input.poId]   - explicit PO id for details
   * @param {string} [input.number] - explicit PO number for details/search
   * @param {number} [input.limit]  - max results for list-style actions
   * @returns {Promise<{success:boolean, action:string, data?:any, error?:string}>}
   */
  async execute(input = {}) {
    const action = inferAction(input);
    const handler = HANDLERS[action];

    if (!handler) {
      logger.warn('po.tool.unknown_action', { action });
      return { success: false, action, error: `Unknown PO action: "${action}"` };
    }

    try {
      const data = await handler(input);
      logger.info('po.tool.executed', {
        action,
        resultCount: Array.isArray(data) ? data.length : undefined,
      });
      return { success: true, action, data };
    } catch (err) {
      logger.error('po.tool.failed', { action, err: err.message });
      return { success: false, action, error: err.message };
    }
  },
};
