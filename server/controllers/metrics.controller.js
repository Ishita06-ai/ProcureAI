import mongoose from 'mongoose';
import { cache } from '../utils/cache.js';
import { flags } from '../utils/featureFlags.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const MetricsController = {
  health: asyncHandler(async (req, res) => {
    const dbOk = mongoose.connection.readyState === 1;
    res.json({
      success: true,
      data: {
        status: dbOk ? 'ok' : 'degraded',
        time: new Date().toISOString(),
        uptimeSec: Math.round(process.uptime()),
        db: dbOk ? 'connected' : 'disconnected',
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  }),
  metrics: asyncHandler(async (req, res) => {
    const m = process.memoryUsage();
    res.json({
      success: true,
      data: {
        memoryMB: { rss: Math.round(m.rss / 1048576), heapUsed: Math.round(m.heapUsed / 1048576), heapTotal: Math.round(m.heapTotal / 1048576) },
        uptimeSec: Math.round(process.uptime()),
        cache: { backend: 'memory', size: cache.size },
        mongo: { state: mongoose.connection.readyState, models: Object.keys(mongoose.models).length },
        featureFlags: flags.all(),
        node: process.version,
      },
    });
  }),
};
