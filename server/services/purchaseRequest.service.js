import { PurchaseRequest } from '../models/purchaseRequest.model.js';
import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { Vendor } from '../models/vendor.model.js';
import { notFound, badRequest, forbidden } from '../utils/apiError.js';
import { EmailNotify } from './emailNotify.service.js';

function nextPrNumber() { return `PR-${20000 + Math.floor(Math.random() * 80000)}`; }
function nextPoNumber() { return `PO-${10000 + Math.floor(Math.random() * 90000)}`; }

function buildApprovalChain(amount) {
  const chain = [{ level: 1, requiredRole: 'manager', status: 'pending' }];
  if (amount >= 5000)  chain.push({ level: 2, requiredRole: 'manager', status: 'pending' });
  if (amount >= 25000) chain.push({ level: 3, requiredRole: 'admin',   status: 'pending' });
  return chain;
}

function computeTotal(items = []) {
  return items.reduce((sum, it) => {
    const lineTotal = (Number(it.qty) || 0) * (Number(it.estimatedUnitPrice) || 0);
    it.lineTotal = lineTotal;
    return sum + lineTotal;
  }, 0);
}

function canApproveLevel(userRole, step) {
  if (step.status !== 'pending') return false;
  if (userRole === 'admin') return true; // admin can act on any pending step
  if (userRole === 'manager' && step.requiredRole === 'manager') return true;
  return false;
}

function logActivity(pr, actor, action, meta) {
  pr.activityLog.push({
    actorId: actor?.id, actorName: actor?.name || 'system',
    action, meta, at: new Date(),
  });
}

