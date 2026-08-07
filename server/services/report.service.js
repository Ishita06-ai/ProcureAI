// CSV report builder. Streams as application/csv text — no external deps.
import { Vendor } from '../models/vendor.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';
import { Product } from '../models/product.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { cached } from '../utils/cache.js';

// Each export only needs the columns it emits. Projecting avoids hydrating the
// heavy sub-documents (PO lines, PR items/quotes/approvals/activityLog, etc.)
// so Mongo transfers far less per report.
const VENDOR_PROJECTION = { _id: 0, name: 1, category: 1, country: 1, status: 1, risk: 1, score: 1, spend: 1, contactEmail: 1, createdAt: 1 };
const PO_PROJECTION = { _id: 0, number: 1, vendorName: 1, status: 1, deliveryStatus: 1, amount: 1, ownerName: 1, requestNumber: 1, createdAt: 1 };
const PR_PROJECTION = { _id: 0, number: 1, title: 1, department: 1, priority: 1, status: 1, estimatedTotal: 1, requesterName: 1, selectedVendorName: 1, poNumber: 1, createdAt: 1 };
const PRODUCT_PROJECTION = { _id: 0, sku: 1, name: 1, category: 1, unit: 1, unitCost: 1, unitPrice: 1, reorderLevel: 1, safetyStock: 1, leadTimeDays: 1, status: 1 };
const MOVEMENT_PROJECTION = { _id: 0, at: 1, type: 1, productSku: 1, productName: 1, warehouseCode: 1, counterWarehouseCode: 1, qty: 1, refType: 1, refNumber: 1, reason: 1, actorName: 1 };
const AUDIT_PROJECTION = { _id: 0, at: 1, actorName: 1, action: 1, resource: 1, resourceId: 1, ip: 1, meta: 1 };

// Export generation scans the full collection — an expensive, repeated read.
// Cache the rendered CSV briefly so repeated downloads of the same report skip
// the DB scan entirely (matches the dashboard/analytics caching pattern; the
// report becomes current again within the TTL).
const REPORT_TTL = 30;

function csvCell(v) {
  if (v == null) return '';
  if (Array.isArray(v)) v = v.join('|');
  if (typeof v === 'object') v = JSON.stringify(v);
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map(c => c.label || c.key).join(',');
  const body = rows.map(r => columns.map(c => csvCell(c.fn ? c.fn(r) : r[c.key])).join(',')).join('\n');
  return header + '\n' + body;
}

export const ReportService = {
  async vendors() {
    return cached('report:vendors', REPORT_TTL, async () => {
      const rows = await Vendor.find({}, VENDOR_PROJECTION).sort({ name: 1 }).lean();
      return toCsv(rows, [
        { key: 'name', label: 'Name' }, { key: 'category' }, { key: 'country' },
        { key: 'status' }, { key: 'risk' }, { key: 'score' }, { key: 'spend' },
        { key: 'contactEmail' }, { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
      ]);
    });
  },
  async purchaseOrders() {
    return cached('report:purchaseOrders', REPORT_TTL, async () => {
      const rows = await PurchaseOrder.find({}, PO_PROJECTION).sort({ createdAt: -1 }).lean();
      return toCsv(rows, [
        { key: 'number', label: 'PO' }, { key: 'vendorName', label: 'Vendor' },
        { key: 'status' }, { key: 'deliveryStatus' }, { key: 'amount' },
        { key: 'ownerName', label: 'Owner' }, { key: 'requestNumber', label: 'From PR' },
        { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
      ]);
    });
  },
  async purchaseRequests() {
    return cached('report:purchaseRequests', REPORT_TTL, async () => {
      const rows = await PurchaseRequest.find({}, PR_PROJECTION).sort({ createdAt: -1 }).lean();
      return toCsv(rows, [
        { key: 'number', label: 'PR' }, { key: 'title' }, { key: 'department' },
        { key: 'priority' }, { key: 'status' }, { key: 'estimatedTotal' },
        { key: 'requesterName' }, { key: 'selectedVendorName' }, { key: 'poNumber' },
        { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
      ]);
    });
  },
  async products() {
    return cached('report:products', REPORT_TTL, async () => {
      const rows = await Product.find({}, PRODUCT_PROJECTION).sort({ sku: 1 }).lean();
      return toCsv(rows, [
        { key: 'sku' }, { key: 'name' }, { key: 'category' },
        { key: 'unit' }, { key: 'unitCost' }, { key: 'unitPrice' },
        { key: 'reorderLevel' }, { key: 'safetyStock' }, { key: 'leadTimeDays' },
        { key: 'status' },
      ]);
    });
  },
  async stockMovements() {
    return cached('report:stockMovements', REPORT_TTL, async () => {
      const rows = await StockMovement.find({}, MOVEMENT_PROJECTION).sort({ at: -1 }).limit(5000).lean();
      return toCsv(rows, [
        { key: 'at', fn: r => r.at?.toISOString?.() || '' },
        { key: 'type' }, { key: 'productSku' }, { key: 'productName' },
        { key: 'warehouseCode' }, { key: 'counterWarehouseCode', label: 'transferTo' },
        { key: 'qty' }, { key: 'refType' }, { key: 'refNumber' },
        { key: 'reason' }, { key: 'actorName' },
      ]);
    });
  },
  async auditLog({ days = 30 } = {}) {
    const since = new Date(Date.now() - days * 86400000);
    return cached('report:auditLog', REPORT_TTL, async () => {
      const rows = await AuditLog.find({ at: { $gte: since } }, AUDIT_PROJECTION).sort({ at: -1 }).limit(5000).lean();
      return toCsv(rows, [
        { key: 'at', fn: r => r.at?.toISOString?.() || '' },
        { key: 'actorName' }, { key: 'action' }, { key: 'resource' }, { key: 'resourceId' },
        { key: 'ip' }, { key: 'meta' },
      ]);
    });
  },
};

export const ReportNames = ['vendors','purchase-orders','purchase-requests','products','stock-movements','audit-log'];
