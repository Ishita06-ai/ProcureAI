import { Router } from '../router.js';
import { AiController } from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { chatSchema } from '../validators/ai.validator.js';

const r = new Router();
r.use(authMiddleware());
r.get('/conversations', AiController.list);
r.get('/conversations/:id', AiController.get);
r.delete('/conversations/:id', AiController.remove);
r.post('/chat', validate(chatSchema), AiController.chat);
export default r;
