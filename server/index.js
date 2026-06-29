// The Express-shaped "app". Composes middleware + router and exposes a single
// `handle(req, res)` entrypoint. In standalone Express, replace this file with:
//   const app = express(); app.use(helmet()); app.use(...); app.use('/api', apiRouter); app.listen(PORT);
import { Router } from './router.js';
import apiRouter from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { connectDB } from './config/db.js';
import { securityHeaders, sanitizeInput } from './middleware/security.js';
import { requestId, requestLogger } from './middleware/requestId.js';
import { rateLimit } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';

const app = new Router();

// Pre-route middleware chain (order matters)
app.use(requestId);
app.use(requestLogger);
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(rateLimit({ max: 200, windowMs: 60_000 }));
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { logger.error('db.connect failed', { err: e.message }); next(e); }
});

// Mount /api/* routes
for (const layer of apiRouter.stack) {
  app.stack.push({ ...layer, path: layer.path === '*' ? '*' : layer.path });
}
for (const e of apiRouter.errorStack) app.errorStack.push(e);

app.use(errorMiddleware);

export default app;
