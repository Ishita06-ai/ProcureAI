/**
 * API request-handling benchmark.
 *
 * Measures, for a fixed set of read endpoints:
 *   - COLD latency + DB queries: cache cleared before each request
 *     (represents the DB+compute cost of a first request)
 *   - WARM latency + DB queries: 5 back-to-back requests after warm-up
 *     (represents the steady-state cache-hit path)
 *
 * Usage: node benchmark/bench-api.js [iterations]
 * Output is JSON to stdout and also appended to benchmark/results/api-bench-<ts>.json
 */
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, disconnect } from './lib/setup.js';
import { install as installQueryCounter, queryCounter } from './lib/queryCounter.js';
import { drive } from './lib/requestDriver.js';
import { cache } from '../server/utils/cache.js';
import app from '../server/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// NOTE: the Next.js adapter strips the /api prefix (app/api/[[...path]]/route.js),
// so routes are mounted at their bare path — these paths mirror what the real
// adapter hands to app.handle.
const ENDPOINTS = [
  { name: 'dashboard/overview',        path: '/dashboard/overview' },
  { name: 'analytics/overview',        path: '/analytics/overview' },
  { name: 'inventory/dashboard',       path: '/inventory/dashboard' },
  { name: 'inventory/low-stock',       path: '/inventory/low-stock' },
  { name: 'inventory/products',        path: '/inventory/products', query: { limit: '20' } },
  { name: 'inventory/movements',       path: '/inventory/movements', query: { limit: '20' } },
  { name: 'purchase-orders',           path: '/purchase-orders', query: { limit: '20' } },
  { name: 'purchase-requests',         path: '/purchase-requests', query: { limit: '20' } },
  { name: 'vendors',                   path: '/vendors', query: { limit: '20' } },
  { name: 'reports/products',          path: '/reports/products' },
  { name: 'reports/vendors',           path: '/reports/vendors' },
  { name: 'reports/purchase-orders',   path: '/reports/purchase-orders' },
  { name: 'reports/purchase-requests', path: '/reports/purchase-requests' },
];

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const round = (n) => Math.round(n * 100) / 100;

function stats(msArr) {
  const sorted = [...msArr].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return { n: msArr.length, mean: round(msArr.reduce((a, b) => a + b, 0) / msArr.length), p50: round(median(msArr)), p95: round(pct(95)), min: round(Math.min(...msArr)), max: round(Math.max(...msArr)) };
}

const ITERS = Number(process.argv[2] || 8);

async function main() {
  await connect();
  installQueryCounter();

  const user = { id: 'bench-user', role: 'admin', name: 'Bench Admin', email: 'bench@example.com' };
  const perEndpoint = {};

  for (const ep of ENDPOINTS) {
    // Warm-up (connection pool + JIT)
    await drive(app, { method: 'GET', path: ep.path, query: ep.query, user, headers: { 'x-bench-id': 'warmup' } });

    // COLD: clear cache before every request
    const coldMs = [];
    const coldQueries = [];
    for (let i = 0; i < ITERS; i++) {
      await cache.clear();
      queryCounter.start();
      const r = await drive(app, { method: 'GET', path: ep.path, query: ep.query, user, headers: { 'x-bench-id': `cold-${i}` } });
      coldMs.push(r.ms);
      coldQueries.push(queryCounter.stop().queries);
    }

    // WARM: 5 back-to-back (steady-state)
    const warmMs = [];
    const warmQueries = [];
    for (let i = 0; i < 5; i++) {
      queryCounter.start();
      const r = await drive(app, { method: 'GET', path: ep.path, query: ep.query, user, headers: { 'x-bench-id': `warm-${i}` } });
      warmMs.push(r.ms);
      warmQueries.push(queryCounter.stop().queries);
    }

    perEndpoint[ep.name] = {
      cold: { ms: stats(coldMs), queriesPerRequest: { mean: round(coldQueries.reduce((a, b) => a + b, 0) / coldQueries.length), values: coldQueries } },
      warm: { ms: stats(warmMs), queriesPerRequest: { mean: round(warmQueries.reduce((a, b) => a + b, 0) / warmQueries.length), values: warmQueries } },
    };
  }

  const aggregate = (mode) => {
    const all = Object.values(perEndpoint).map((e) => e[mode].ms.p50);
    return stats(all);
  };

  const result = {
    ts: new Date().toISOString(),
    iters: ITERS,
    endpoints: perEndpoint,
    aggregate: { cold: aggregate('cold'), warm: aggregate('warm') },
  };

  const out = JSON.stringify(result, null, 2);
  console.log(out);

  fs.mkdirSync(path.join(here, 'results'), { recursive: true });
  const file = path.join(here, 'results', `api-bench-${process.env.BENCH_PHASE || Date.now()}.json`);
  fs.writeFileSync(file, out);
  console.log(`\n[bench] wrote ${file}`);

  await disconnect();
}

main().catch((e) => { console.error('BENCH FAILED', e); process.exit(1); });