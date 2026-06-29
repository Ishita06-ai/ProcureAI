import { GoodsReceivedNote } from '../models/goodsReceivedNote.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { Product } from '../models/product.model.js';
import { Warehouse } from '../models/warehouse.model.js';
import { StockService } from './stock.service.js';
import { notFound, badRequest } from '../utils/apiError.js';

function nextNumber() { return `GRN-${50000 + Math.floor(Math.random() * 50000)}`; }

export const GrnService = {
  async list({ q, status, page, limit, skip, sort = '-createdAt' }) {
    const filter = {};
    if (q) filter.$or = [
      { number: new RegExp(q, 'i') },
      { poNumber: new RegExp(q, 'i') },
      { vendorName: new RegExp(q, 'i') },
    ];
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      GoodsReceivedNote.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      GoodsReceivedNote.countDocuments(filter),
    ]);
    return { items, total };
  },

  async create(data, actor) {
    const po = await PurchaseOrder.findById(data.poId);
    if (!po) throw badRequest('PO not found');

    // Choose destination warehouse: main if exists else first active
    let wh = await Warehouse.findOne({ type: 'main', status: 'active' });
    if (!wh) wh = await Warehouse.findOne({ status: 'active' });

    const grn = await GoodsReceivedNote.create({
      number: nextNumber(),
      poId: po._id, poNumber: po.number,
      vendorId: po.vendorId, vendorName: po.vendorName,
      receivedById: actor?.id, receivedByName: actor?.name || 'system',
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
      status: data.status || 'Received',
      lines: data.lines,
      notes: data.notes,
    });

    // Hook: for each line with a known SKU, perform a stock IN movement.
    if (wh) {
      for (const line of data.lines) {
        if (!line.sku || !line.qtyReceived || line.qtyReceived <= 0) continue;
        if (line.condition && line.condition !== 'good') continue;
        const product = await Product.findOne({ sku: line.sku.toUpperCase() }).lean();
        if (!product) continue;
        await StockService.stockIn({
          productId: product._id, warehouseId: wh._id,
          qty: line.qtyReceived,
          unitCost: product.unitCost,
          refType: 'GRN', refId: grn._id, refNumber: grn.number,
          reason: `Receipt against ${po.number}`,
        }, actor);
      }
    }

    // Update PO status
    po.deliveryStatus = grn.status === 'Received' ? 'Received' : 'PartiallyReceived';
    if (grn.status === 'Received') {
      po.status = 'Delivered';
      po.deliveredAt = grn.receivedAt;
    }
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.grnCreated', meta: { grn: grn.number, status: grn.status } });
    await po.save();

    return grn.toObject();
  },

  async get(id) {
    const grn = await GoodsReceivedNote.findById(id).lean();
    if (!grn) throw notFound('GRN not found');
    return grn;
  },
};
