import { Router } from '../router.js';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const r = new Router();
r.post('/register', rateLimit({ max: 10, windowMs: 5 * 60_000 }), validate(registerSchema), AuthController.register);
// Login is a brute-force target: scrypt password hashing is intentionally slow
// (~50ms/attempt), so an unthrottled endpoint lets one IP burn CPU and hammer
// the hasher. 10 attempts / 5 min per IP blocks bursts before they reach it.
r.post('/login', rateLimit({ max: 10, windowMs: 5 * 60_000 }), validate(loginSchema), AuthController.login);
r.get('/me', authMiddleware(), AuthController.me);
export default r;
