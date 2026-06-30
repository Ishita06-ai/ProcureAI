// Load .env without external deps
import fs from 'node:fs';
import path from 'node:path';
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {}

import { randomUUID } from 'crypto';
import { connectDB } from '../server/config/db.js';
import { Vendor } from '../server/models/vendor.model.js';
import { PurchaseOrder } from '../server/models/purchaseOrder.model.js';
import { PurchaseRequest } from '../server/models/purchaseRequest.model.js';
import { GoodsReceivedNote } from '../server/models/goodsReceivedNote.model.js';
import { Warehouse } from '../server/models/warehouse.model.js';
import { Product } from '../server/models/product.model.js';
import { StockLevel } from '../server/models/stockLevel.model.js';
import { StockMovement } from '../server/models/stockMovement.model.js';
import { User } from '../server/models/user.model.js';
import { hashPassword } from '../server/utils/password.js';

const VENDORS = [
  { name: 'Apex Components Ltd.', category: 'Electronics',  country: 'Germany', spend: 842300, score: 96, status: 'Preferred', risk: 'low' },
  { name: 'Northwind Logistics',  category: 'Logistics',    country: 'USA',     spend: 612400, score: 91, status: 'Active',    risk: 'low' },
  { name: 'Helix Materials Co.',  category: 'Raw Materials',country: 'Vietnam', spend: 528900, score: 87, status: 'Active',    risk: 'medium' },
  { name: 'Kairo Print Works',    category: 'Packaging',    country: 'Japan',   spend: 318200, score: 82, status: 'Active',    risk: 'low' },
  { name: 'Solace Cloud Services',category: 'IT Services',  country: 'Ireland', spend: 296700, score: 78, status: 'Watchlist', risk: 'medium' },
  { name: 'Bramble & Co.',        category: 'Office Supplies', country: 'UK',  spend: 184300, score: 72, status: 'Active',    risk: 'low' },
  { name: 'Orbita Freight',       category: 'Logistics',    country: 'Brazil',  spend: 142800, score: 64, status: 'At Risk',   risk: 'high' },
  { name: 'Lumen Industrial',     category: 'Machinery',    country: 'Sweden',  spend: 121500, score: 89, status: 'Active',    risk: 'low' },
];

const WAREHOUSES = [
  { code: 'HQ-MAIN', name: 'HQ Main Warehouse',     type: 'main',         city: 'Berlin',  country: 'Germany', capacityUnits: 50000, managerName: 'Lena Okafor' },
  { code: 'EU-FRA',  name: 'Frankfurt Distribution',type: 'distribution', city: 'Frankfurt', country: 'Germany', capacityUnits: 30000, managerName: 'Alex Müller' },
  { code: 'US-WEST', name: 'US West Coast Hub',     type: 'distribution', city: 'Oakland', country: 'USA',     capacityUnits: 40000, managerName: 'Jordan Rivera' },
];

const PRODUCTS = [
  { sku: 'MBP-14-M4',  name: 'MacBook Pro 14" M4',         category: 'Electronics',    unit: 'pcs', unitCost: 2050, unitPrice: 2399, reorderLevel: 6,   safetyStock: 12, leadTimeDays: 5 },
  { sku: 'PTZ-CAM-1',  name: 'PTZ Conference Camera Pro',  category: 'Electronics',    unit: 'pcs', unitCost: 1480, unitPrice: 1800, reorderLevel: 4,   safetyStock: 8 },
  { sku: 'ALU-6061',   name: 'Aluminum 6061-T6 Ingot',     category: 'Raw Materials',  unit: 'kg',  unitCost: 7.10, unitPrice: 8.40, reorderLevel: 800, safetyStock: 1200, leadTimeDays: 18 },
  { sku: 'PKG-MAIL-K', name: 'Premium Kraft Mailer',       category: 'Packaging',      unit: 'pcs', unitCost: 0.34, unitPrice: 0.42, reorderLevel: 2500,safetyStock: 5000 },
  { sku: 'PKG-TIS-BR', name: 'Branded Tissue Insert',      category: 'Packaging',      unit: 'pcs', unitCost: 0.06, unitPrice: 0.08, reorderLevel: 3000,safetyStock: 6000 },
  { sku: 'COMP-HV-C',  name: 'HVAC Compressor Unit C',     category: 'Machinery',      unit: 'pcs', unitCost: 3700, unitPrice: 4200, reorderLevel: 2,   safetyStock: 4,  leadTimeDays: 14 },
  { sku: 'COOL-50L',   name: 'Coolant Drum 50L',           category: 'Machinery',      unit: 'drum',unitCost: 180,  unitPrice: 220,  reorderLevel: 8,   safetyStock: 16, expiryTrackable: true, batchTrackable: true },
  { sku: 'HOOD-EMB',   name: 'Heavyweight Hoodie, Embroidered', category: 'Office Supplies', unit: 'pcs', unitCost: 32, unitPrice: 38, reorderLevel: 50, safetyStock: 100 },
  { sku: 'NB-HC-BR',   name: 'Hardcover Notebook, Branded',category: 'Office Supplies',unit: 'pcs', unitCost: 7.20, unitPrice: 9, reorderLevel: 50, safetyStock: 100 },
  { sku: 'PAPER-A4-X', name: 'Premium A4 Paper 80gsm',     category: 'Office Supplies',unit: 'ream',unitCost: 4.20, unitPrice: 5.20, reorderLevel: 100, safetyStock: 200 },
];

