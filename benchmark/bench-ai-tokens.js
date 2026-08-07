/**
 * AI context / token benchmark.
 *
 * Measures the size of the LLM context that the agent would send for a set of
 * representative queries, using REAL tool payloads fetched from the benchmark
 * DB. Token estimate uses the same estimator as the project's mock provider
 * (countTokens = ceil(chars / 4)), so the numbers are internally consistent
 * before and after.
 *
 * Two contexts are measured:
 *   - generalist  : the Supervisor's generalist system prompt (buildSupervisorPrompt)
 *   - specialist  : a specialist's grounded context (serialized tool results)
 *
 * Usage: node benchmark/bench-ai-tokens.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, disconnect } from './lib/setup.js';
import { AI_CONTEXT_BUDGET_CHARS } from '../src/ai/core/format.js';
import { buildSupervisorPrompt } from '../src/ai/prompts/supervisor.prompt.js';
import inventoryTool from '../src/ai/tools/inventory.tool.js';
import analyticsTool from '../src/ai/tools/analytics.tool.js';
import vendorTool from '../src/ai/tools/vendor.tool.js';
import poTool from '../src/ai/tools/po.tool.js';
import notificationTool from '../src/ai/tools/notification.tool.js';

// Deterministic token estimator matching the project's mock provider.
const tokens = (chars) => Math.ceil(chars / 4);

// Specialist context serialization. Pre-optimization this replicates the exact
// format in src/ai/agents/specialist.js (serializeGrounded). Post-optimization
// the same format is produced by the shared serializeToolResults helper, so
// this function stays valid for both runs (the format string is unchanged).
let serializeToolResults = null;
try {
  const mod = await import('../src/ai/core/format.js');
  if (typeof mod.serializeToolResults === 'function') serializeToolResults = mod.serializeToolResults;
} catch { /* pre-optimization: helper does not exist yet */ }

function specialistContext(systemPrompt, toolResults, budget) {
  const body = serializeToolResults
    ? serializeToolResults(toolResults, { maxTotalChars: budget })
    : toolResults
        .map((r) => `# ${r.tool} — ${r.data?.action ?? 'result'} (${r.description})\n${JSON.stringify(r.data.data ?? r.data)}`)
        .join('\n\n');
  return `${systemPrompt}\n\nTOOL_RESULTS (authoritative live data — ground your answer in it):\n${body || 'No tool produced data for this question.'}`;
}

const QUERIES = [
  { label: 'inventory/low-stock',  tool: inventoryTool,    query: 'low stock' },
  { label: 'inventory/summary',    tool: inventoryTool,    query: 'inventory summary' },
  { label: 'analytics/summary',    tool: analyticsTool,    query: 'summary' },
  { label: 'analytics/spend-trend',tool: analyticsTool,    query: 'spend trend last 12 months' },
  { label: 'vendor/summary',       tool: vendorTool,       query: 'vendor summary' },
  { label: 'po/recent',            tool: poTool,           query: 'recent purchase orders' },
  { label: 'notification/unread',  tool: notificationTool, query: 'unread notifications' },
];

// The REAL production budget constant — imported from the code so the harness
// always measures what production actually sends.
const REAL_BUDGET = AI_CONTEXT_BUDGET_CHARS;

async function main() {
  await connect();
  const results = [];
  let totalGeneralist = 0;
  let totalSpecialist = 0;

  for (const q of QUERIES) {
    const res = await q.tool.execute({ query: q.query, limit: 20 });
    const wrapped = [{ tool: q.tool.name, description: q.tool.description, data: res }];

    const gBefore = buildSupervisorPrompt(wrapped);
    const sBefore = specialistContext('You are a specialist.', wrapped, Infinity);
    const sAfter = specialistContext('You are a specialist.', wrapped, REAL_BUDGET);

    // Post-optimization buildSupervisorPrompt applies the same budget, so also
    // measure it to capture the generalist improvement.
    const gAfter = buildSupervisorPrompt(wrapped);

    totalGeneralist += tokens(gAfter.length);
    totalSpecialist += tokens(sAfter.length);

    results.push({
      query: q.label,
      generalist: { charsBefore: gBefore.length, charsAfter: gAfter.length, tokensBefore: tokens(gBefore.length), tokensAfter: tokens(gAfter.length) },
      specialist: { charsBefore: sBefore.length, charsAfter: sAfter.length, tokensBefore: tokens(sBefore.length), tokensAfter: tokens(sAfter.length) },
    });
  }

  const sum = (k) => results.reduce((a, r) => a + r[k].tokensBefore, 0);
  const sumAfter = (k) => results.reduce((a, r) => a + r[k].tokensAfter, 0);

  const out = {
    ts: new Date().toISOString(),
    estimator: 'chars/4 (matches project mock provider countTokens)',
    budgetChars: REAL_BUDGET,
    perQuery: results,
    totals: {
      generalistTokensBefore: sum('generalist'),
      generalistTokensAfter: sumAfter('generalist'),
      specialistTokensBefore: sum('specialist'),
      specialistTokensAfter: sumAfter('specialist'),
    },
  };
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(here, 'results'), { recursive: true });
  const file = path.join(here, 'results', `ai-tokens-${process.env.BENCH_PHASE || Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`[ai-tokens] wrote ${file}`);
  await disconnect();
}

main().catch((e) => { console.error('TOKEN BENCH FAILED', e); process.exit(1); });