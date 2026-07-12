// InventoryTool — read-only data access for the Agent.
//
// Rules followed:
// - No direct Mongo queries here. Every action delegates to ProductService
//   or StockService (existing services), so there is exactly one place that
//   owns product/stock query logic.
// - This tool never calls Gemini / any LLM. It only fetches and shapes data;
//   the Agent (core/agent.js) decides how to turn it into a natural-language
//   answer.
// - Every action returns the same envelope: { success, action, data } on
//   success, or { success:false, action, error } on failure. The tool never
//   throws — the executor should never need its try/catch for this tool,
//   but it's still safe if it does.
import { ProductService } from '../../../server/services/product.service.js';
import { StockService } from '../../../server/services/stock.service.js';
import { logger } from '../utils/logger.js';

export const ACTIONS = {
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  SEARCH_BY_NAME: 'search_by_name',
  SEARCH_BY_SKU: 'search_by_sku',
  SUMMARY: 'summary',
  PRODUCT_DETAILS: 'product_details',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// Decide which action to run when the caller didn't pass one explicitly.
// Structured fields (productId/sku/name) are trusted directly. Free-text
// `query` (e.g. the raw user message from the planner) is only mapped to an
// action via clear keyword signals — we deliberately do NOT treat "there is
// some query text" as "the user wants a name search", since that text is
// usually a full sentence, not a search term.
function inferAction(input) {
  if (input.action) return input.action;
  if (input.productId) return ACTIONS.PRODUCT_DETAILS;
  if (input.sku) return ACTIONS.SEARCH_BY_SKU;
  if (input.name) return ACTIONS.SEARCH_BY_NAME;

  const text = input.query || '';
  if (matches(text, 'out of stock', 'stockout', 'depleted', 'zero stock')) return ACTIONS.OUT_OF_STOCK;
  if (matches(text, 'low stock', 'reorder', 'running low', 'replenish')) return ACTIONS.LOW_STOCK;
  return ACTIONS.SUMMARY;
}

// Trim every product down to the fields useful for grounding an LLM answer
// (keeps token usage down vs. returning raw Mongo documents).
function simplifyProduct(p) {
  return {
    id: p._id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    unit: p.unit,
    unitPrice: p.unitPrice,
    onHand: p.onHand,
    available: p.available,
    reorderLevel: p.reorderLevel,
    lowStock: !!p.lowStock,
    outOfStock: !!p.outOfStock,
    defaultVendor: p.defaultVendorName,
  };
}

// ---------------------------------------------------------------------------
// Action handlers — each one is a thin adapter over an existing service call.
// ---------------------------------------------------------------------------

async function handleLowStock(input) {
  const limit = input.limit ?? 20;
  const items = await StockService.lowStockReport();
  return items.slice(0, limit).map((p) => ({
    id: p._id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    available: p.available,
    reorderLevel: p.reorderLevel,
    deficit: p.deficit,
    leadTimeDays: p.leadTimeDays,
    defaultVendor: p.defaultVendorName,
  }));
}

async function handleOutOfStock(input) {
  const limit = input.limit ?? 20;
  const items = await StockService.outOfStockReport();
  return items.slice(0, limit).map((p) => ({
    id: p._id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    onHand: p.onHand,
    available: p.available,
    defaultVendor: p.defaultVendorName,
  }));
}

async function handleSearchByName(input) {
  const term = (input.name || input.query || '').trim();
  if (!term) throw new Error('A "name" or "query" is required for search_by_name');
  const limit = input.limit ?? 10;
  const items = await ProductService.searchByName(term, limit);
  return items.map(simplifyProduct);
}

async function handleSearchBySku(input) {
  const term = (input.sku || input.query || '').trim();
  if (!term) throw new Error('A "sku" or "query" is required for search_by_sku');
  const limit = input.limit ?? 10;
  const items = await ProductService.searchBySku(term, limit);
  return items.map(simplifyProduct);
}

async function handleSummary() {
  const dashboard = await StockService.dashboard();
  return {
    kpis: dashboard.kpis,
    byCategory: dashboard.byCategory,
    byWarehouse: dashboard.byWarehouse,
    lowStockTopN: dashboard.lowStock,
  };
}

async function handleProductDetails(input) {
  let productId = input.productId;

  if (!productId && input.sku) {
    const matches = await ProductService.searchBySku(input.sku, 1);
    if (!matches.length) throw new Error(`No product found for SKU "${input.sku}"`);
    productId = matches[0]._id;
  }
  if (!productId && (input.name || input.query)) {
    const term = input.name || input.query;
    const matches = await ProductService.searchByName(term, 1);
    if (!matches.length) throw new Error(`No product found matching "${term}"`);
    productId = matches[0]._id;
  }
  if (!productId) throw new Error('productId, sku, or name is required for product_details');

  return ProductService.get(productId);
}

const HANDLERS = {
  [ACTIONS.LOW_STOCK]: handleLowStock,
  [ACTIONS.OUT_OF_STOCK]: handleOutOfStock,
  [ACTIONS.SEARCH_BY_NAME]: handleSearchByName,
  [ACTIONS.SEARCH_BY_SKU]: handleSearchBySku,
  [ACTIONS.SUMMARY]: handleSummary,
  [ACTIONS.PRODUCT_DETAILS]: handleProductDetails,
};

export default {
  name: 'inventory',
  description:
    'Inventory data: low-stock products, out-of-stock products, product search by name or SKU, ' +
    'inventory summary, and single-product details. Read-only — fetches data, never generates text.',

  /**
   * @param {object} input
   * @param {string} [input.action] - one of ACTIONS; inferred if omitted
   * @param {string} [input.query]  - free-text search term (name or sku)
   * @param {string} [input.name]   - explicit name search term
   * @param {string} [input.sku]    - explicit sku search term
   * @param {string} [input.productId] - explicit product id for product_details
   * @param {number} [input.limit]  - max results for list-style actions
   * @returns {Promise<{success:boolean, action:string, data?:any, error?:string}>}
   */
  async execute(input = {}) {
    const action = inferAction(input);
    const handler = HANDLERS[action];

    if (!handler) {
      logger.warn('inventory.tool.unknown_action', { action });
      return { success: false, action, error: `Unknown inventory action: "${action}"` };
    }

    try {
      const data = await handler(input);
      logger.info('inventory.tool.executed', {
        action,
        resultCount: Array.isArray(data) ? data.length : undefined,
      });
      return { success: true, action, data };
    } catch (err) {
      logger.error('inventory.tool.failed', { action, err: err.message });
      return { success: false, action, error: err.message };
    }
  },
};