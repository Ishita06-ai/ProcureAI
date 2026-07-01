import mongoose from 'mongoose';
import { cached, cache } from '../utils/cache.js';
import { Vendor } from '../models/vendor.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';

export const DashboardService = {
  async overview() {
    return cached('dashboard:overview', 20, async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [
        vendorCount, riskyVendors, openPOs, deliveredPOs, monthSpend,
        pendingApprovals, approvedPRs, openPRs,
        recentPOs, topVendors, distribution, recentActivity,
        spendSpark, approvalSpark, poSpark,
      ] = await Promise.all([
        Vendor.countDocuments(),
        Vendor.countDocuments({ risk: 'high' }),
        PurchaseOrder.countDocuments({ status: { $in: ['Pending', 'Approved', 'In Transit'] } }),
        PurchaseOrder.countDocuments({ status: 'Delivered' }),
        PurchaseOrder.aggregate([
          { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PurchaseRequest.countDocuments({ status: { $in: ['Submitted', 'UnderReview'] } }),
        PurchaseRequest.countDocuments({ status: 'Approved', poId: { $in: [null, undefined] } }),
        PurchaseRequest.countDocuments({ status: { $nin: ['Cancelled', 'Rejected'] } }),
        PurchaseOrder.find().sort({ createdAt: -1 }).limit(6).lean(),
        Vendor.find().sort({ score: -1 }).limit(6).lean(),
        Vendor.aggregate([
          { $group: { _id: '$category', spend: { $sum: '$spend' } } },
          { $sort: { spend: -1 } },
        ]),
        PurchaseRequest.aggregate([
          { $unwind: '$activityLog' },
          { $sort: { 'activityLog.at': -1 } },
          { $limit: 8 },
          { $project: { _id: 0, number: 1, title: 1, action: '$activityLog.action', who: '$activityLog.actorName', at: '$activityLog.at' } },
        ]),
        // Spend per week for last 8 weeks
        PurchaseOrder.aggregate([
          { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: new Date(now - 56 * 864e5) } } },
          { $group: { _id: { $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, 864e5 * 7] } }, v: { $sum: '$amount' } } },
          { $sort: { '_id': 1 } },
        ]),
        // Pending approvals per week for last 8 weeks
        PurchaseRequest.aggregate([
          { $match: { status: { $in: ['Submitted', 'UnderReview'] }, createdAt: { $gte: new Date(now - 56 * 864e5) } } },
          { $group: { _id: { $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, 864e5 * 7] } }, v: { $sum: 1 } } },
          { $sort: { '_id': 1 } },
        ]),
        // Open POs per week for last 8 weeks
        PurchaseOrder.aggregate([
          { $match: { status: { $in: ['Pending', 'Approved', 'In Transit'] }, createdAt: { $gte: new Date(now - 56 * 864e5) } } },
          { $group: { _id: { $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, 864e5 * 7] } }, v: { $sum: 1 } } },
          { $sort: { '_id': 1 } },
        ]),
      ]);

      const toSpark = (agg, weeks = 8) => {
        const map = Object.fromEntries(agg.map(d => [d._id, d.v]));
        return Array.from({ length: weeks }, (_, i) => map[weeks - 1 - i] || 0).reverse();
      };

      return {
        kpis: {
          monthSpend: monthSpend[0]?.total || 0,
          openPurchaseOrders: openPOs, deliveredPOs,
          pendingApprovals, approvedPRs, openPRs,
          vendorCount, vendorsAtRisk: riskyVendors,
        },
        sparks: {
          spend:    toSpark(spendSpark),
          approval: toSpark(approvalSpark),
          po:       toSpark(poSpark),
        },
        recentPOs, topVendors,
        distribution: distribution.map(d => ({ name: d._id, spend: d.spend })),
        activityFeed: recentActivity,
      };
    });
  },
  invalidate() { return cache.delPrefix('dashboard:'); },
};