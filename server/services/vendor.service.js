import { Vendor } from '../models/vendor.model.js';
import { notFound } from '../utils/apiError.js';

export const VendorService = {
  async list({ q, category, risk, status, page, limit, skip, sort = '-createdAt' }) {
    const filter = {};
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { category: new RegExp(q, 'i') },
      { country: new RegExp(q, 'i') },
    ];
    if (category) filter.category = category;
    if (risk) filter.risk = risk;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Vendor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Vendor.countDocuments(filter),
    ]);
    return { items, total };
  },

  async get(id) {
    const vendor = await Vendor.findById(id).lean();
    if (!vendor) throw notFound('Vendor not found');
    return vendor;
  },

  async create(data, actor) {
    const v = await Vendor.create({ ...data, createdBy: actor?.id });
    return v.toObject();
  },

  async update(id, data) {
    const v = await Vendor.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!v) throw notFound('Vendor not found');
    return v;
  },

  async remove(id) {
    const v = await Vendor.findByIdAndDelete(id);
    if (!v) throw notFound('Vendor not found');
    return { id };
  },

  async topPerformers(limit = 6) {
    return Vendor.find().sort({ score: -1 }).limit(limit).lean();
  },

  async categoryDistribution() {
    const agg = await Vendor.aggregate([
      { $group: { _id: '$category', spend: { $sum: '$spend' }, count: { $sum: 1 } } },
      { $sort: { spend: -1 } },
    ]);
    return agg.map(a => ({ name: a._id, spend: a.spend, count: a.count }));
  },
};
