import { Product } from '../models/product.model.js';
import { StockLevel } from '../models/stockLevel.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { notFound, conflict } from '../utils/apiError.js';

async function attachStock(products) {
  if (!products.length) return products;
  const ids = products.map(p => p._id);
  const levels = await StockLevel.find({ productId: { $in: ids } }).lean();
  const byProduct = {};
  for (const l of levels) {
    if (!byProduct[l.productId]) byProduct[l.productId] = { onHand: 0, reserved: 0, locations: 0 };
    byProduct[l.productId].onHand += l.onHand;
    byProduct[l.productId].reserved += l.reserved;
    byProduct[l.productId].locations += 1;
  }
  return products.map(p => {
    const s = byProduct[p._id] || { onHand: 0, reserved: 0, locations: 0 };
    const stockValue = (s.onHand || 0) * (p.unitCost || 0);
    const available = Math.max(0, s.onHand - s.reserved);
    const lowStock = p.reorderLevel > 0 && available <= p.reorderLevel;
    const outOfStock = available === 0;
    return { ...p, ...s, available, stockValue, lowStock, outOfStock };
  });
}

export const ProductService = {
  async list({ q, category, status, lowStock, page, limit, skip, sort = 'name' }) {
    const filter = {};
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { sku: new RegExp(q, 'i') },
      { barcode: new RegExp(q, 'i') },
    ];
    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    let items = await attachStock(products);
    if (lowStock === 'true' || lowStock === true) items = items.filter(p => p.lowStock);
    return { items, total };
  },

  async get(id) {
    const p = await Product.findById(id).lean();
    if (!p) throw notFound('Product not found');
    const [enriched] = await attachStock([p]);
    const stockByWarehouse = await StockLevel.find({ productId: id }).lean();
    const recentMovements = await StockMovement.find({ productId: id }).sort({ at: -1 }).limit(20).lean();
    return { ...enriched, stockByWarehouse, recentMovements };
  },

  async create(data) {
    data.sku = data.sku.toUpperCase();
    const existing = await Product.findOne({ sku: data.sku });
    if (existing) throw conflict(`SKU ${data.sku} already exists`);
    return (await Product.create(data)).toObject();
  },

  async update(id, data) {
    if (data.sku) data.sku = data.sku.toUpperCase();
    const p = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!p) throw notFound('Product not found');
    return p;
  },

  async remove(id) {
    const p = await Product.findByIdAndDelete(id);
    if (!p) throw notFound('Product not found');
    await StockLevel.deleteMany({ productId: id });
    return { id };
  },

  attachStock,
};
