import { Router } from '../router.js';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const r = new Router();
r.post('/register', validate(registerSchema), AuthController.register);
r.post('/login', validate(loginSchema), AuthController.login);
r.get('/me', authMiddleware(), AuthController.me);
export default r;
