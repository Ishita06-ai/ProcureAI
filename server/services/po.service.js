import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { Vendor } from '../models/vendor.model.js';
import { User } from '../models/user.model.js';
import { notFound, badRequest, forbidden } from '../utils/apiError.js';
import { EmailNotify } from './emailNotify.service.js';
import {
  buildPoApprovalChain, canApproveStep, stepSla, deriveApprovalChain, PO_ROLE_LABELS,
} from '../utils/approval.js';

function nextNumber() { return `PO-${10000 + Math.floor(Math.random() * 90000)}`; }

// Attach derived approval/SLA info to a plain PO object for the API response.
// Never persists — legacy POs missing a chain get one derived on the fly so the
// UI can render stages + SLA without a data migration.
function normalizePo(po) {
  if (!po) return po;
  const chain = (deriveApprovalChain(po) || []).map(step => ({ ...step, sla: stepSla(step) }));
  po.approvalChain = chain;
  po.currentLevel = po.currentLevel || 1;
  const current = chain[(po.currentLevel || 1) - 1] || null;
  po.approvalInfo = {
    currentStep: current,
    currentRoleLabel: current ? (PO_ROLE_LABELS[current.requiredRole] || current.requiredRole) : null,
    slaBreached: !!(current && current.sla && current.sla.breached),
    allApproved: po.status === 'Approved',
  };
  return po;
}