// productSku → distribution of stock across warehouses [hq, fra, us]
const STOCK_DIST = {
  'MBP-14-M4':  [18, 6,  4],
  'PTZ-CAM-1':  [10, 3,  2],
  'ALU-6061':   [3200, 0, 1600],
  'PKG-MAIL-K': [8400, 4200, 0],
  'PKG-TIS-BR': [2200, 1100, 0],   // low stock
  'COMP-HV-C':  [1, 0, 1],          // critically low
  'COOL-50L':   [22, 8, 6],
  'HOOD-EMB':   [240, 60, 30],
  'NB-HC-BR':   [180, 80, 40],
  'PAPER-A4-X': [60, 30, 20],       // low stock
};

function buildChain(amount) {
  const chain = [{ level: 1, requiredRole: 'manager', status: 'pending' }];
  if (amount >= 5000)  chain.push({ level: 2, requiredRole: 'manager', status: 'pending' });
  if (amount >= 25000) chain.push({ level: 3, requiredRole: 'admin',   status: 'pending' });
  return chain;
}

function pr({ number, title, description, department, priority, items, status, currentLevel, requesterName, neededInDays, selected, approvedLevels = 0, rejectedAt, poNumber, comments = [], quotesForVendors }) {
  const itemsFull = items.map(it => ({ ...it, lineTotal: it.qty * it.estimatedUnitPrice }));
  const total = itemsFull.reduce((s, l) => s + l.lineTotal, 0);
  const chain = buildChain(total);
  for (let i = 0; i < approvedLevels; i++) {
    chain[i].status = 'approved';
    chain[i].approverName = i % 2 === 0 ? 'Ishita R' : 'Alex Müller';
    chain[i].actedAt = new Date(Date.now() - (approvedLevels - i) * 6 * 3600 * 1000);
    chain[i].comment = i === 0 ? 'Looks good, aligns with Q3 budget.' : 'Approved within finance threshold.';
  }
  if (rejectedAt !== undefined && chain[rejectedAt]) {
    chain[rejectedAt].status = 'rejected';
    chain[rejectedAt].approverName = 'Ishita R';
    chain[rejectedAt].actedAt = new Date();
    chain[rejectedAt].comment = 'Reconsider vendor — sourcing alternatives.';
  }
  const vendorQuotes = (quotesForVendors || []).map(q => ({
    _id: randomUUID(), vendorId: q.vendor._id, vendorName: q.vendor.name,
    amount: q.amount, leadTimeDays: q.leadTimeDays, notes: q.notes, submittedAt: new Date(),
  }));
  return {
    number, title, description, department, priority, status, currentLevel,
    requesterName, requesterId: 'seed',
    neededBy: new Date(Date.now() + neededInDays * 86400000),
    items: itemsFull, estimatedTotal: total,
    approvalChain: chain, vendorQuotes,
    selectedVendorId: selected?._id, selectedVendorName: selected?.name,
    selectedQuoteAmount: selected ? (vendorQuotes.find(q => q.vendorId === selected._id)?.amount || total) : undefined,
    poNumber, poId: poNumber ? randomUUID() : undefined,
    comments: comments.map(c => ({ _id: randomUUID(), userName: c.who, text: c.text, internal: !!c.internal, at: new Date(Date.now() - c.minsAgo * 60000) })),
    activityLog: [
      { _id: randomUUID(), at: new Date(Date.now() - 2 * 86400000), actorName: requesterName, action: 'pr.created' },
      ...(status !== 'Draft' ? [{ _id: randomUUID(), at: new Date(Date.now() - 1.5 * 86400000), actorName: requesterName, action: 'pr.submitted' }] : []),
      ...chain.filter(s => s.actedAt).map(s => ({ _id: randomUUID(), at: s.actedAt, actorName: s.approverName, action: s.status === 'approved' ? 'pr.approvedLevel' : 'pr.rejected', meta: { level: s.level } })),
    ],
  };
}

