import { Router } from '../router.js';
import { InventoryController } from '../controllers/inventory.controller.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createProductSchema, updateProductSchema, createWarehouseSchema,
  adjustStockSchema, transferStockSchema,
} from '../validators/inventory.validator.js';

const r = new Router();
r.use(authMiddleware({ required: false }));

// Read endpoints
r.get('/dashboard', InventoryController.dashboard);
r.get('/low-stock', InventoryController.lowStock);
r.get('/products', InventoryController.listProducts);
r.get('/products/:id', InventoryController.getProduct);
r.get('/warehouses', InventoryController.listWarehouses);
r.get('/movements', InventoryController.movements);

// Mutations
r.post('/products',     authMiddleware(), requireRole('admin','manager'), validate(createProductSchema), InventoryController.createProduct);
r.patch('/products/:id',authMiddleware(), requireRole('admin','manager'), validate(updateProductSchema), InventoryController.updateProduct);
r.delete('/products/:id', authMiddleware(), requireRole('admin'), InventoryController.deleteProduct);
r.post('/warehouses',   authMiddleware(), requireRole('admin'), validate(createWarehouseSchema), InventoryController.createWarehouse);
r.post('/adjust',       authMiddleware(), requireRole('admin','manager','buyer'), validate(adjustStockSchema), InventoryController.adjust);
r.post('/transfer',     authMiddleware(), requireRole('admin','manager','buyer'), validate(transferStockSchema), InventoryController.transfer);

export default r;
