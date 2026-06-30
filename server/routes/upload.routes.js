import { Router } from '../router.js';
import { UploadController } from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadFileSchema } from '../validators/upload.validator.js';

const r = new Router();
r.use(authMiddleware()); // every upload action requires a logged-in user
r.post('/', validate(uploadFileSchema), UploadController.create);
r.delete('/', UploadController.remove);
export default r;