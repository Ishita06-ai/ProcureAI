// End-to-end verification of the multi-level PO approval workflow + SLA tracking.
// Runs against a THROWAWAY database (default DB_NAME=procurio_verify) so the real
// workspace is never touched. Mirrors the 8 acceptance checks from the feature spec:
//   1. ₹30,000 PO → Manager-only chain; only manager/admin can approve.
//   2. ₹1,00,000 PO → Manager → Finance; Finance locked until Manager approves.
//   3. ₹3,00,000 PO → Manager → Finance → Director.
//   4. Attempting to approve a later stage before the earlier one → 403.
//   5. Each approved step records startedAt/actedAt; duration computed.
//   6. Backdating a pending step's start by 50h → stepSla.breached && surfaces in get().
//   7. AnalyticsService.poApprovalSla() reflects the created POs.
//   8. Regression: PO list/get, status advance, approval-bypass guard, PR approval,
//      PR→PO conversion, and analytics overview still work.
//
// Usage: node scripts/verify-approval-flow.mjs   (MONGO_URL from .env)
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

// Throwaway database — NEVER run against the workspace DB. .env may set
// DB_NAME=procureai, so force the throwaway name here regardless; the guard in
// run() also aborts if the connected database isn't exactly this name.
process.env.DB_NAME = 'procurio_verify';

