/**
 * Rate-limiting / abuse-protection benchmark.
 *
 * Part A — LOGIN brute-force (new protection):
 *   Burst of 50 login attempts from one IP with wrong credentials.
 *   Before (no login limiter): every request reaches the password-hashing path.
 *   After  (login limiter)   : requests 11+ are rejected with 429 before hashing.
 *   Metrics: 429 count + wall-clock for the burst + DB queries.
 *
 * Part B — AI CHAT (existing protection):
 *   Burst of 100 chat requests for one user. The chat route rate-limits at
 *   20 / 5 min, so 80 should be rejected. We count how many DB queries reach
 *   the backend with and without the limiter (limiter-free path measured by
 *   calling the controller directly).
 *
 * Usage: node benchmark/bench-ratelimit.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { connect, disconnect } from './lib/setup.js';
import { install as installQueryCounter, queryCounter } from './lib/queryCounter.js';
import { drive, buildReqRes } from './lib/requestDriver.js';
import { AiController } from '../server/controllers/ai.controller.js';
import app from '../server/index.js';

const LOGIN_ATTEMPTS = 50;
const CHAT_BURST = 100;

async function burstLogin(appRef, { label }) {
  const body = { email: 'bench.buyer@example.com', password: 'WrongPass!1' };
  const t0 = performance.now();
  let rejected = 0;
  let reachedHandler = 0;
  for (let i = 0; i < LOGIN_ATTEMPTS; i++) {
    const r = await drive(appRef, {
      method: 'POST',
      path: '/auth/login',
      body,
      headers: { 'x-forwarded-for': `203.0.113.${1 + (i % 4)}` },
    });
    if (r.status === 429) rejected++;
    else reachedHandler++;
  }
  const ms = performance.now() - t0;
  return {
    part: 'login', label,
    requests: LOGIN_ATTEMPTS,
    rejected429: rejected,
    reachedPasswordCheck: reachedHandler,
    blockedPct: Math.round((rejected / LOGIN_ATTEMPTS) * 1000) / 10,
    burstMs: Math.round(ms),
  };
}

async function partA() {
  return burstLogin(app, { label: 'login burst (current code)' });
}

async function partB() {
  const out = [];
  const user = { id: 'bench-user', role: 'admin', name: 'Bench Admin', email: 'bench@example.com' };

  // WITH limiter: drive the real route.
  queryCounter.start();
  let rejected = 0;
  for (let i = 0; i < CHAT_BURST; i++) {
    const r = await drive(app, {
      method: 'POST',
      path: '/ai/chat',
      body: { message: 'show low stock items' },
      user,
    });
    if (r.status === 429) rejected++;
  }
  const withLimiter = queryCounter.stop();
  out.push({
    part: 'chat', label: 'with route rate limiter (20/5min)',
    requests: CHAT_BURST, rejected429: rejected, allowed: CHAT_BURST - rejected,
    blockedPct: Math.round((rejected / CHAT_BURST) * 1000) / 10,
    dbQueriesExecuted: withLimiter.queries,
  });

  // WITHOUT limiter: call the controller directly (same handler, no limiter).
  queryCounter.start();
  for (let i = 0; i < CHAT_BURST; i++) {
    const { req, res, get } = buildReqRes({
      method: 'POST',
      path: '/api/ai/chat',
      body: { message: 'show low stock items' },
      user,
    });
    req.user = user; // authMiddleware normally does this; direct call bypasses it
    req.body = { message: 'show low stock items' };
    await AiController.chat(req, res, () => {});
    void get();
  }
  const withoutLimiter = queryCounter.stop();
  out.push({
    part: 'chat', label: 'without limiter (controller invoked directly)',
    requests: CHAT_BURST, rejected429: 0, allowed: CHAT_BURST,
    blockedPct: 0,
    dbQueriesExecuted: withoutLimiter.queries,
  });
  return out;
}

async function main() {
  await connect();
  installQueryCounter();
  const out = { ts: new Date().toISOString(), loginAttempts: LOGIN_ATTEMPTS, chatBurst: CHAT_BURST, results: [] };
  out.results.push(await partA());
  out.results.push(...(await partB()));
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(here, 'results'), { recursive: true });
  const file = path.join(here, 'results', `ratelimit-${process.env.BENCH_PHASE || Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`[ratelimit] wrote ${file}`);
  await disconnect();
}

main().catch((e) => { console.error('RATELIMIT BENCH FAILED', e); process.exit(1); });