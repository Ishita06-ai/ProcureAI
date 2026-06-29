import { Warehouse } from '../models/warehouse.model.js';
import { StockLevel } from '../models/stockLevel.model.js';
import { notFound } from '../utils/apiError.js';

export const WarehouseService = {
  async list() {
    const items = await Warehouse.find().sort({ code: 1 }).lean();
    // Augment with current stock totals
    const totals = await StockLevel.aggregate([
      { $group: { _id: '$warehouseId', onHand: { $sum: '$onHand' }, products: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(totals.map(t => [t._id, t]));
    return items.map(w => ({
      ...w,
      onHand: map[w._id]?.onHand || 0,
      productCount: map[w._id]?.products || 0,
      utilization: w.capacityUnits > 0 ? Math.min(100, Math.round(((map[w._id]?.onHand || 0) / w.capacityUnits) * 100)) : 0,
    }));
  },
  async get(id) {
    const w = await Warehouse.findById(id).lean();
    if (!w) throw notFound('Warehouse not found');
    return w;
  },
  async create(data) { return (await Warehouse.create(data)).toObject(); },
};
