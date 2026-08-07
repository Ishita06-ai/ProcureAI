/**
 * Seeds the disposable benchmark DB (procurio_bench) with a deterministic,
 * realistic dataset. Local-only. Idempotent: drops the collections it manages
 * then re-inserts, so before/after benchmark runs always start from identical
 * data.
 *
 * Usage: node benchmark/seed.js
 */
import { randomUUID } from 'node:crypto';
import { connect, disconnect } from './lib/setup.js';
import { hashPassword } from '../server/utils/password.js';
import { Vendor } from '../server/models/vendor.model.js';
import { Product } from '../server/models/product.model.js';
import { Warehouse } from '../server/models/warehouse.model.js';
import { StockLevel } from '../server/models/stockLevel.model.js';
import { PurchaseOrder } from '../server/models/purchaseOrder.model.js';
import { PurchaseRequest } from '../server/models/purchaseRequest.model.js';
import { StockMovement } from '../server/models/stockMovement.model.js';
import { User } from '../server/models/user.model.js';
import { Notification } from '../server/models/notification.model.js';

// Deterministic PRNG so the dataset is identical every run.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260807);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + rnd() * (hi - lo);
const daysAgo = (d) => new Date(Date.now() - d * 864e5);

const CATEGORIES = ['Office Supplies', 'IT Hardware', 'Raw Materials', 'Packaging', 'Maintenance', 'Furniture', 'Safety', 'Services'];
const COUNTRIES = ['USA', 'India', 'Germany', 'China', 'Japan', 'Mexico', 'Vietnam'];
const PO_STATUSES = ['Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled', 'Draft'];
const PR_STATUSES = ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Cancelled'];
const DEPARTMENTS = ['Operations', 'IT', 'Finance', 'HR', 'Facilities', 'Marketing', 'Logistics'];
const MOV_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT'];
const REF_TYPES = ['GRN', 'PO', 'Manual', 'Transfer', 'Adjustment', 'Sale'];

const WAREHOUSES = [
  { code: 'WH-MAIN', name: 'Main Distribution Center', city: 'Austin', capacityUnits: 50000 },
  { code: 'WH-EAST', name: 'East Regional Warehouse', city: 'Atlanta', capacityUnits: 30000 },
  { code: 'WH-WEST', name: 'West Coast Hub', city: 'Fremont', capacityUnits: 40000 },
];

