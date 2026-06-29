import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';
import { Vendor } from '../models/vendor.model.js';
import { Product } from '../models/product.model.js';
import { StockLevel } from '../models/stockLevel.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { cached } from '../utils/cache.js';

export const AnalyticsService = {
  // 12-month spend trend (POs by createdAt month)
  spendTrend: () => cached('analytics:spendTrend', 60, async () => {
    const data = await PurchaseOrder.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, spend: { $sum: '$amount' }, orders: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
      { $limit: 12 },
      { $project: { _id: 0, month: { $concat: [{ $toString: '$_id.y' }, '-', { $toString: '$_id.m' }] }, spend: 1, orders: 1 } },
    ]);
    return data;
  }),

  // Spend by category (from vendors)
  spendByCategory: () => cached('analytics:spendByCategory', 60, async () => {
    return Vendor.aggregate([
      { $group: { _id: '$category', spend: { $sum: '$spend' }, vendors: { $sum: 1 } } },
      { $sort: { spend: -1 } },
      { $project: { _id: 0, category: '$_id', spend: 1, vendors: 1 } },
    ]);
  }),

  // Spend by department from approved PRs
  spendByDepartment: () => cached('analytics:spendByDepartment', 60, async () => {
    return PurchaseRequest.aggregate([
      { $match: { status: 'Approved' } },
      { $group: { _id: '$department', spend: { $sum: '$estimatedTotal' }, count: { $sum: 1 } } },
      { $sort: { spend: -1 } },
      { $project: { _id: 0, department: '$_id', spend: 1, count: 1 } },
    ]);
  }),

  // PR approval funnel
  approvalFunnel: () => cached('analytics:funnel', 60, async () => {
    const agg = await PurchaseRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(agg.map(a => [a._id, a.count]));
    return ['Draft','Submitted','UnderReview','Approved','Rejected'].map(s => ({ stage: s, count: map[s] || 0 }));
  }),

  // Top vendors by spend
  topVendorsBySpend: () => cached('analytics:topVendors', 60, async () => {
    return Vendor.find().sort({ spend: -1 }).limit(8)
      .select('name category spend score risk').lean();
  }),

  // Inventory value trend (last 14 days via movements running balance)
  inventoryMovementsByDay: () => cached('analytics:invByDay', 60, async () => {
    const since = new Date(Date.now() - 14 * 86400000);
    return StockMovement.aggregate([
      { $match: { at: { $gte: since } } },
      { $group: {
        _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, type: '$type' },
        qty: { $sum: '$qty' },
      } },
      { $project: { _id: 0, date: '$_id.d', type: '$_id.type', qty: 1 } },
      { $sort: { date: 1 } },
    ]);
  }),

  // Avg PR cycle time per dept (Submitted -> Approved)
  cycleTimes: () => cached('analytics:cycle', 120, async () => {
    const prs = await PurchaseRequest.find({ status: 'Approved' }).select('department activityLog approvalChain createdAt').lean();
    const byDept = {};
    for (const pr of prs) {
      const submitted = pr.activityLog.find(a => a.action === 'pr.submitted')?.at || pr.createdAt;
      const approved  = pr.activityLog.find(a => a.action === 'pr.approved')?.at
                     || pr.approvalChain.slice().reverse().find(s => s.status === 'approved')?.actedAt;
      if (!submitted || !approved) continue;
      const hours = (new Date(approved) - new Date(submitted)) / 3600000;
      if (!byDept[pr.department]) byDept[pr.department] = { dept: pr.department, count: 0, totalHours: 0 };
      byDept[pr.department].count++;
      byDept[pr.department].totalHours += hours;
    }
    return Object.values(byDept).map(d => ({ department: d.dept, avgHours: d.totalHours / d.count, count: d.count }));
  }),

  // Combined overview for the analytics page (single network call)
  overview: () => cached('analytics:overview', 30, async () => {
    const [trend, byCat, byDept, funnel, topVendors, invDaily, cycles] = await Promise.all([
      AnalyticsService.spendTrend(),
      AnalyticsService.spendByCategory(),
      AnalyticsService.spendByDepartment(),
      AnalyticsService.approvalFunnel(),
      AnalyticsService.topVendorsBySpend(),
      AnalyticsService.inventoryMovementsByDay(),
      AnalyticsService.cycleTimes(),
    ]);
    return { trend, byCat, byDept, funnel, topVendors, invDaily, cycles };
  }),
};
