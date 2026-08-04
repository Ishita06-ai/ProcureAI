// TEMPORARY diagnostic — executes EVERY action of inventory + analytics tools
// against the real DB and prints a compact result envelope. Output to file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
const envPath = path.resolve(process.cwd(), '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB } from './server/config/db.js';
await connectDB();

const { default: inventory } = await import('./src/ai/tools/inventory.tool.js');
const { default: analytics } = await import('./src/ai/tools/analytics.tool.js');
const { default: po } = await import('./src/ai/tools/po.tool.js');
const { default: vendor } = await import('./src/ai/tools/vendor.tool.js');

const Q = 'Give me a procurement health snapshot.';
const cases = [
  ['inventory', 'summary', { query: Q }],
  ['inventory', 'low_stock', { query: 'low stock' }],
  ['inventory', 'out_of_stock', { query: 'out of stock' }],
  ['inventory', 'search_by_name', { name: 'a' }],
  ['inventory', 'search_by_sku', { sku: 'A' }],
  ['inventory', 'product_details', { query: Q }], // will likely fail (no match) — expected to show graceful error
  ['analytics', 'summary', { query: Q }],
  ['analytics', 'spend_trend', { query: 'trend' }],
  ['analytics', 'spend_by_category', { query: 'category' }],
  ['analytics', 'spend_by_department', { query: 'department' }],
  ['analytics', 'approval_funnel', { query: 'approval' }],
  ['analytics', 'top_vendors_by_spend', { query: 'top vendor spend' }],
  ['analytics', 'cycle_times', { query: 'cycle time' }],
  ['po', 'summary', { query: Q }],
  ['vendor', 'summary', { query: Q }],
];

const tools = { inventory, analytics, po, vendor };
const out = [];
for (const [toolName, action, input] of cases) {
  const r = await tools[toolName].execute(input);
  const data = r.data;
  const preview = data === undefined ? '(undefined)' : JSON.stringify(data).slice(0, 220);
  out.push(`[${toolName}.${action}] success=${r.success} error=${r.error ?? '(none)'}\n  keys=${data && typeof data === 'object' ? Object.keys(data).join(',') : typeof data}\n  data=${preview}`);
}
fs.writeFileSync('trace-actions-out.txt', out.join('\n\n'));
console.log('WROTE trace-actions-out.txt');
process.exit(0);
