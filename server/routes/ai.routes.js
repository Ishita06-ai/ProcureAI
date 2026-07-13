import { Router } from '../router.js';
import { AiController } from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { chatSchema } from '../validators/ai.validator.js';

const r = new Router();
r.use(authMiddleware());
r.get('/conversations', AiController.list);
r.get('/conversations/:id', AiController.get);
r.delete('/conversations/:id', AiController.remove);
// Chat is the one route that can call an external LLM API and touches
// several DB reads (via the agent's tools) per request — rate-limit it
// per-user so one person can't accidentally (or deliberately) rack up
// Gemini spend or hammer the DB. 20 messages / 5 min is generous for a
// real chat session but stops runaway loops/scripts.
r.post('/chat', rateLimit({ max: 20, windowMs: 5 * 60_000 }), validate(chatSchema), AiController.chat);
export default r;