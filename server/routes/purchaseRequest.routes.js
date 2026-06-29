import { Router } from '../router.js';
import { PrController } from '../controllers/purchaseRequest.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createPrSchema, updatePrSchema, approvalSchema, quoteSchema,
  selectVendorSchema, commentSchema, convertToPoSchema,
} from '../validators/purchaseRequest.validator.js';

const r = new Router();
r.use(authMiddleware({ required: false }));

r.get('/', PrController.list);
r.get('/board', PrController.board);
r.get('/:id', PrController.get);

r.post('/',                  authMiddleware(), requireRole('admin','manager','buyer'), validate(createPrSchema), PrController.create);
r.patch('/:id',              authMiddleware(), requireRole('admin','manager','buyer'), validate(updatePrSchema), PrController.update);
r.post('/:id/submit',        authMiddleware(), requireRole('admin','manager','buyer'), PrController.submit);
r.post('/:id/review',        authMiddleware(), requireRole('admin','manager'), PrController.startReview);
r.post('/:id/approve',       authMiddleware(), requireRole('admin','manager'), validate(approvalSchema), PrController.approve);
r.post('/:id/reject',        authMiddleware(), requireRole('admin','manager'), validate(approvalSchema), PrController.reject);
r.post('/:id/quotes',        authMiddleware(), requireRole('admin','manager','buyer'), validate(quoteSchema), PrController.addQuote);
r.post('/:id/select-vendor', authMiddleware(), requireRole('admin','manager','buyer'), validate(selectVendorSchema), PrController.selectVendor);
r.post('/:id/comments',      authMiddleware(), validate(commentSchema), PrController.addComment);
r.post('/:id/convert-to-po', authMiddleware(), requireRole('admin','manager'), validate(convertToPoSchema), PrController.convertToPo);

export default r;