export async function seed() {
  await connect();

  const N_VENDORS = 300;
  const N_PRODUCTS = 400;
  const N_POS = 2500;
  const N_PRS = 2000;
  const N_MOVEMENTS = 20000;

  const vendorIds = Array.from({ length: N_VENDORS }, () => randomUUID());
  const productIds = Array.from({ length: N_PRODUCTS }, () => randomUUID());
  const whIds = WAREHOUSES.map(() => randomUUID());

  const now = Date.now();

  // Vendors
  const vendors = vendorIds.map((id, i) => {
    const risk = pick(['low', 'low', 'medium', 'high']);
    return {
      _id: id,
      name: `Supplier ${String(i + 1).padStart(3, '0')} ${pick(['Inc', 'LLC', 'Co', 'Group'])}`,
      category: pick(CATEGORIES),
      country: pick(COUNTRIES),
      status: pick(['Active', 'Active', 'Preferred', 'Watchlist', 'At Risk']),
      risk,
      score: Math.round(between(30, 99)),
      spend: Math.round(between(1000, 900000)),
      contactEmail: `vendor${i}@example.com`,
      tags: ['benchmark'],
      createdAt: daysAgo(between(0, 400)),
      updatedAt: daysAgo(between(0, 30)),
    };
  });

  // Products
  const products = productIds.map((id, i) => ({
    _id: id,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
    barcode: `BAR${1000000000 + i}`,
    name: `Product ${i + 1} ${pick(['Widget', 'Gadget', 'Component', 'Tool', 'Part'])}`,
    description: 'Seeded benchmark product',
    category: pick(CATEGORIES),
    unit: pick(['pcs', 'box', 'kg', 'm']),
    unitCost: Math.round(between(2, 400) * 100) / 100,
    unitPrice: Math.round(between(5, 700) * 100) / 100,
    reorderLevel: Math.round(between(5, 60)),
    safetyStock: Math.round(between(2, 30)),
    leadTimeDays: Math.round(between(3, 30)),
    defaultVendorId: pick(vendorIds),
    defaultVendorName: '—',
    status: 'active',
    createdAt: daysAgo(between(0, 500)),
    updatedAt: daysAgo(between(0, 30)),
  }));

  // Warehouses
  const warehouses = WAREHOUSES.map((w, i) => ({
    _id: whIds[i],
    code: w.code,
    name: w.name,
    type: i === 0 ? 'main' : 'distribution',
    city: w.city,
    country: 'USA',
    managerName: `Manager ${i + 1}`,
    capacityUnits: w.capacityUnits,
    status: 'active',
    createdAt: daysAgo(600),
    updatedAt: daysAgo(30),
  }));

  // Stock levels: every product in every warehouse
  const stockLevels = [];
  for (const pid of productIds) {
    for (const wid of whIds) {
      stockLevels.push({
        _id: randomUUID(),
        productId: pid,
        warehouseId: wid,
        onHand: Math.round(between(0, 500)),
        reserved: Math.round(between(0, 40)),
        inbound: Math.round(between(0, 60)),
        lastMovementAt: daysAgo(between(0, 7)),
        createdAt: daysAgo(between(0, 400)),
        updatedAt: daysAgo(between(0, 7)),
      });
    }
  }

  // Purchase orders
  const pos = [];
  for (let i = 0; i < N_POS; i++) {
    const vid = pick(vendorIds);
    const vendor = vendors.find((v) => v._id === vid);
    const status = PO_STATUSES[Math.floor(rnd() * PO_STATUSES.length)];
    const createdAt = daysAgo(between(0, 300));
    const lineCount = 1 + Math.floor(rnd() * 4);
    const lines = Array.from({ length: lineCount }, () => {
      const qty = 1 + Math.floor(rnd() * 100);
      const unitPrice = Math.round(between(2, 300) * 100) / 100;
      return {
        _id: randomUUID(),
        sku: `SKU-${String(1 + Math.floor(rnd() * N_PRODUCTS)).padStart(5, '0')}`,
        description: 'seeded line',
        qty,
        unit: 'pcs',
        unitPrice,
        lineTotal: Math.round(qty * unitPrice * 100) / 100,
      };
    });
    const amount = lines.reduce((s, l) => s + l.lineTotal, 0);
    pos.push({
      _id: randomUUID(),
      number: `PO-${String(30000 + i)}`,
      vendorId: vid,
      vendorName: vendor.name,
      ownerId: randomUUID(),
      ownerName: 'Bench User',
      status,
      deliveryStatus: status === 'Delivered' ? 'Received' : status === 'In Transit' ? 'Shipped' : 'NotShipped',
      amount: Math.round(amount * 100) / 100,
      currency: 'USD',
      eta: '—',
      expectedDate: daysAgo(between(0, 60)),
      deliveredAt: status === 'Delivered' ? daysAgo(between(0, 90)) : undefined,
      lines,
      activityLog: [{ _id: randomUUID(), at: createdAt, actorName: 'Bench User', action: 'po.created' }],
      createdAt,
      updatedAt: daysAgo(between(0, 90)),
    });
  }

  // Purchase requests
  const prs = [];
  for (let i = 0; i < N_PRS; i++) {
    const status = PR_STATUSES[Math.floor(rnd() * PR_STATUSES.length)];
    const createdAt = daysAgo(between(0, 300));
    const itemCount = 1 + Math.floor(rnd() * 3);
    const items = Array.from({ length: itemCount }, () => {
      const qty = 1 + Math.floor(rnd() * 50);
      const price = Math.round(between(5, 500) * 100) / 100;
      return {
        _id: randomUUID(),
        name: `Item ${1 + Math.floor(rnd() * N_PRODUCTS)}`,
        description: 'seeded pr item',
        category: pick(CATEGORIES),
        qty,
        unit: 'pcs',
        estimatedUnitPrice: price,
        lineTotal: Math.round(qty * price * 100) / 100,
      };
    });
    const estimatedTotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const approvalLevels = estimatedTotal >= 25000 ? 3 : estimatedTotal >= 5000 ? 2 : 1;
    const approvalChain = Array.from({ length: approvalLevels }, (_, lv) => ({
      _id: randomUUID(),
      level: lv + 1,
      requiredRole: lv >= 2 ? 'admin' : 'manager',
      status: status === 'Approved' ? 'approved' : status === 'Rejected' ? 'rejected' : 'pending',
      approverId: lv >= 2 ? randomUUID() : randomUUID(),
      approverName: 'Approver',
      actedAt: status === 'Approved' || status === 'Rejected' ? createdAt : undefined,
    }));
    prs.push({
      _id: randomUUID(),
      number: `PR-${String(50000 + i)}`,
      title: `Purchase request ${i + 1}`,
      description: 'seeded pr',
      department: pick(DEPARTMENTS),
      costCenter: `CC-${1 + Math.floor(rnd() * 20)}`,
      requesterId: randomUUID(),
      requesterName: 'Bench Requester',
      status,
      priority: pick(['low', 'normal', 'normal', 'high', 'urgent']),
      neededBy: daysAgo(between(0, 30)),
      currency: 'USD',
      items,
      estimatedTotal: Math.round(estimatedTotal * 100) / 100,
      approvalChain,
      currentLevel: status === 'Approved' ? approvalLevels : status === 'Submitted' || status === 'UnderReview' ? 1 : 0,
      activityLog: [{ _id: randomUUID(), at: createdAt, actorName: 'Bench Requester', action: 'pr.created' }],
      createdAt,
      updatedAt: daysAgo(between(0, 90)),
    });
  }

  // Stock movements (dense recent history for the 14-day trend)
  const movements = [];
  for (let i = 0; i < N_MOVEMENTS; i++) {
    const pid = pick(productIds);
    const wid = pick(whIds);
    const type = MOV_TYPES[Math.floor(rnd() * MOV_TYPES.length)];
    const at = daysAgo(between(0, 30));
    movements.push({
      _id: randomUUID(),
      productId: pid,
      productSku: `SKU-${String(1 + Math.floor(rnd() * N_PRODUCTS)).padStart(5, '0')}`,
      productName: 'Bench Product',
      warehouseId: wid,
      warehouseCode: WAREHOUSES[Math.floor(rnd() * WAREHOUSES.length)].code,
      type,
      qty: 1 + Math.floor(rnd() * 200),
      unitCost: Math.round(between(2, 300) * 100) / 100,
      refType: pick(REF_TYPES),
      refId: randomUUID(),
      refNumber: `REF-${i}`,
      reason: 'seeded movement',
      actorName: 'Bench User',
      at,
    });
  }

  // Notifications
  const notifications = Array.from({ length: 40 }, () => {
    const kind = pick(['pr', 'po', 'grn', 'stock', 'ai', 'system']);
    const read = rnd() > 0.5;
    return {
      _id: randomUUID(),
      userId: null,
      kind,
      severity: pick(['info', 'success', 'warning', 'error']),
      title: `Notification ${kind}`,
      body: 'Seeded notification body',
      link: 'procurement',
      readAt: read ? daysAgo(between(0, 5)) : null,
      createdAt: daysAgo(between(0, 30)),
      updatedAt: daysAgo(between(0, 5)),
    };
  });

  // Users (deterministic password so login benchmarks work)
  const passwordHash = await hashPassword('Bench@123');
  const users = [
    { _id: randomUUID(), email: 'bench.admin@example.com', name: 'Bench Admin', passwordHash, role: 'admin', status: 'active' },
    { _id: randomUUID(), email: 'bench.manager@example.com', name: 'Bench Manager', passwordHash, role: 'manager', status: 'active' },
    { _id: randomUUID(), email: 'bench.buyer@example.com', name: 'Bench Buyer', passwordHash, role: 'buyer', status: 'active' },
  ];

  // Drop + insert (deterministic fresh state)
  const models = [Vendor, Product, Warehouse, StockLevel, PurchaseOrder, PurchaseRequest, StockMovement, User, Notification];
  for (const m of models) await m.deleteMany({});
  await Vendor.insertMany(vendors, { ordered: false });
  await Product.insertMany(products, { ordered: false });
  await Warehouse.insertMany(warehouses, { ordered: false });
  await StockLevel.insertMany(stockLevels, { ordered: false });
  await PurchaseOrder.insertMany(pos, { ordered: false });
  await PurchaseRequest.insertMany(prs, { ordered: false });
  await StockMovement.insertMany(movements, { ordered: false });
  await User.insertMany(users, { ordered: false });
  await Notification.insertMany(notifications, { ordered: false });

  console.log(`Seeded ${BENCH_DB_NAME()}: ${vendors.length} vendors, ${products.length} products, ${warehouses.length} warehouses, ${stockLevels.length} stock levels, ${pos.length} POs, ${prs.length} PRs, ${movements.length} movements, ${notifications.length} notifications, ${users.length} users`);
}

function BENCH_DB_NAME() {
  return process.env.DB_NAME || 'procurio_bench';
}

seed()
  .then(() => disconnect())
  .then(() => process.exit(0))
  .catch((e) => { console.error('SEED FAILED', e); process.exit(1); });