import { Router } from '../router.js';
import { UploadController } from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadSchema } from '../validators/upload.validator.js';

const r = new Router();
r.use(authMiddleware()); // uploads always require an authenticated user

r.post('/', validate(uploadSchema), UploadController.create);
r.get('/', UploadController.list);
r.get('/:key/signed-url', UploadController.signedUrl);
r.delete('/:key', UploadController.remove);

export default r;