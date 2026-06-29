// CSV report builder. Streams as application/csv text — no external deps.
import { Vendor } from '../models/vendor.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PurchaseRequest } from '../models/purchaseRequest.model.js';
import { Product } from '../models/product.model.js';
import { StockMovement } from '../models/stockMovement.model.js';
import { AuditLog } from '../models/auditLog.model.js';

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
    const rows = await Vendor.find().sort({ name: 1 }).lean();
    return toCsv(rows, [
      { key: 'name', label: 'Name' }, { key: 'category' }, { key: 'country' },
      { key: 'status' }, { key: 'risk' }, { key: 'score' }, { key: 'spend' },
      { key: 'contactEmail' }, { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
    ]);
  },
  async purchaseOrders() {
    const rows = await PurchaseOrder.find().sort({ createdAt: -1 }).lean();
    return toCsv(rows, [
      { key: 'number', label: 'PO' }, { key: 'vendorName', label: 'Vendor' },
      { key: 'status' }, { key: 'deliveryStatus' }, { key: 'amount' },
      { key: 'ownerName', label: 'Owner' }, { key: 'requestNumber', label: 'From PR' },
      { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
    ]);
  },
  async purchaseRequests() {
    const rows = await PurchaseRequest.find().sort({ createdAt: -1 }).lean();
    return toCsv(rows, [
      { key: 'number', label: 'PR' }, { key: 'title' }, { key: 'department' },
      { key: 'priority' }, { key: 'status' }, { key: 'estimatedTotal' },
      { key: 'requesterName' }, { key: 'selectedVendorName' }, { key: 'poNumber' },
      { key: 'createdAt', fn: r => r.createdAt?.toISOString?.() || '' },
    ]);
  },
  async products() {
    const rows = await Product.find().sort({ sku: 1 }).lean();
    return toCsv(rows, [
      { key: 'sku' }, { key: 'name' }, { key: 'category' },
      { key: 'unit' }, { key: 'unitCost' }, { key: 'unitPrice' },
      { key: 'reorderLevel' }, { key: 'safetyStock' }, { key: 'leadTimeDays' },
      { key: 'status' },
    ]);
  },
  async stockMovements() {
    const rows = await StockMovement.find().sort({ at: -1 }).limit(5000).lean();
    return toCsv(rows, [
      { key: 'at', fn: r => r.at?.toISOString?.() || '' },
      { key: 'type' }, { key: 'productSku' }, { key: 'productName' },
      { key: 'warehouseCode' }, { key: 'counterWarehouseCode', label: 'transferTo' },
      { key: 'qty' }, { key: 'refType' }, { key: 'refNumber' },
      { key: 'reason' }, { key: 'actorName' },
    ]);
  },
  async auditLog({ days = 30 } = {}) {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await AuditLog.find({ at: { $gte: since } }).sort({ at: -1 }).limit(5000).lean();
    return toCsv(rows, [
      { key: 'at', fn: r => r.at?.toISOString?.() || '' },
      { key: 'actorName' }, { key: 'action' }, { key: 'resource' }, { key: 'resourceId' },
      { key: 'ip' }, { key: 'meta' },
    ]);
  },
};

export const ReportNames = ['vendors','purchase-orders','purchase-requests','products','stock-movements','audit-log'];