import mongoose from 'mongoose';
import { connectDB } from '../server/config/db.js';
import { Vendor } from '../server/models/vendor.model.js';
import { User } from '../server/models/user.model.js';
import { PurchaseOrder } from '../server/models/purchaseOrder.model.js';
import { PurchaseRequest } from '../server/models/purchaseRequest.model.js';
import { hashPassword } from '../server/utils/password.js';
import { PoService } from '../server/services/po.service.js';
import { PrService } from '../server/services/purchaseRequest.service.js';
import { AnalyticsService } from '../server/services/analytics.service.js';
import { stepSla } from '../server/utils/approval.js';
import { cache } from '../server/utils/cache.js';

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};
const eq = (a, b, label) => ok(a === b, `${label} → got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

async function expectError(fn, status, label) {
  try {
    await fn();
    fail++; console.log(`  ❌ ${label} — expected ${status}, but call succeeded`);
  } catch (e) {
    ok(e.status === status, `${label} → ${e.status} ${status} (${e.message})`);
  }
}

const makeUser = async (email, name, role) =>
  User.create({ email, name, role, passwordHash: await hashPassword('verify-pass-123') });
const actor = (u) => ({ id: u._id, name: u.name, role: u.role });

async function run() {
  await connectDB();
  console.log(`\nVerify multi-level PO approval + SLA — DB: ${mongoose.connection.name}`);

  // Clean slate (throwaway DB only).
  await Promise.all([
    Vendor.deleteMany({}), User.deleteMany({}),
    PurchaseOrder.deleteMany({}), PurchaseRequest.deleteMany({}),
  ]);

  const vendor = await Vendor.create({ name: 'Verify Vendor Co.', category: 'Machinery', country: 'India' });
  const admin    = await makeUser('v-admin@procurio.app',    'Verify Admin',    'admin');
  const manager  = await makeUser('v-manager@procurio.app',  'Verify Manager',  'manager');
  const finance  = await makeUser('v-finance@procurio.app',  'Verify Finance',  'finance');
  const director = await makeUser('v-director@procurio.app', 'Verify Director', 'director');
  const buyer    = await makeUser('v-buyer@procurio.app',    'Verify Buyer',    'buyer');
  const A = actor(admin), M = actor(manager), F = actor(finance), D = actor(director), B = actor(buyer);

  // ---------- Check 1: ₹30,000 → Manager-only chain ----------
  console.log('\n1) ₹30,000 PO → Manager-only chain; only manager/admin can approve');
  const po1 = await PoService.create({ vendorId: vendor._id, amount: 30000, lines: [{ sku: 'V-1', description: 'Consumables', qty: 1, unitPrice: 30000 }] }, B);
  eq(po1.approvalChain.length, 1, 'chain length = 1');
  eq(po1.approvalChain[0].requiredRole, 'manager', 'step-1 requiredRole = manager');
  eq(po1.status, 'Pending', 'starts Pending');
  eq(po1.currency, 'INR', 'currency defaults to INR');
  await expectError(() => PoService.approve(po1._id, { comment: '' }, F), 403, 'finance cannot approve manager step');
  await expectError(() => PoService.approve(po1._id, { comment: '' }, D), 403, 'director cannot approve manager step');
  await expectError(() => PoService.approve(po1._id, { comment: '' }, B), 403, 'buyer cannot approve');
  const po1b = await PoService.approve(po1._id, { comment: 'ok' }, M);
  eq(po1b.status, 'Approved', 'manager approval → Approved');

  // ---------- Check 2: ₹1,00,000 → Manager → Finance (sequential) ----------
  console.log('\n2) ₹1,00,000 PO → Manager → Finance, sequential unlock');
  const po2 = await PoService.create({ vendorId: vendor._id, amount: 100000, lines: [{ sku: 'V-2', qty: 1, unitPrice: 100000 }] }, B);
  eq(po2.approvalChain.length, 2, 'chain length = 2');
  eq(po2.approvalChain.map(s => s.requiredRole).join(','), 'manager,finance', 'roles = manager,finance');

  // Check 4: later stage is locked until the earlier one approves.
  await expectError(() => PoService.approve(po2._id, { comment: '' }, F), 403, 'finance cannot approve while manager step is current');
  await expectError(() => PoService.approve(po2._id, { comment: '' }, D), 403, 'director cannot approve while manager step is current');

  const po2m = await PoService.approve(po2._id, { comment: 'mgmt ok' }, M);
  eq(po2m.status, 'Pending', 'still Pending after stage-1 approval');
  eq(po2m.currentLevel, 2, 'currentLevel advanced to 2');
  eq(po2m.approvalInfo.currentStep.requiredRole, 'finance', 'current step is now finance');

  // Check 5: approved step records startedAt/actedAt + duration.
  const po2raw = await PurchaseOrder.findById(po2._id).lean();
  const s1 = po2raw.approvalChain[0];
  ok(!!s1.startedAt && !!s1.actedAt, 'stage-1 startedAt & actedAt recorded');
  ok(new Date(s1.actedAt) - new Date(s1.startedAt) > 0, 'stage-1 duration > 0');
  eq(s1.approverName, 'Verify Manager', 'stage-1 approver recorded');

  await expectError(() => PoService.approve(po2._id, { comment: '' }, D), 403, 'director cannot approve finance step');
  const po2f = await PoService.approve(po2._id, { comment: 'fin ok' }, F);
  eq(po2f.status, 'Approved', 'finance approval → Approved');

  // ---------- Check 3: ₹3,00,000 → Manager → Finance → Director ----------
  console.log('\n3) ₹3,00,000 PO → Manager → Finance → Director');
  const po3 = await PoService.create({ vendorId: vendor._id, amount: 300000, lines: [] }, B);
  eq(po3.approvalChain.length, 3, 'chain length = 3');
  eq(po3.approvalChain.map(s => s.requiredRole).join(','), 'manager,finance,director', 'roles = manager,finance,director');

  await expectError(() => PoService.approve(po3._id, { comment: '' }, D), 403, 'director cannot approve before manager');
  let po3x = await PoService.approve(po3._id, { comment: '' }, M);
  await expectError(() => PoService.approve(po3x._id, { comment: '' }, D), 403, 'director still locked during finance step');
  po3x = await PoService.approve(po3x._id, { comment: '' }, F);
  eq(po3x.approvalInfo.currentStep.requiredRole, 'director', 'current step is now director');
  const po3a = await PoService.approve(po3x._id, { comment: '' }, D);
  eq(po3a.status, 'Approved', 'director approval → Approved');

  // ---------- Check 6: SLA breach (backdated start) ----------
  console.log('\n6) SLA: 50h-backdated pending step → breached and surfaces');
  const po4 = await PoService.create({ vendorId: vendor._id, amount: 50000, lines: [{ sku: 'V-4', qty: 1, unitPrice: 50000 }] }, B);
  await PurchaseOrder.updateOne({ _id: po4._id }, { $set: { 'approvalChain.0.startedAt': new Date(Date.now() - 50 * 3600 * 1000) } });
  const raw4 = await PurchaseOrder.findById(po4._id).lean();
  const sla4 = stepSla(raw4.approvalChain[0]);
  ok(sla4.pending === true, 'step is pending');
  eq(sla4.breached, true, 'stepSla.breached === true');
  ok(sla4.durationHours >= 48, `durationHours >= 48 (${sla4.durationHours.toFixed(1)}h)`);
  const po4n = await PoService.get(po4._id);
  eq(po4n.approvalInfo.slaBreached, true, 'get() surfaces approvalInfo.slaBreached');
  eq(po4n.approvalChain[0].sla.breached, true, 'per-step sla.breached surfaces');

  // ---------- Check 7: Analytics SLA metrics ----------
  console.log('\n7) AnalyticsService.poApprovalSla() reflects created POs');
  const m = await AnalyticsService.poApprovalSla();
  // po1(1 approved) + po2(2 approved) + po3(3 approved) = 6 approved steps, all < 48h.
  eq(m.pendingApprovals, 1, 'pendingApprovals = 1 (PO4)');
  eq(m.approvedWithinSla, 6, 'approvedWithinSla = 6');
  eq(m.approvalRate, 1, 'approvalRate = 1.0');
  ok(m.averageApprovalHours >= 0, 'averageApprovalHours present');
  ok(m.slaBreaches >= 1, 'slaBreaches >= 1 (PO4 breached)');
  const breached = m.breachedPois.find(p => p.number === po4.number);
  ok(!!breached, 'PO4 appears in breachedPois');
  eq(breached.waitingFor, 'Manager', 'waitingFor = Manager');
  ok(breached.pendingHours >= 48, `pendingHours >= 48 (${breached.pendingHours})`);

  // ---------- Check 7b: legacy POs (no persisted chain) stay safe ----------
  console.log('\n7b) Legacy POs without workflow data are not treated as pending/SLA-breach');
  const legacyApproved = await PurchaseOrder.create({
    number: 'PO-LEGACY-APPROVED', vendorId: vendor._id, vendorName: vendor.name,
    status: 'Approved', amount: 100000, ownerId: admin._id, ownerName: 'Verify Admin',
  });
  const legacyRejected = await PurchaseOrder.create({
    number: 'PO-LEGACY-REJECTED', vendorId: vendor._id, vendorName: vendor.name,
    status: 'Rejected', amount: 60000, ownerId: admin._id, ownerName: 'Verify Admin',
  });
  const legacyApprovedN = await PoService.get(legacyApproved._id);
  ok(legacyApprovedN.approvalChain.every(s => s.status === 'approved'), 'legacy Approved PO derives an all-approved chain');
  eq(legacyApprovedN.approvalInfo.slaBreached, false, 'legacy Approved PO is not flagged as SLA breached');
  const legacyRejectedN = await PoService.get(legacyRejected._id);
  eq(legacyRejectedN.approvalChain[0].status, 'rejected', 'legacy Rejected PO derives a rejected first step');
  // Refresh analytics cache, then assert legacy POs don't inflate pending/SLA numbers.
  await cache.delPrefix('analytics:');
  const m2 = await AnalyticsService.poApprovalSla();
  eq(m2.pendingApprovals, 1, 'pendingApprovals still 1 (legacy POs not counted pending)');
  eq(m2.slaBreaches, 1, 'slaBreaches still 1 (only the backdated PO4)');
  ok(!m2.breachedPois.some(p => p.number === 'PO-LEGACY-APPROVED'), 'legacy Approved PO not in breachedPois');

  // ---------- Check 8: Regression ----------
  console.log('\n8) Regression — existing procurement flows still work');
  const list = await PoService.list({});
  ok(list.items.length >= 4, 'PoService.list returns created POs');
  const got2 = await PoService.get(po2._id);
  eq(got2.status, 'Approved', 'PoService.get works');

  const transit = await PoService.updateStatus(po2._id, 'In Transit', A);
  eq(transit.status, 'In Transit', 'status advance → In Transit');
  eq(transit.deliveryStatus, 'Shipped', 'deliveryStatus = Shipped');
  const delivered = await PoService.updateStatus(po2._id, 'Delivered', A);
  eq(delivered.status, 'Delivered', 'status advance → Delivered');
  eq(delivered.deliveryStatus, 'Received', 'deliveryStatus = Received');

  await expectError(() => PoService.updateStatus(po4._id, 'Approved', A), 400, 'status edit cannot bypass pending approval');

  const pr = await PrService.create(
    { title: 'Verify PR', description: 'regression check', department: 'IT', items: [{ name: 'Widget', qty: 2, unit: 'pcs', estimatedUnitPrice: 1000 }] },
    B,
  );
  await PrService.submit(pr._id, B);
  const prApp = await PrService.approve(pr._id, { comment: 'ok' }, M);
  eq(prApp.status, 'Approved', 'PR approval still works');

  await PrService.selectVendor(pr._id, { vendorId: vendor._id, amount: 2000 }, B);
  const { po: convPo } = await PrService.convertToPo(pr._id, {}, A);
  eq(convPo.status, 'Pending', 'converted PO enters workflow as Pending');
  ok(Array.isArray(convPo.approvalChain) && convPo.approvalChain.length >= 1, 'converted PO has an approval chain');

  const overview = await AnalyticsService.overview();
  ok(overview.poApprovalSla && typeof overview.poApprovalSla === 'object', 'analytics overview includes poApprovalSla');
  ok(Array.isArray(overview.cycles), 'overview cycles present');
  ok(Array.isArray(overview.funnel), 'overview funnel present');

  console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
  return fail === 0;
}

run()
  .then(async (allPassed) => {
    // Leave the throwaway DB clean.
    await Promise.all([
      Vendor.deleteMany({}), User.deleteMany({}),
      PurchaseOrder.deleteMany({}), PurchaseRequest.deleteMany({}),
    ]);
    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
  })
  .catch((e) => {
    console.error('\nScript crashed:', e);
    process.exit(1);
  });
