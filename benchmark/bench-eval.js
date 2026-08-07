/**
 * AI grounding / tool-selection evaluation.
 *
 * A fixed, labeled question set across all five domains. For each question we
 * score the planner's tool selection against ground truth:
 *   - recall  : were ALL expected tools selected?
 *   - exact   : was the plan exactly the expected set (no wasted tool calls)?
 *   - waste   : number of unexpected extra tool calls summed across questions
 * We also route through the Supervisor's router (mock provider → deterministic
 * keyword routing) and check the specialist assignment.
 *
 * Usage: node benchmark/bench-eval.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, disconnect } from './lib/setup.js';
import { plan } from '../src/ai/core/planner.js';
import { routeToSpecialist } from '../src/ai/agents/router.js';
import { getSpecialists } from '../src/ai/agents/specialists.js';

// Ground-truth labels: expected tool set (must ALL be selected) and the
// specialist we expect the router to pick. NOTE: routeToSpecialist returns
// `specialistName: null` to mean "no specialist — the Supervisor handles it as
// a generalist" (see router.js), so questions that route to the generalist
// (e.g. notifications, which no specialist owns) expect `null`, not 'generalist'.
const EVAL_SET = [
  { q: 'Which products are low on stock?', tools: ['inventory'], specialist: 'inventory-agent' },
  { q: 'List all out-of-stock items', tools: ['inventory'], specialist: 'inventory-agent' },
  { q: 'How much did we spend last month?', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'Show the monthly spend trend', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'What is the spend by category?', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'Break down spend by department', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'Which vendors are high risk?', tools: ['vendor'], specialist: 'vendor-risk-agent' },
  { q: 'Who are our top vendors by spend?', tools: ['vendor'], specialist: 'vendor-risk-agent' },
  { q: 'Give me a vendor category breakdown', tools: ['vendor'], specialist: 'vendor-risk-agent' },
  { q: 'Show pending purchase orders', tools: ['po'], specialist: 'procurement-analyst' },
  { q: 'Any purchase orders in transit?', tools: ['po'], specialist: 'procurement-analyst' },
  { q: 'What is the average cycle time for purchase requests?', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'How long does approval usually take?', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'Do I have unread notifications?', tools: ['notification'], specialist: null },
  { q: 'Summarize warehouse utilization', tools: ['inventory'], specialist: 'inventory-agent' },
  { q: 'Show recent stock movements', tools: ['inventory'], specialist: 'inventory-agent' },
  { q: 'Which products are about to run out and need reordering?', tools: ['inventory'], specialist: 'inventory-agent' },
  { q: 'Show my recent purchase orders', tools: ['po'], specialist: 'procurement-analyst' },
  { q: 'What approvals are pending?', tools: ['analytics'], specialist: 'procurement-analyst' },
  { q: 'How much inventory value is in the main warehouse?', tools: ['inventory'], specialist: 'inventory-agent' },
];

async function main() {
  await connect();
  const specialists = getSpecialists();
  const rows = [];
  let recallHits = 0;
  let exactHits = 0;
  let specialistHits = 0;
  let waste = 0;

  for (const item of EVAL_SET) {
    const steps = plan(item.q);
    const selected = new Set(steps.map((s) => s.tool));
    const expected = new Set(item.tools);

    const recall = [...expected].every((t) => selected.has(t));
    const exact = selected.size === expected.size && recall;
    const extra = [...selected].filter((t) => !expected.has(t));

    const routed = await routeToSpecialist({ message: item.q, specialists });
    const specialistOk = routed.specialistName === item.specialist;

    if (recall) recallHits++;
    if (exact) exactHits++;
    if (specialistOk) specialistHits++;
    waste += extra.length;

    rows.push({
      q: item.q,
      expected: [...expected].sort(),
      selected: [...selected].sort(),
      extra: extra.sort(),
      recall, exact, specialist: routed.specialistName, specialistExpected: item.specialist, specialistOk,
    });
  }

  const n = EVAL_SET.length;
  const out = {
    ts: new Date().toISOString(),
    n,
    results: rows,
    totals: {
      recall: { hits: recallHits, pct: Math.round((recallHits / n) * 1000) / 10 },
      exact: { hits: exactHits, pct: Math.round((exactHits / n) * 1000) / 10 },
      specialist: { hits: specialistHits, pct: Math.round((specialistHits / n) * 1000) / 10 },
      wasteToolCalls: waste,
    },
  };
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(here, 'results'), { recursive: true });
  const file = path.join(here, 'results', `eval-${process.env.BENCH_PHASE || Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`[eval] wrote ${file}`);
  await disconnect();
}

main().catch((e) => { console.error('EVAL FAILED', e); process.exit(1); });