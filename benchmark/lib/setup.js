/**
 * Benchmark environment bootstrap.
 *
 * Loads the project .env, then OVERRIDES the data provider to a LOCAL,
 * disposable benchmark database so no external/production service is touched:
 *   MONGO_URL = mongodb://127.0.0.1:27017
 *   DB_NAME    = procurio_bench
 *   AI_PROVIDER= mock  (never calls the real Gemini API during benchmarks)
 *   LOG_LEVEL  = warn  (suppress per-request logger noise)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ROOT = path.resolve(root, '.');

// --- 1. Load real .env (names/values) without exposing anything in output ---
function loadDotEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

// --- 2. Apply benchmark overrides (local-only, deterministic) ---
export function applyOverrides() {
  loadDotEnv();
  process.env.MONGO_URL = process.env.BENCH_MONGO_URL || 'mongodb://127.0.0.1:27017';
  process.env.DB_NAME = process.env.BENCH_DB_NAME || 'procurio_bench';
  process.env.AI_PROVIDER = 'mock';
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
}

export { ROOT };

export const BENCH_DB = 'procurio_bench';

export async function connect() {
  applyOverrides();
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(process.env.MONGO_URL, {
    dbName: process.env.DB_NAME,
    serverSelectionTimeoutMS: 8000,
  });
  return mongoose.connection;
}

export async function disconnect() {
  await mongoose.disconnect();
}