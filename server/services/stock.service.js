import { Product } from '../models/product.model.js';
import { StockLevel } from '../models/stockLevel.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { Warehouse } from '../models/warehouse.model.js';
import { notFound, badRequest } from '../utils/apiError.js';

async function ensureLevel(productId, warehouseId) {
  let lvl = await StockLevel.findOne({ productId, warehouseId });
  if (!lvl) lvl = await StockLevel.create({ productId, warehouseId, onHand: 0 });
  return lvl;
}

function asMovement({ product, warehouse, type, qty, unitCost, refType = 'Manual', refId, refNumber, reason, lotNumber, expiryDate, counterWarehouse, actor }) {
  return {
    productId: product._id, productSku: product.sku, productName: product.name,
    warehouseId: warehouse._id, warehouseCode: warehouse.code,
    type, qty, unitCost: unitCost ?? product.unitCost ?? 0,
    refType, refId, refNumber, reason,
    lotNumber, expiryDate,
    counterWarehouseId: counterWarehouse?._id, counterWarehouseCode: counterWarehouse?.code,
    actorId: actor?.id, actorName: actor?.name || 'system',
    at: new Date(),
  };
}

export const StockService = {
  // Generic stock-in (returns movement)
  async stockIn({ productId, warehouseId, qty, unitCost, refType, refId, refNumber, reason, lotNumber, expiryDate }, actor) {
    if (qty <= 0) throw badRequest('qty must be positive');
    const [product, warehouse] = await Promise.all([Product.findById(productId).lean(), Warehouse.findById(warehouseId).lean()]);
    if (!product) throw notFound('Product not found');
    if (!warehouse) throw notFound('Warehouse not found');
    const lvl = await ensureLevel(productId, warehouseId);
    lvl.onHand += qty;
    lvl.lastMovementAt = new Date();
    await lvl.save();
    const mv = await StockMovement.create(asMovement({ product, warehouse, type: 'IN', qty, unitCost, refType, refId, refNumber, reason, lotNumber, expiryDate, actor }));
    return mv.toObject();
  },

  async stockOut({ productId, warehouseId, qty, refType = 'Sale', refId, refNumber, reason }, actor) {
    if (qty <= 0) throw badRequest('qty must be positive');
    const [product, warehouse] = await Promise.all([Product.findById(productId).lean(), Warehouse.findById(warehouseId).lean()]);
    if (!product) throw notFound('Product not found');
    if (!warehouse) throw notFound('Warehouse not found');
    const lvl = await ensureLevel(productId, warehouseId);
    if (lvl.onHand < qty) throw badRequest(`Insufficient stock (on hand: ${lvl.onHand})`);
    lvl.onHand -= qty;
    lvl.lastMovementAt = new Date();
    await lvl.save();
    const mv = await StockMovement.create(asMovement({ product, warehouse, type: 'OUT', qty, refType, refId, refNumber, reason, actor }));
    return mv.toObject();
  },

  // Adjustment can be positive or negative
  async adjust({ productId, warehouseId, qty, reason, lotNumber, expiryDate }, actor) {
    const [product, warehouse] = await Promise.all([Product.findById(productId).lean(), Warehouse.findById(warehouseId).lean()]);
    if (!product) throw notFound('Product not found');
    if (!warehouse) throw notFound('Warehouse not found');
    const lvl = await ensureLevel(productId, warehouseId);
    const newQty = lvl.onHand + qty;
    if (newQty < 0) throw badRequest('Resulting stock cannot be negative');
    lvl.onHand = newQty;
    lvl.lastMovementAt = new Date();
    await lvl.save();
    const mv = await StockMovement.create(asMovement({ product, warehouse, type: 'ADJUSTMENT', qty, reason: reason || 'Manual adjustment', lotNumber, expiryDate, refType: 'Adjustment', actor }));
    return mv.toObject();
  },

  async transfer({ productId, fromWarehouseId, toWarehouseId, qty, reason }, actor) {
    if (qty <= 0) throw badRequest('qty must be positive');
    if (fromWarehouseId === toWarehouseId) throw badRequest('Source and destination must differ');
    const [product, fromWh, toWh] = await Promise.all([
      Product.findById(productId).lean(),
      Warehouse.findById(fromWarehouseId).lean(),
      Warehouse.findById(toWarehouseId).lean(),
    ]);
    if (!product) throw notFound('Product not found');
    if (!fromWh || !toWh) throw notFound('Warehouse not found');
    const src = await ensureLevel(productId, fromWarehouseId);
    if (src.onHand < qty) throw badRequest(`Insufficient stock (on hand: ${src.onHand})`);
    const dst = await ensureLevel(productId, toWarehouseId);
    src.onHand -= qty; src.lastMovementAt = new Date();
    dst.onHand += qty; dst.lastMovementAt = new Date();
    await Promise.all([src.save(), dst.save()]);
    const refId = `TR-${Date.now()}`;
    const movements = await StockMovement.insertMany([
      asMovement({ product, warehouse: fromWh, type: 'TRANSFER_OUT', qty, refType: 'Transfer', refId, refNumber: refId, reason, counterWarehouse: toWh, actor }),
      asMovement({ product, warehouse: toWh, type: 'TRANSFER_IN',  qty, refType: 'Transfer', refId, refNumber: refId, reason, counterWarehouse: fromWh, actor }),
    ]);
    return movements;
  },

  async movements({ q, type, productId, warehouseId, refType, page, limit, skip, sort = '-at' }) {
    const filter = {};
    if (q) filter.$or = [
      { productName: new RegExp(q, 'i') },
      { productSku: new RegExp(q, 'i') },
      { refNumber: new RegExp(q, 'i') },
    ];
    if (type && type !== 'all') filter.type = type;
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (refType && refType !== 'all') filter.refType = refType;
    const [items, total] = await Promise.all([
      StockMovement.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      StockMovement.countDocuments(filter),
    ]);
    return { items, total };
  },

  async lowStockReport() {
    const products = await Product.find({ status: 'active', reorderLevel: { $gt: 0 } }).lean();
    const ids = products.map(p => p._id);
    const levels = await StockLevel.aggregate([
      { $match: { productId: { $in: ids } } },
      { $group: { _id: '$productId', onHand: { $sum: '$onHand' }, reserved: { $sum: '$reserved' } } },
    ]);
    const byProduct = Object.fromEntries(levels.map(l => [l._id, l]));
    return products
      .map(p => {
        const s = byProduct[p._id] || { onHand: 0, reserved: 0 };
        const available = Math.max(0, s.onHand - s.reserved);
        return { ...p, onHand: s.onHand, available, deficit: Math.max(0, p.reorderLevel - available) };
      })
      .filter(p => p.available <= p.reorderLevel)
      .sort((a, b) => b.deficit - a.deficit);
  },

  async dashboard() {
    const [
      productCount, warehouseCount, totalValueAgg, byCategoryValue,
      byWarehouseStock, recentMovements, lowStock, movementsToday,
    ] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      Warehouse.countDocuments({ status: 'active' }),
      // Inventory valuation = sum(onHand * unitCost) per product
      StockLevel.aggregate([
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $group: { _id: null, value: { $sum: { $multiply: ['$onHand', '$p.unitCost'] } }, onHand: { $sum: '$onHand' } } },
      ]),
      StockLevel.aggregate([
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $group: { _id: '$p.category', value: { $sum: { $multiply: ['$onHand', '$p.unitCost'] } }, onHand: { $sum: '$onHand' } } },
        { $sort: { value: -1 } },
      ]),
      StockLevel.aggregate([
        { $lookup: { from: 'warehouses', localField: 'warehouseId', foreignField: '_id', as: 'w' } },
        { $unwind: '$w' },
        { $group: { _id: '$warehouseId', code: { $first: '$w.code' }, name: { $first: '$w.name' }, capacity: { $first: '$w.capacityUnits' }, onHand: { $sum: '$onHand' } } },
        { $sort: { onHand: -1 } },
      ]),
      StockMovement.find().sort({ at: -1 }).limit(8).lean(),
      this.lowStockReport(),
      StockMovement.countDocuments({ at: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }),
    ]);
    const totalValue = totalValueAgg[0]?.value || 0;
    const totalOnHand = totalValueAgg[0]?.onHand || 0;
    return {
      kpis: {
        totalValue, totalOnHand,
        productCount, warehouseCount,
        lowStockCount: lowStock.length,
        movementsToday,
      },
      byCategory: byCategoryValue.map(c => ({ name: c._id, value: c.value, onHand: c.onHand })),
      byWarehouse: byWarehouseStock.map(w => ({
        id: w._id, code: w.code, name: w.name, onHand: w.onHand, capacity: w.capacity,
        utilization: w.capacity > 0 ? Math.min(100, Math.round((w.onHand / w.capacity) * 100)) : 0,
      })),
      recentMovements,
      lowStock: lowStock.slice(0, 8),
    };
  },
};
