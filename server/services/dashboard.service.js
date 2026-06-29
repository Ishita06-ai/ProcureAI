import mongoose from 'mongoose';
import { cached, cache } from '../utils/cache.js';
import { Vendor } from '../models/vendor.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';

// Cached overview to reduce repeated aggregations.
export const DashboardService = {
  async overview() {
    return cached('dashboard:overview', 20, async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [
        vendorCount, riskyVendors, openPOs, deliveredPOs, monthSpend,
        pendingApprovals, approvedPRs, openPRs,
        recentPOs, topVendors, distribution, recentActivity,
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
      ]);
      return {
        kpis: {
          monthSpend: monthSpend[0]?.total || 0,
          openPurchaseOrders: openPOs, deliveredPOs,
          pendingApprovals, approvedPRs, openPRs,
          vendorCount, vendorsAtRisk: riskyVendors,
        },
        recentPOs, topVendors,
        distribution: distribution.map(d => ({ name: d._id, spend: d.spend })),
        activityFeed: recentActivity,
      };
    });
  },
  invalidate() { return cache.delPrefix('dashboard:'); },
};
