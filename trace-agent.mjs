// TEMPORARY diagnostic trace — imports the REAL project modules and runs the
// REAL pipeline for a sample message, printing each stage. No project files are
// modified. Run with: node --experimental-detect-module trace-agent.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

// Load .env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {}

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import { connectDB } from './server/config/db.js';

const MESSAGE = 'Give me a procurement health snapshot.';

console.log('='.repeat(70));
console.log('STAGE 0: connect to DB (real connectDB from server/config/db.js)');
console.log('='.repeat(70));
await connectDB();
console.log('mongoose.readyState =', mongoose.connection.readyState, '(1 = connected)');
console.log('connected to db:', mongoose.connection.name, '\n');

// ---- STAGE 1: Planner -------------------------------------------------------
console.log('='.repeat(70));
console.log('STAGE 1: planner.plan() + planner.hasIntent() + router.routeByKeywords()');
console.log('message:', JSON.stringify(MESSAGE));
console.log('='.repeat(70));
const { plan, hasIntent } = await import('./src/ai/core/planner.js');
const { routeByKeywords } = await import('./src/ai/agents/router.js');
const { getSpecialists } = await import('./src/ai/agents/specialists.js');

const planned = plan(MESSAGE);
console.log('plan() ->', JSON.stringify(planned, null, 2));
console.log('hasIntent() ->', hasIntent(MESSAGE));
console.log('routeByKeywords() ->', routeByKeywords(MESSAGE, getSpecialists()), '(null = no specialist via keywords)');

// ---- STAGE 2: ToolRegistry ---------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('STAGE 2: toolRegistry.getTool() for every planned tool');
console.log('='.repeat(70));
const { getTool, getAllTools } = await import('./src/ai/core/toolRegistry.js');
const allTools = await getAllTools();
console.log('getAllTools() ->', allTools.map(t => t.name), `(${allTools.length} registered)`);
for (const step of planned) {
  const t = await getTool(step.tool);
  console.log(`getTool('${step.tool}') ->`, t ? `FOUND (${t.name})` : 'null (NOT REGISTERED)');
}

// ---- STAGE 3: Executor -------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('STAGE 3: executor.execute() — real tool execution against real DB');
console.log('='.repeat(70));
const { execute } = await import('./src/ai/core/executor.js');
const toolResults = await execute(planned, { userId: 'trace' });
for (const r of toolResults) {
  console.log(`\n--- tool=${r.tool} description=${r.description}`);
  console.log('  error:', r.error || '(none)');
  console.log('  data keys:', r.data ? Object.keys(r.data) : '(null)');
  console.log('  data.success:', r.data?.success);
  console.log('  data.action:', r.data?.action);
  console.log('  data.data:', JSON.stringify(r.data?.data ?? null).slice(0, 600));
}

// ---- STAGE 4: groundedOnly ----------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('STAGE 4: groundedOnly() — what the LLM would actually see');
console.log('='.repeat(70));
const { groundedOnly } = await import('./src/ai/core/toolResult.js');
const grounded = groundedOnly(toolResults);
console.log('groundedOnly(toolResults).length =', grounded.length, `(of ${toolResults.length})`);

// ---- STAGE 5: supervisor prompt (generalist path) ------------------------------
console.log('\n' + '='.repeat(70));
console.log('STAGE 5: buildSupervisorPrompt() — the system prompt the generalist LLM receives');
console.log('='.repeat(70));
const { buildSupervisorPrompt } = await import('./src/ai/prompts/supervisor.prompt.js');
const sysPrompt = buildSupervisorPrompt(toolResults);
console.log(sysPrompt.slice(0, 900));
console.log('...');
console.log('\nTOOL_RESULTS section ends with:', JSON.stringify(sysPrompt.split('TOOL_RESULTS')[1]?.slice(-120)));

// ---- STAGE 6: composeFallback (what the supervisor returns if Gemini 429s) -----
console.log('\n' + '='.repeat(70));
console.log('STAGE 6: composeFallback() — generalist response if Gemini throws (429)');
console.log('='.repeat(70));
const { composeFallback } = await import('./src/ai/core/format.js');
console.log(composeFallback(toolResults));

// ---- STAGE 7: specialist path ------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('STAGE 7: specialist path (runSpecialist) — for the specialist Gemini would route to');
console.log('='.repeat(70));
const { runSpecialist } = await import('./src/ai/agents/specialist.js');
const { specialists, getSpecialist } = await import('./src/ai/agents/specialists.js');
// Show what EACH specialist would compute (plan filtered to its tool subset + grounded count)
for (const s of specialists) {
  const filtered = planned.filter(step => s.tools.includes(step.tool));
  console.log(`\nSpecialist '${s.name}' tools=[${s.tools}]:`);
  console.log('  plan filtered to its tools ->', JSON.stringify(filtered));
  const toolSteps = filtered.length ? filtered : s.tools.map(tool => ({ tool, input: { query: MESSAGE } }));
  console.log('  toolSteps actually executed ->', JSON.stringify(toolSteps.map(s => s.tool)));
  const res = await execute(toolSteps, { userId: 'trace' });
  const g = groundedOnly(res);
  console.log('  execute() grounded results:', g.length, 'of', res.length);
  for (const r of res) {
    console.log('    tool=' + r.tool, '| error:', r.error || 'none', '| success:', r.data?.success, '| data:', JSON.stringify(r.data?.data ?? null).slice(0, 200));
  }
}
console.log('\n(If all tools show "Tool not registered" or success:false here, grounded is empty and the LLM receives: "No tool produced data for this question.")');

await mongoose.disconnect();
process.exit(0);
