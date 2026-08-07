// Planner — decides WHICH tools the agent should call for a given message.
//
// This is intentionally a fast, deterministic keyword planner (no LLM
// round-trip) so tool selection is cheap, testable, and never blocked by an
// LLM provider outage. It mirrors the intent-detection that used to live in
// aiContext.service.js, but now maps intents to tool names instead of
// inlining data-fetching logic.
//
// Future scalability: once multiple agents/tools need dynamic, model-driven
// selection, replace the body of plan() with an LLM function-calling call
// (using getAllTools() from toolRegistry.js to build the tool list the model
// can choose from). Executor and the tool contract do not need to change.

function matches(text, ...keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

const INTENTS = [
  { tool: 'inventory', keywords: ['stock', 'inventory', 'warehouse', 'sku', 'product', 'reorder', 'stockout', 'replenish'] },
  { tool: 'vendor', keywords: ['vendor', 'supplier', 'risk', 'preferred'] },
  { tool: 'analytics', keywords: ['spend', 'cost', 'budget', 'savings', 'expense', 'trend', 'forecast', 'approval', 'department', 'category', 'cycle time', 'turnaround'] },
  { tool: 'notification', keywords: ['notification', 'alert', 'attention', 'unread'] },
  { tool: 'po', keywords: ['purchase order', 'delivery', 'shipment', 'transit', 'delivered', 'po number'] },
];

// The vendor tool already answers spend and category questions from its own
// data (top-vendors-by-spend, category breakdown, summary). When a message
// names vendors AND only matches analytics keywords that the vendor tool
// covers, the analytics call would duplicate the vendor call — so we drop it.
// Deeper analytics signals (trend, forecast, approval, department, budget,
// savings) are NOT covered by the vendor tool and keep both calls.
const ANALYTICS_COVERED_BY_VENDOR = ['spend', 'category'];

function matchedIntents(text) {
  const all = INTENTS.filter((intent) => matches(text, ...intent.keywords));
  const analytics = all.find((i) => i.tool === 'analytics');
  if (analytics && all.some((i) => i.tool === 'vendor')) {
    const matchedAnalyticsKeywords = analytics.keywords.filter((k) => matches(text, k));
    if (matchedAnalyticsKeywords.length && matchedAnalyticsKeywords.every((k) => ANALYTICS_COVERED_BY_VENDOR.includes(k))) {
      return all.filter((i) => i.tool !== 'analytics');
    }
  }
  return all;
}

/**
 * @param {string} message
 * @returns {{tool: string, input: object}[]} ordered list of tool calls to execute
 */
export function plan(message = '') {
  const text = message || '';
  const intents = matchedIntents(text);
  let steps = intents.map((intent) => ({ tool: intent.tool, input: { query: text } }));

  // Vague/general questions ("how are we doing?", "give me a snapshot") get
  // the broadest, cheapest signal: analytics KPIs + inventory low-stock.
  if (steps.length === 0) {
    steps = [
      { tool: 'analytics', input: { query: text } },
      { tool: 'inventory', input: { query: text } },
    ];
  }
  return steps;
}

/**
 * Whether a message matched any concrete intent, as opposed to the vague
 * "analytics + inventory" fallback. Used by the Supervisor's router to tell
 * "this topic belongs to a specialist" from "this is a general question".
 * @param {string} message
 * @returns {boolean}
 */
export function hasIntent(message = '') {
  return matchedIntents(message || '').length > 0;
}

export default { plan, hasIntent };