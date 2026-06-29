import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { ProductService } from '../services/product.service.js';
import { WarehouseService } from '../services/warehouse.service.js';
import { StockService } from '../services/stock.service.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

export const InventoryController = {
  // Products
  listProducts: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, category, status, lowStock, sort } = req.query;
    const { items, total } = await ProductService.list({ q, category, status, lowStock, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  getProduct:    asyncHandler(async (req, res) => res.json(ok(await ProductService.get(req.params.id)))),
  createProduct: asyncHandler(async (req, res) => {
    const p = await ProductService.create(req.body);
    await recordAudit({ req, action: 'product.create', resource: 'product', resourceId: p._id, meta: { sku: p.sku } });
    res.status(201).json(ok(p));
  }),
  updateProduct: asyncHandler(async (req, res) => {
    const p = await ProductService.update(req.params.id, req.body);
    await recordAudit({ req, action: 'product.update', resource: 'product', resourceId: p._id });
    res.json(ok(p));
  }),
  deleteProduct: asyncHandler(async (req, res) => {
    await ProductService.remove(req.params.id);
    await recordAudit({ req, action: 'product.delete', resource: 'product', resourceId: req.params.id });
    res.json(ok({ id: req.params.id }));
  }),

  // Warehouses
  listWarehouses: asyncHandler(async (req, res) => res.json(ok(await WarehouseService.list()))),
  createWarehouse: asyncHandler(async (req, res) => {
    const w = await WarehouseService.create(req.body);
    await recordAudit({ req, action: 'warehouse.create', resource: 'warehouse', resourceId: w._id });
    res.status(201).json(ok(w));
  }),

  // Stock
  adjust: asyncHandler(async (req, res) => {
    const mv = await StockService.adjust(req.body, req.user);
    await recordAudit({ req, action: 'stock.adjust', resource: 'stock', resourceId: mv._id, meta: { qty: mv.qty, product: mv.productSku } });
    res.status(201).json(ok(mv));
  }),
  transfer: asyncHandler(async (req, res) => {
    const mvs = await StockService.transfer(req.body, req.user);
    await recordAudit({ req, action: 'stock.transfer', resource: 'stock', meta: { product: mvs[0].productSku, qty: mvs[0].qty } });
    res.status(201).json(ok(mvs));
  }),
  movements: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, type, productId, warehouseId, refType, sort } = req.query;
    const { items, total } = await StockService.movements({ q, type, productId, warehouseId, refType, page, limit, skip, sort });
    res.json(ok(items, paginationMeta(page, limit, total)));
  }),
  lowStock:  asyncHandler(async (req, res) => res.json(ok(await StockService.lowStockReport()))),
  dashboard: asyncHandler(async (req, res) => res.json(ok(await StockService.dashboard()))),
};
