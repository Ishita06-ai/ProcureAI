// Lightweight "tool" layer: detects intent from the user's question and pre-fetches
// the most relevant live data so the LLM (or the fallback responder) can ground its answer.
// This avoids needing model-side tool calling for free models that may not support it well.

import { Product } from '../models/product.model.js';
import { Warehouse } from '../models/warehouse.model.js';
import { StockLevel } from '../models/stockLevel.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';
import { Vendor } from '../models/vendor.model.js';
import { StockService } from './stock.service.js';
import { DashboardService } from './dashboard.service.js';

function matches(q, ...keywords) {
  const lower = q.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export const AiContextService = {
  /**
   * Build a rich context object based on what the user is asking about.
   * Returns { summary: string, blocks: [{label, data}], citations: [{label,kind,value}] }
   */
  async build(question) {
    const blocks = [];
    const citations = [];
    const want = {
      stockout:    matches(question, 'stock out', 'stockout', 'out of stock', 'low stock', 'reorder', 'replenish'),
      vendors:     matches(question, 'vendor', 'supplier', 'risk', 'preferred'),
      spend:       matches(question, 'spend', 'cost', 'budget', 'savings', 'expense'),
      approvals:   matches(question, 'approval', 'pending', 'review', 'approve', 'reject'),
      orders:      matches(question, 'purchase order', 'po-', 'delivery', 'shipment', 'transit'),
      inventory:   matches(question, 'inventory', 'warehouse', 'stock', 'sku', 'product'),
      summary:     matches(question, 'summary', 'overview', 'snapshot', 'status', 'how are we', 'how is'),
      forecast:    matches(question, 'forecast', 'predict', 'next month', 'next quarter', 'projection'),
      recommend:   matches(question, 'recommend', 'suggest', 'should i', 'what should', 'action'),
    };
    // Default: include the overall snapshot if user is vague
    const noneSpecific = !Object.values(want).some(Boolean);
    if (noneSpecific) want.summary = true;

    if (want.summary || want.spend || want.recommend || want.forecast) {
      const dash = await DashboardService.overview();
      blocks.push({ label: 'procurement_snapshot', data: dash.kpis });
      blocks.push({ label: 'spend_by_category', data: dash.distribution.slice(0, 6) });
      citations.push({ label: `Spend MTD $${(dash.kpis.monthSpend||0).toLocaleString()}`, kind: 'kpi', value: 'monthSpend' });
      citations.push({ label: `${dash.kpis.openPurchaseOrders} open POs`, kind: 'kpi', value: 'openPOs' });
    }

    if (want.stockout || want.inventory || want.recommend || want.forecast) {
      const lowStock = await StockService.lowStockReport();
      const invDash = await StockService.dashboard();
      blocks.push({ label: 'inventory_kpis', data: invDash.kpis });
      blocks.push({ label: 'low_stock_items', data: lowStock.map(p => ({
        sku: p.sku, name: p.name, available: p.available, reorderLevel: p.reorderLevel, deficit: p.deficit,
        leadTimeDays: p.leadTimeDays, defaultVendor: p.defaultVendorName,
      })).slice(0, 10) });
      blocks.push({ label: 'by_warehouse', data: invDash.byWarehouse.map(w => ({ code: w.code, name: w.name, onHand: w.onHand, capacity: w.capacity, utilization: w.utilization })) });
      if (lowStock.length) citations.push({ label: `${lowStock.length} SKUs below reorder`, kind: 'inventory', value: lowStock.map(p => p.sku).slice(0, 5) });
      citations.push({ label: `Inventory value $${(invDash.kpis.totalValue||0).toLocaleString()}`, kind: 'inventory', value: 'totalValue' });
    }

    if (want.vendors || want.recommend) {
      const vendors = await Vendor.find().sort({ score: -1 }).limit(10).lean();
      const risky = vendors.filter(v => v.risk === 'high');
      blocks.push({ label: 'top_vendors', data: vendors.map(v => ({ name: v.name, category: v.category, score: v.score, risk: v.risk, spend: v.spend, country: v.country })) });
      if (risky.length) {
        blocks.push({ label: 'risky_vendors', data: risky.map(v => ({ name: v.name, risk: v.risk, score: v.score })) });
        citations.push({ label: `${risky.length} vendor(s) flagged high risk`, kind: 'risk', value: risky.map(v => v.name) });
      }
    }

    if (want.approvals || want.recommend) {
      const pending = await PurchaseRequest.find({ status: { $in: ['Submitted', 'UnderReview'] } }).sort({ createdAt: -1 }).limit(10).lean();
      blocks.push({ label: 'pending_approvals', data: pending.map(p => ({
        number: p.number, title: p.title, total: p.estimatedTotal, priority: p.priority,
        requester: p.requesterName, currentLevel: p.currentLevel, department: p.department,
      })) });
      if (pending.length) citations.push({ label: `${pending.length} PRs awaiting approval`, kind: 'pr', value: pending.map(p => p.number) });
    }

    if (want.orders) {
      const pos = await PurchaseOrder.find().sort({ createdAt: -1 }).limit(8).lean();
      blocks.push({ label: 'recent_purchase_orders', data: pos.map(p => ({
        number: p.number, vendor: p.vendorName, status: p.status, amount: p.amount, deliveryStatus: p.deliveryStatus, eta: p.eta,
      })) });
      citations.push({ label: `${pos.length} recent POs`, kind: 'po', value: pos.map(p => p.number).slice(0, 5) });
    }

    const summary = blocks.map(b => `${b.label}: ${JSON.stringify(b.data)}`).join('\n');
    return { summary, blocks, citations, intent: want };
  },
};
