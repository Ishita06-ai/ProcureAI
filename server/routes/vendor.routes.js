import { Router } from '../router.js';
import { VendorController } from '../controllers/vendor.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createVendorSchema, updateVendorSchema } from '../validators/vendor.validator.js';

const r = new Router();
r.use(authMiddleware({ required: false })); // public read, gated write
r.get('/', VendorController.list);
r.get('/top', VendorController.top);
r.get('/:id', VendorController.get);
r.post('/', authMiddleware(), requireRole('admin', 'manager', 'buyer'), validate(createVendorSchema), VendorController.create);
r.patch('/:id', authMiddleware(), requireRole('admin', 'manager'), validate(updateVendorSchema), VendorController.update);
r.delete('/:id', authMiddleware(), requireRole('admin'), VendorController.remove);
export default r;