export const PoService = {
  async list({ q, status, page, limit, skip, sort = '-createdAt' }) {
    const filter = {};
    if (q) filter.$or = [
      { number: new RegExp(q, 'i') },
      { vendorName: new RegExp(q, 'i') },
      { ownerName: new RegExp(q, 'i') },
    ];
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      PurchaseOrder.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      PurchaseOrder.countDocuments(filter),
    ]);
    return { items: items.map(normalizePo), total };
  },

  async get(id) {
    const po = await PurchaseOrder.findById(id).lean();
    if (!po) throw notFound('PO not found');
    return normalizePo(po);
  },

  async create(data, actor) {
    const vendor = await Vendor.findById(data.vendorId).lean();
    if (!vendor) throw badRequest('vendorId does not exist');
    const lines = (data.lines || []).map(l => ({
      ...l, lineTotal: (l.qty || 0) * (l.unitPrice || 0),
    }));
    const amount = data.amount ?? lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
    // Every PO enters the amount-based approval workflow, regardless of any
    // status hint passed in.
    const approvalChain = buildPoApprovalChain(amount);
    approvalChain[0].startedAt = new Date();
    const po = await PurchaseOrder.create({
      number: nextNumber(),
      vendorId: vendor._id, vendorName: vendor.name,
      ownerId: actor?.id, ownerName: actor?.name,
      status: 'Pending',
      amount, currency: 'INR', lines, notes: data.notes,
      approvalChain,
      currentLevel: 1,
      activityLog: [{ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.created' }],
    });
    return normalizePo(po.toObject());
  },

  // Lazy, idempotent backfill: Pending POs created before this feature (no
  // approvalChain) are brought into the workflow on first write. Non-Pending
  // POs are left untouched so existing data keeps working as before.
  async ensureApprovalChain(po) {
    if (po.approvalChain && po.approvalChain.length > 0) return po;
    if (po.status !== 'Pending') return po;
    const chain = buildPoApprovalChain(po.amount);
    chain[0].startedAt = po.createdAt || new Date();
    po.approvalChain = chain;
    po.currentLevel = 1;
    po.markModified('approvalChain');
    await po.save();
    return po;
  },

  async updateStatus(id, status, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    // Direct status edits must not bypass a pending approval. Only the
    // approve/reject endpoints can move a PO into Approved/Rejected.
    if (status === 'Approved' || status === 'Rejected') {
      await this.ensureApprovalChain(po);
      const current = po.approvalChain?.[(po.currentLevel || 1) - 1];
      if (current && current.status === 'pending') {
        throw badRequest(`PO ${po.number} is awaiting ${PO_ROLE_LABELS[current.requiredRole] || current.requiredRole} approval — use the approval workflow to approve or reject.`);
      }
    }
    const prev = po.status;
    po.status = status;
    if (status === 'In Transit') po.deliveryStatus = 'Shipped';
    if (status === 'Delivered') { po.deliveryStatus = 'Received'; po.deliveredAt = new Date(); }
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.statusChange', meta: { from: prev, to: status } });
    await po.save();

    if (['In Transit', 'Delivered', 'Cancelled'].includes(status) && po.ownerId) {
      const owner = await User.findById(po.ownerId).select('email').lean();
      EmailNotify.notifyAndEmail({
        to: owner?.email, userId: po.ownerId, kind: 'po',
        severity: status === 'Cancelled' ? 'warning' : 'info',
        title: `${po.number} is now ${status}`,
        body: `Purchase order ${po.number} with ${po.vendorName} changed from ${prev} to ${status}.`,
        link: 'procurement', meta: { poId: po._id, poNumber: po.number, from: prev, to: status },
      }).catch(() => {});
    }

    return normalizePo(po.toObject());
  },

  async approve(id, { comment }, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    if (po.status !== 'Pending') throw badRequest(`Cannot approve from status ${po.status}`);
    await this.ensureApprovalChain(po);

    const idx = (po.currentLevel || 1) - 1;
    const step = po.approvalChain[idx];
    if (!step) throw badRequest('No pending approval step');
    if (!canApproveStep(actor.role, step)) throw forbidden(`Requires role: ${step.requiredRole}`);

    step.status = 'approved';
    step.approverId = actor.id;
    step.approverName = actor.name;
    step.actedAt = new Date();
    step.comment = comment;
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.approvalLevel', meta: { level: step.level, role: step.requiredRole } });

    if (po.currentLevel >= po.approvalChain.length) {
      // Final stage approved — the whole PO is approved.
      po.status = 'Approved';
      po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.approved' });
      po.markModified('approvalChain');
      await po.save();

      const owner = po.ownerId ? await User.findById(po.ownerId).select('email').lean() : null;
      EmailNotify.notifyAndEmail({
        to: owner?.email, userId: po.ownerId, kind: 'po', severity: 'success',
        title: `${po.number} fully approved`,
        body: `Purchase order ${po.number} (${po.vendorName}, ${po.amount?.toLocaleString('en-IN')}) passed all approvals.`,
        link: 'procurement', meta: { poId: po._id, poNumber: po.number },
      }).catch(() => {});
    } else {
      // Unlock the next stage only after this one approves.
      po.currentLevel += 1;
      po.approvalChain[po.currentLevel - 1].startedAt = new Date();
      po.markModified('approvalChain');
      await po.save();

      const nextStep = po.approvalChain[po.currentLevel - 1];
      if (nextStep) {
        EmailNotify.emailUsersWithRole([nextStep.requiredRole], {
          kind: 'po',
          title: `Approval needed: ${po.number}`,
          body: `PO ${po.number} with ${po.vendorName} advanced to ${PO_ROLE_LABELS[nextStep.requiredRole]} approval.`,
          link: 'procurement', meta: { poId: po._id, poNumber: po.number },
        }).catch(() => {});
      }
    }

    return normalizePo(po.toObject());
  },

  async reject(id, { comment }, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    if (po.status !== 'Pending') throw badRequest(`Cannot reject from status ${po.status}`);
    await this.ensureApprovalChain(po);

    const idx = (po.currentLevel || 1) - 1;
    const step = po.approvalChain[idx];
    if (!step) throw badRequest('No pending approval step');
    if (!canApproveStep(actor.role, step)) throw forbidden(`Requires role: ${step.requiredRole}`);

    step.status = 'rejected';
    step.approverId = actor.id;
    step.approverName = actor.name;
    step.actedAt = new Date();
    step.comment = comment;
    po.status = 'Rejected';
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.rejected', meta: { level: step.level, role: step.requiredRole, comment } });
    po.markModified('approvalChain');
    await po.save();

    const owner = po.ownerId ? await User.findById(po.ownerId).select('email').lean() : null;
    EmailNotify.notifyAndEmail({
      to: owner?.email, userId: po.ownerId, kind: 'po', severity: 'error',
      title: `${po.number} rejected`,
      body: `Purchase order ${po.number} (${po.vendorName}) was rejected at ${PO_ROLE_LABELS[step.requiredRole] || step.requiredRole} approval${comment ? `: "${comment}"` : '.'}`,
      link: 'procurement', meta: { poId: po._id, poNumber: po.number },
    }).catch(() => {});

    return normalizePo(po.toObject());
  },

  async addComment(id, text, actor) {
    const po = await PurchaseOrder.findById(id);
    if (!po) throw notFound('PO not found');
    po.comments.push({ userId: actor?.id, userName: actor?.name, text });
    po.activityLog.push({ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.commented' });
    await po.save();
    return normalizePo(po.toObject());
  },

  async recent(limit = 6) {
    return (await PurchaseOrder.find().sort({ createdAt: -1 }).limit(limit).lean()).map(normalizePo);
  },
};