async function run() {
  await connectDB();
  console.log('Connected. Reseeding…');
  await Promise.all([
    Vendor.deleteMany({}), PurchaseOrder.deleteMany({}), PurchaseRequest.deleteMany({}),
    GoodsReceivedNote.deleteMany({}), Warehouse.deleteMany({}), Product.deleteMany({}),
    StockLevel.deleteMany({}), StockMovement.deleteMany({}), User.deleteMany({}),
  ]);

  const vendors = await Vendor.insertMany(VENDORS);
  const byName = Object.fromEntries(vendors.map(v => [v.name, v]));
  console.log(`Vendors: ${vendors.length}`);

  // Warehouses + Products + Stock
  const warehouses = await Warehouse.insertMany(WAREHOUSES);
  console.log(`Warehouses: ${warehouses.length}`);
  const byCode = Object.fromEntries(warehouses.map(w => [w.code, w]));

  const products = await Product.insertMany(PRODUCTS.map(p => ({
    ...p, defaultVendorId: vendors.find(v => v.category === p.category)?._id,
    defaultVendorName: vendors.find(v => v.category === p.category)?.name,
  })));
  console.log(`Products: ${products.length}`);
  const bySku = Object.fromEntries(products.map(p => [p.sku, p]));

  // Initial stock levels + a stock-in movement for each
  const levels = [];
  const movements = [];
  const dt0 = new Date(Date.now() - 30 * 86400000);
  for (const [sku, dist] of Object.entries(STOCK_DIST)) {
    const p = bySku[sku];
    if (!p) continue;
    const whs = [byCode['HQ-MAIN'], byCode['EU-FRA'], byCode['US-WEST']];
    for (let i = 0; i < whs.length; i++) {
      const qty = dist[i];
      if (qty === 0) continue;
      levels.push({ productId: p._id, warehouseId: whs[i]._id, onHand: qty, reserved: 0 });
      movements.push({
        productId: p._id, productSku: p.sku, productName: p.name,
        warehouseId: whs[i]._id, warehouseCode: whs[i].code,
        type: 'IN', qty, unitCost: p.unitCost,
        refType: 'Manual', reason: 'Opening balance',
        actorName: 'system', at: new Date(dt0.getTime() + i * 3600000),
      });
    }
  }
  await StockLevel.insertMany(levels);
  await StockMovement.insertMany(movements);
  console.log(`Stock levels: ${levels.length}, movements: ${movements.length}`);

  // PRs
  const PRS = [
    pr({ number: 'PR-20431', title: 'Q3 Packaging Refresh', description: 'Refresh primary & secondary packaging across all SKUs ahead of holiday season.',
      department: 'Operations', priority: 'high', requesterName: 'Sasha Patel', neededInDays: 21,
      status: 'Draft', currentLevel: 0,
      items: [
        { name: 'Premium kraft mailers', qty: 5000, unit: 'pcs', estimatedUnitPrice: 0.42, category: 'Packaging' },
        { name: 'Tissue inserts, branded', qty: 5000, unit: 'pcs', estimatedUnitPrice: 0.08, category: 'Packaging' },
      ],
    }),
    pr({ number: 'PR-20502', title: 'Datacenter cooling spares', description: 'Critical spares for HVAC units in DC-East.',
      department: 'IT', priority: 'urgent', requesterName: 'Jordan Rivera', neededInDays: 7,
      status: 'Submitted', currentLevel: 1,
      items: [
        { name: 'Compressor unit type C', qty: 2, unit: 'pcs', estimatedUnitPrice: 4200, category: 'Machinery' },
        { name: 'Coolant 50L drum', qty: 6, unit: 'drum', estimatedUnitPrice: 220, category: 'Machinery' },
      ],
      quotesForVendors: [
        { vendor: byName['Lumen Industrial'], amount: 9450, leadTimeDays: 9, notes: 'Stock available, EU shipping.' },
      ],
    }),
    pr({ number: 'PR-20567', title: 'New laptops for Q4 hires', description: '12 MacBook Pro 14" for engineering onboarding.',
      department: 'IT', priority: 'normal', requesterName: 'Ishita R', neededInDays: 14,
      status: 'UnderReview', currentLevel: 2, approvedLevels: 1,
      items: [{ name: 'MacBook Pro 14" M4', qty: 12, unit: 'pcs', estimatedUnitPrice: 2399, category: 'Electronics' }],
      quotesForVendors: [
        { vendor: byName['Apex Components Ltd.'], amount: 28100, leadTimeDays: 5, notes: 'Volume discount applied.' },
        { vendor: byName['Solace Cloud Services'], amount: 29400, leadTimeDays: 7, notes: 'Includes 2-year warranty.' },
      ],
      selected: byName['Apex Components Ltd.'],
    }),
    pr({ number: 'PR-20612', title: 'Raw aluminum stock — Q4', description: '4,200 kg aluminum 6061-T6 for Q4 production run.',
      department: 'Manufacturing', priority: 'normal', requesterName: 'Lena Okafor', neededInDays: 28,
      status: 'Approved', currentLevel: 3, approvedLevels: 3,
      items: [{ name: 'Aluminum 6061-T6 ingot', qty: 4200, unit: 'kg', estimatedUnitPrice: 8.4, category: 'Raw Materials' }],
      quotesForVendors: [{ vendor: byName['Helix Materials Co.'], amount: 34020, leadTimeDays: 18, notes: 'CIF Hamburg.' }],
      selected: byName['Helix Materials Co.'],
    }),
    pr({ number: 'PR-20640', title: 'Branded merch for partner summit', description: 'Premium hoodies + notebooks for 250 attendees.',
      department: 'Marketing', priority: 'low', requesterName: 'Sasha Patel', neededInDays: 35,
      status: 'Approved', currentLevel: 2, approvedLevels: 2,
      items: [
        { name: 'Heavyweight hoodie, embroidered', qty: 250, unit: 'pcs', estimatedUnitPrice: 38, category: 'Office Supplies' },
        { name: 'Hardcover notebook, branded', qty: 250, unit: 'pcs', estimatedUnitPrice: 9, category: 'Office Supplies' },
      ],
      quotesForVendors: [{ vendor: byName['Bramble & Co.'], amount: 11800, leadTimeDays: 14, notes: 'Includes free shipping.' }],
      selected: byName['Bramble & Co.'],
    }),
    pr({ number: 'PR-20678', title: 'High-end conference cameras', description: 'PTZ cameras for new HQ meeting rooms.',
      department: 'Facilities', priority: 'normal', requesterName: 'Jordan Rivera', neededInDays: 12,
      status: 'Rejected', currentLevel: 2, approvedLevels: 1, rejectedAt: 1,
      items: [{ name: 'PTZ camera Pro', qty: 8, unit: 'pcs', estimatedUnitPrice: 1800, category: 'Electronics' }],
    }),
  ];
  const insertedPRs = await PurchaseRequest.insertMany(PRS);
  console.log(`Purchase requests: ${insertedPRs.length}`);

  // POs (include line items with SKUs so GRN can flow into inventory)
  const owners = ['Ishita R', 'Sasha Patel', 'Jordan Rivera', 'Lena Okafor', 'Alex Müller'];
  const poDefs = [
    { number: 'PO-10293', vendor: 'Apex Components Ltd.', status: 'Approved',   amount: 84200, lines: [{ sku: 'MBP-14-M4', qty: 35, unitPrice: 2050 }] },
    { number: 'PO-10294', vendor: 'Northwind Logistics',  status: 'In Transit', amount: 12450, eta: '2 days', deliveryStatus: 'Shipped', lines: [{ sku: 'PAPER-A4-X', qty: 800, unitPrice: 4.2 }] },
    { number: 'PO-10295', vendor: 'Helix Materials Co.',  status: 'Pending',    amount: 47210, lines: [{ sku: 'ALU-6061', qty: 5600, unitPrice: 8.4 }] },
    { number: 'PO-10296', vendor: 'Kairo Print Works',    status: 'Approved',   amount: 9320,  lines: [{ sku: 'PKG-MAIL-K', qty: 18000, unitPrice: 0.34 }] },
    { number: 'PO-10297', vendor: 'Solace Cloud Services',status: 'Pending',    amount: 28800, lines: [{ sku: 'NB-HC-BR', qty: 320, unitPrice: 7.2 }] },
    { number: 'PO-10298', vendor: 'Bramble & Co.',        status: 'Delivered',  amount: 65400, deliveryStatus: 'Received', deliveredAt: new Date(Date.now() - 5 * 86400000), lines: [{ sku: 'HOOD-EMB', qty: 250, unitPrice: 32 }, { sku: 'NB-HC-BR', qty: 250, unitPrice: 7.2 }] },
  ];
  const pos = [];
  for (let i = 0; i < poDefs.length; i++) {
    const d = poDefs[i];
    const v = vendors.find(x => x.name === d.vendor);
    pos.push({
      number: d.number, vendorId: v._id, vendorName: v.name,
      ownerName: owners[i % owners.length], ownerId: 'seed',
      status: d.status, amount: d.amount,
      deliveryStatus: d.deliveryStatus || 'NotShipped',
      deliveredAt: d.deliveredAt,
      eta: d.eta || (d.status === 'Delivered' ? 'Done' : d.status === 'Pending' ? '—' : `${(i % 5) + 1} days`),
      lines: d.lines.map(l => ({ ...l, description: bySku[l.sku]?.name || l.sku, lineTotal: l.qty * l.unitPrice })),
      activityLog: [{ _id: randomUUID(), at: new Date(), actorName: owners[i % owners.length], action: 'po.created' }],
    });
  }
  const insertedPOs = await PurchaseOrder.insertMany(pos);
  console.log(`Purchase orders: ${insertedPOs.length}`);

  // GRN for the delivered PO — also generate stock-in movements
  const delivered = insertedPOs.find(p => p.status === 'Delivered');
  if (delivered) {
    const grn = await GoodsReceivedNote.create({
      number: 'GRN-50231', poId: delivered._id, poNumber: delivered.number,
      vendorId: delivered.vendorId, vendorName: delivered.vendorName,
      receivedByName: 'Lena Okafor', receivedById: 'seed',
      status: 'Received',
      lines: delivered.lines.map(l => ({ sku: l.sku, description: l.description, qtyOrdered: l.qty, qtyReceived: l.qty, condition: 'good' })),
      notes: 'Delivered ahead of schedule.',
    });
    // Mirror as stock-in movements at HQ-MAIN (and increment levels — already in opening balance, so this is purely an audit trail event)
    for (const line of grn.lines) {
      const p = bySku[line.sku];
      if (!p) continue;
      const wh = byCode['HQ-MAIN'];
      await StockMovement.create({
        productId: p._id, productSku: p.sku, productName: p.name,
        warehouseId: wh._id, warehouseCode: wh.code,
        type: 'IN', qty: line.qtyReceived, unitCost: p.unitCost,
        refType: 'GRN', refId: grn._id, refNumber: grn.number,
        reason: `Receipt against ${delivered.number}`,
        actorName: 'Lena Okafor', at: delivered.deliveredAt,
      });
      const lvl = await StockLevel.findOne({ productId: p._id, warehouseId: wh._id }) ||
                  await StockLevel.create({ productId: p._id, warehouseId: wh._id, onHand: 0 });
      lvl.onHand += line.qtyReceived;
      lvl.lastMovementAt = delivered.deliveredAt;
      await lvl.save();
    }
    console.log('GRN: 1 with stock-in hooks');
  }

  const admin = await User.create({
    email: 'admin@procurio.app', name: 'Ishita Rander', role: 'admin',
    passwordHash: await hashPassword('procurio123'),
  });
  console.log(`Admin: ${admin.email} / procurio123`);
  console.log('Done.');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