export const PrService = {
  async list({ q, status, priority, department, page, limit, skip, sort = '-createdAt' }) {
    const filter = {};
    if (q) filter.$or = [
      { number: new RegExp(q, 'i') },
      { title: new RegExp(q, 'i') },
      { requesterName: new RegExp(q, 'i') },
    ];
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;

    const [items, total] = await Promise.all([
      PurchaseRequest.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      PurchaseRequest.countDocuments(filter),
    ]);
    return { items, total };
  },

  async board() {
    // Aggregate by status for kanban
    const items = await PurchaseRequest.find({ status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 }).lean();
    const cols = { Draft: [], Submitted: [], UnderReview: [], Approved: [], Rejected: [] };
    for (const pr of items) {
      if (cols[pr.status]) cols[pr.status].push(pr);
    }
    return cols;
  },

  async get(id) {
    const pr = await PurchaseRequest.findById(id).lean();
    if (!pr) throw notFound('Purchase request not found');
    return pr;
  },

  async create(data, actor) {
    const items = (data.items || []).map(it => ({ ...it, lineTotal: (it.qty || 0) * (it.estimatedUnitPrice || 0) }));
    const total = computeTotal(items);
    const pr = new PurchaseRequest({
      number: nextPrNumber(),
      title: data.title,
      description: data.description,
      department: data.department || 'Operations',
      costCenter: data.costCenter,
      priority: data.priority || 'normal',
      neededBy: data.neededBy ? new Date(data.neededBy) : undefined,
      items,
      estimatedTotal: total,
      approvalChain: buildApprovalChain(total),
      currentLevel: 0,
      requesterId: actor?.id,
      requesterName: actor?.name || 'system',
      status: 'Draft',
    });
    logActivity(pr, actor, 'pr.created', { total });
    await pr.save();
    return pr.toObject();
  },

  async update(id, data, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (pr.status !== 'Draft') throw badRequest('Only Draft requests can be edited');

    if (data.items) {
      pr.items = data.items.map(it => ({ ...it, lineTotal: (it.qty || 0) * (it.estimatedUnitPrice || 0) }));
      pr.estimatedTotal = computeTotal(pr.items);
      pr.approvalChain = buildApprovalChain(pr.estimatedTotal);
    }
    for (const k of ['title', 'description', 'department', 'costCenter', 'priority']) {
      if (data[k] !== undefined) pr[k] = data[k];
    }
    if (data.neededBy) pr.neededBy = new Date(data.neededBy);
    logActivity(pr, actor, 'pr.updated');
    await pr.save();
    return pr.toObject();
  },

  async submit(id, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (pr.status !== 'Draft') throw badRequest(`Cannot submit from status ${pr.status}`);
    if (!pr.items?.length) throw badRequest('Add at least one item before submitting');
    pr.status = 'Submitted';
    pr.currentLevel = 1;
    logActivity(pr, actor, 'pr.submitted');
    await pr.save();
    const obj = pr.toObject();
    await EmailNotify.prSubmitted(obj);
    return obj;
  },

  async startReview(id, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (pr.status !== 'Submitted') throw badRequest('Only Submitted requests can be reviewed');
    pr.status = 'UnderReview';
    logActivity(pr, actor, 'pr.reviewStarted');
    await pr.save();
    return pr.toObject();
  },

  async approve(id, { comment }, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (!['Submitted', 'UnderReview'].includes(pr.status)) throw badRequest(`Cannot approve from ${pr.status}`);

    const idx = (pr.currentLevel || 1) - 1;
    const step = pr.approvalChain[idx];
    if (!step) throw badRequest('No pending approval step');
    if (!canApproveLevel(actor.role, step)) throw forbidden(`Requires role: ${step.requiredRole}`);

    step.status = 'approved';
    step.approverId = actor.id;
    step.approverName = actor.name;
    step.actedAt = new Date();
    step.comment = comment;

    logActivity(pr, actor, 'pr.approvedLevel', { level: step.level });

    let final = false;
    if (pr.currentLevel >= pr.approvalChain.length) {
      pr.status = 'Approved';
      final = true;
      logActivity(pr, actor, 'pr.approved');
    } else {
      pr.currentLevel += 1;
      pr.status = 'UnderReview';
    }
    await pr.save();
    const obj = pr.toObject();
    await EmailNotify.prApproved(obj, { final });
    if (!final) await EmailNotify.prSubmitted(obj); // nudge the next approval level
    return obj;
  },

  async reject(id, { comment }, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (!['Submitted', 'UnderReview'].includes(pr.status)) throw badRequest(`Cannot reject from ${pr.status}`);

    const idx = (pr.currentLevel || 1) - 1;
    const step = pr.approvalChain[idx];
    if (!step) throw badRequest('No pending approval step');
    if (!canApproveLevel(actor.role, step)) throw forbidden(`Requires role: ${step.requiredRole}`);

    step.status = 'rejected';
    step.approverId = actor.id;
    step.approverName = actor.name;
    step.actedAt = new Date();
    step.comment = comment;
    pr.status = 'Rejected';
    logActivity(pr, actor, 'pr.rejected', { level: step.level, comment });
    await pr.save();
    const obj = pr.toObject();
    await EmailNotify.prRejected(obj, { comment });
    return obj;
  },

  async addQuote(id, data, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    const vendor = await Vendor.findById(data.vendorId).lean();
    if (!vendor) throw badRequest('Vendor not found');
    const quote = {
      vendorId: vendor._id,
      vendorName: vendor.name,
      amount: data.amount,
      leadTimeDays: data.leadTimeDays,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      notes: data.notes,
    };
    pr.vendorQuotes.push(quote);
    logActivity(pr, actor, 'pr.quoteAdded', { vendor: vendor.name, amount: data.amount });
    await pr.save();
    return pr.toObject();
  },

  async selectVendor(id, { vendorId, amount }, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    const quote = pr.vendorQuotes.find(q => q.vendorId === vendorId);
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) throw badRequest('Vendor not found');
    pr.selectedVendorId = vendor._id;
    pr.selectedVendorName = vendor.name;
    pr.selectedQuoteAmount = amount ?? quote?.amount ?? pr.estimatedTotal;
    logActivity(pr, actor, 'pr.vendorSelected', { vendor: vendor.name, amount: pr.selectedQuoteAmount });
    await pr.save();
    return pr.toObject();
  },

  async addComment(id, { text, internal }, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    pr.comments.push({ userId: actor?.id, userName: actor?.name, text, internal: !!internal });
    logActivity(pr, actor, 'pr.commented');
    await pr.save();
    return pr.toObject();
  },

  async addAttachment(id, file, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    pr.attachments.push({
      name: file.name, url: file.url, mime: file.mime, size: file.size, kind: file.kind || 'other',
      uploadedBy: actor?.id, uploadedByName: actor?.name,
    });
    logActivity(pr, actor, 'pr.attachmentAdded', { name: file.name });
    await pr.save();
    return pr.toObject();
  },

  async convertToPo(id, data, actor) {
    const pr = await PurchaseRequest.findById(id);
    if (!pr) throw notFound('Purchase request not found');
    if (pr.status !== 'Approved') throw badRequest('Only Approved requests can be converted');
    if (pr.poId) throw badRequest('Already converted to PO ' + pr.poNumber);
    if (!pr.selectedVendorId) throw badRequest('Select a vendor before converting');

    const lines = pr.items.map(it => ({
      sku: it.name, description: it.description || it.name,
      qty: it.qty, unit: it.unit, unitPrice: it.estimatedUnitPrice,
      lineTotal: (it.qty || 0) * (it.estimatedUnitPrice || 0),
    }));

    const po = await PurchaseOrder.create({
      number: nextPoNumber(),
      requestId: pr._id,
      requestNumber: pr.number,
      vendorId: pr.selectedVendorId,
      vendorName: pr.selectedVendorName,
      ownerId: actor?.id,
      ownerName: actor?.name,
      status: 'Approved',
      amount: pr.selectedQuoteAmount || pr.estimatedTotal,
      lines,
      notes: data.notes,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      activityLog: [{ at: new Date(), actorId: actor?.id, actorName: actor?.name, action: 'po.createdFromPR', meta: { pr: pr.number } }],
    });

    pr.poId = po._id;
    pr.poNumber = po.number;
    logActivity(pr, actor, 'pr.convertedToPo', { po: po.number });
    await pr.save();
    return { pr: pr.toObject(), po: po.toObject() };
  },
};