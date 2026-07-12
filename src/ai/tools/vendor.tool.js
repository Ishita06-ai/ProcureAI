// VendorTool — read-only data access for the Agent.
//
// Same rules as inventory.tool.js:
// - No direct Mongo queries here. Every action delegates to VendorService
//   (the one place that owns vendor query logic).
// - Never calls Gemini / any LLM — only fetches and shapes data.
// - Every action returns { success, action, data } on success, or
//   { success:false, action, error } on failure. Never throws.
import { VendorService } from '../../../server/services/vendor.service.js';
import { logger } from '../utils/logger.js';

export const ACTIONS = {
  TOP_VENDORS: 'top_vendors',
  RISKY_VENDORS: 'risky_vendors',
  SEARCH: 'search_vendor',
  VENDOR_DETAILS: 'vendor_details',
  CATEGORY_BREAKDOWN: 'category_breakdown',
  SUMMARY: 'summary',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// See inventory.tool.js for the rationale: structured fields are trusted
// directly, free-text `query` only maps to an action via clear keywords.
function inferAction(input) {
  if (input.action) return input.action;
  if (input.vendorId) return ACTIONS.VENDOR_DETAILS;
  if (input.name) return ACTIONS.SEARCH;

  const text = input.query || '';
  if (matches(text, 'risk', 'at risk', 'watchlist')) return ACTIONS.RISKY_VENDORS;
  if (matches(text, 'top vendor', 'best vendor', 'preferred')) return ACTIONS.TOP_VENDORS;
  if (matches(text, 'category', 'spend by')) return ACTIONS.CATEGORY_BREAKDOWN;
  return ACTIONS.SUMMARY;
}

function simplifyVendor(v) {
  return {
    id: v._id,
    name: v.name,
    category: v.category,
    country: v.country,
    status: v.status,
    risk: v.risk,
    score: v.score,
    spend: v.spend,
  };
}

// ---------------------------------------------------------------------------
// Action handlers — thin adapters over VendorService.
// ---------------------------------------------------------------------------

async function handleTopVendors(input) {
  const limit = input.limit ?? 10;
  const vendors = await VendorService.topPerformers(limit);
  return vendors.map(simplifyVendor);
}

async function handleRiskyVendors(input) {
  const limit = input.limit ?? 10;
  const vendors = await VendorService.riskyVendors(limit);
  return vendors.map(simplifyVendor);
}

async function handleSearch(input) {
  const term = (input.name || input.query || '').trim();
  if (!term) throw new Error('A "name" or "query" is required for search_vendor');
  const limit = input.limit ?? 10;
  const { items } = await VendorService.list({ q: term, page: 1, limit, skip: 0 });
  return items.map(simplifyVendor);
}

async function handleVendorDetails(input) {
  let vendorId = input.vendorId;
  if (!vendorId && (input.name || input.query)) {
    const term = input.name || input.query;
    const { items } = await VendorService.list({ q: term, page: 1, limit: 1, skip: 0 });
    if (!items.length) throw new Error(`No vendor found matching "${term}"`);
    vendorId = items[0]._id;
  }
  if (!vendorId) throw new Error('vendorId or name is required for vendor_details');
  return VendorService.get(vendorId);
}

async function handleCategoryBreakdown() {
  return VendorService.categoryDistribution();
}

async function handleSummary(input) {
  const limit = input.limit ?? 5;
  const [topVendors, riskyVendors, byCategory] = await Promise.all([
    VendorService.topPerformers(limit),
    VendorService.riskyVendors(limit),
    VendorService.categoryDistribution(),
  ]);
  return {
    topVendors: topVendors.map(simplifyVendor),
    riskyVendors: riskyVendors.map(simplifyVendor),
    byCategory,
  };
}

const HANDLERS = {
  [ACTIONS.TOP_VENDORS]: handleTopVendors,
  [ACTIONS.RISKY_VENDORS]: handleRiskyVendors,
  [ACTIONS.SEARCH]: handleSearch,
  [ACTIONS.VENDOR_DETAILS]: handleVendorDetails,
  [ACTIONS.CATEGORY_BREAKDOWN]: handleCategoryBreakdown,
  [ACTIONS.SUMMARY]: handleSummary,
};

export default {
  name: 'vendor',
  description:
    'Vendor data: top-performing vendors by score, vendors flagged as risky, vendor search by name, ' +
    'single-vendor details, spend-by-category breakdown, and an overall vendor summary. Read-only.',

  /**
   * @param {object} input
   * @param {string} [input.action] - one of ACTIONS; inferred if omitted
   * @param {string} [input.query]  - free-text search term (vendor name)
   * @param {string} [input.name]   - explicit name search term
   * @param {string} [input.vendorId] - explicit vendor id for vendor_details
   * @param {number} [input.limit]  - max results for list-style actions
   * @returns {Promise<{success:boolean, action:string, data?:any, error?:string}>}
   */
  async execute(input = {}) {
    const action = inferAction(input);
    const handler = HANDLERS[action];

    if (!handler) {
      logger.warn('vendor.tool.unknown_action', { action });
      return { success: false, action, error: `Unknown vendor action: "${action}"` };
    }

    try {
      const data = await handler(input);
      logger.info('vendor.tool.executed', {
        action,
        resultCount: Array.isArray(data) ? data.length : undefined,
      });
      return { success: true, action, data };
    } catch (err) {
      logger.error('vendor.tool.failed', { action, err: err.message });
      return { success: false, action, error: err.message };
    }
  },
};