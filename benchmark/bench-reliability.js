/**
 * Reliability / failure-recovery benchmark.
 *
 * Simulates transient failures (the kind that retry-with-backoff exists for:
 * network blips, provider 429s/5xx) with a deterministic PRNG, and measures
 * the success rate of the real retry util with and without retry.
 *
 * Usage: node benchmark/bench-reliability.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { retry } from '../server/utils/retry.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class TransientError extends Error {
  constructor() { super('transient failure'); this.transient = true; this.code = 500; }
}

const TRIALS = 500;
const P_FAIL = 0.4;
const round = (n) => Math.round(n * 100) / 100;

async function run() {
  const out = { ts: new Date().toISOString(), trials: TRIALS, pFail: P_FAIL, results: [] };

  // 1. Baseline: no retry.
  {
    const rnd = mulberry32(20260807);
    let ok = 0;
    for (let i = 0; i < TRIALS; i++) {
      try {
        if (rnd() < P_FAIL) throw new TransientError();
        ok++;
      } catch { /* fail */ }
    }
    out.results.push({ label: 'baseline (no retry)', trials: TRIALS, successes: ok, failureRate: round((1 - ok / TRIALS) * 100) });
  }

  // 2. With retry (attempts=3), retrying only transient errors.
  {
    const rnd = mulberry32(20260807);
    let ok = 0;
    let totalAttempts = 0;
    const isTransient = (e) => !!e.transient;
    for (let i = 0; i < TRIALS; i++) {
      try {
        await retry(
          async () => {
            totalAttempts++;
            if (rnd() < P_FAIL) throw new TransientError();
            return 'ok';
          },
          { attempts: 3, baseMs: 1, factor: 1, jitter: false, shouldRetry: isTransient }
        );
        ok++;
      } catch { /* exhausted */ }
    }
    out.results.push({
      label: 'with retry (attempts=3, backoff, transient-only)',
      trials: TRIALS,
      successes: ok,
      failureRate: round((1 - ok / TRIALS) * 100),
      avgAttemptsPerTrial: round(totalAttempts / TRIALS),
      recoveredTrials: TRIALS - ok,
    });
  }

  // 3. Non-transient errors are NOT retried (shouldRetry guard): every trial
  //    should make exactly 1 attempt.
  {
    const rnd = mulberry32(20260807);
    let attempts = 0;
    for (let i = 0; i < TRIALS; i++) {
      try {
        await retry(
          async () => { attempts++; throw new Error('permanent'); },
          { attempts: 3, baseMs: 1, factor: 1, jitter: false, shouldRetry: (e) => !!e.transient }
        );
      } catch { /* expected */ }
    }
    out.results.push({
      label: 'non-transient errors are not retried',
      trials: TRIALS,
      attemptsMade: attempts,
      attemptsPerTrial: round(attempts / TRIALS),
    });
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(here, 'results'), { recursive: true });
  const file = path.join(here, 'results', `reliability-${process.env.BENCH_PHASE || Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`[reliability] wrote ${file}`);
}

run().catch((e) => { console.error('RELIABILITY BENCH FAILED', e); process.exit(1); });