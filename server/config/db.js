import mongoose from 'mongoose';
import dns from "dns";
import { logger } from '../utils/logger.js';

dns.setServers(["8.8.8.8", "8.8.4.4"]);
let promise = null;

// NEVER log the full connection string — it can embed credentials. Only the
// database name and hostname are surfaced.
function sanitizedSummary(uri) {
  try {
    const u = new URL(uri);
    return { db: u.pathname.replace(/^\//, '') || undefined, host: u.host || undefined };
  } catch {
    return { db: process.env.DB_NAME || undefined };
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (promise) return promise;
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set');
  mongoose.set('strictQuery', true);
  promise = mongoose.connect(uri, {
    dbName: process.env.DB_NAME || 'procurio',
    serverSelectionTimeoutMS: 8000,
  }).then(async (c) => {
    logger.info('db.connected', { db: c.connection.name, host: sanitizedSummary(uri).host });
    return c.connection;
  });
  return promise;
}
