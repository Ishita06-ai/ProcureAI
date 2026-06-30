import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { Vendor } from '../models/vendor.model.js';
import { notFound, badRequest } from '../utils/apiError.js';
import { EmailNotify } from './emailNotify.service.js';
import { User } from '../models/user.model.js';

function nextNumber() { return `PO-${10000 + Math.floor(Math.random() * 90000)}`; }

export const PoService = {
  async list({ q, status, page, limit, skip, sort = '-createdAt' }) {
    const filter = {};
    if (q) filter.$or = [
      { number: new RegExp(q, 'i') },
      { vendorName: new RegExp(q, 'i') },
      { ownerName: new RegExp(q, 'i') },
    ];
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      PurchaseOrder.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      PurchaseOrder.countDocuments(filter),
    ]);
    return { items, total };
  },

  async get(id) {
    const po = await PurchaseOrder.findById(id).lean();
    if (!po) throw notFound('PO not found');
    return po;
  },

  async create(data, actor) {
    const vendor = await Vendor.findById(data.vendorId).lean();
    if (!vendor) throw badRequest('vendorId does not exist');
    const lines = (data.lines || []).map(l => ({
      ...l, lineTotal: (l.qty || 0) * (l.unitPrice || 0),
    }));
    const amount = data.amount ?? lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
    const po = await PurchaseOrder.create({
      number: nextNumber(),
      vendorId: vendor._id, vendorName: vendor.name,
      ownerId: actor?.id, ownerName: actor?.name,
      status: data.status || 'Pending',
      amount, lines, notes: data.notes,
      activityLog: [{ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.created' }],
    });
    return po.toObject();
  },

  async updateStatus(id, status, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    const prev = po.status;
    po.status = status;
    if (status === 'In Transit') po.deliveryStatus = 'Shipped';
    if (status === 'Delivered') { po.deliveryStatus = 'Received'; po.deliveredAt = new Date(); }
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.statusChange', meta: { from: prev, to: status } });
    await po.save();

    if (['In Transit', 'Delivered', 'Cancelled'].includes(status) && po.ownerId) {
      const owner = await User.findById(po.ownerId).select('email').lean();
      EmailNotify.notifyAndEmail({
        to: owner?.email, userId: po.ownerId, kind: 'po',
        severity: status === 'Cancelled' ? 'warning' : 'info',
        title: `${po.number} is now ${status}`,
        body: `Purchase order ${po.number} with ${po.vendorName} changed from ${prev} to ${status}.`,
        link: 'procurement', meta: { poId: po._id, poNumber: po.number, from: prev, to: status },
      }).catch(() => {});
    }

    return po.toObject();
  },

  async addComment(id, text, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    po.comments.push({ userId: actor?.id, userName: actor?.name, text });
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.commented' });
    await po.save();
    return po.toObject();
  },

  async recent(limit = 6) {
    return PurchaseOrder.find().sort({ createdAt: -1 }).limit(limit).lean();
  },
};