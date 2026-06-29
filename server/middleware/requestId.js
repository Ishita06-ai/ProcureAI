import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.requestId = id;
  res.set('X-Request-ID', id);
  next();
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  const log = logger.child({ rid: req.requestId, m: req.method, p: req.path });
  res._origJson = res.json;
  const finish = () => {
    const ms = Date.now() - start;
    log.info('req', { ms, status: res.statusCode || 200 });
  };
  // Wrap json to log after response is sent
  const orig = res.json.bind(res);
  res.json = (...args) => { const r = orig(...args); finish(); return r; };
  next();
}
