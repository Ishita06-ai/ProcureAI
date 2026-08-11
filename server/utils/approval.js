// Shared PO approval-workflow logic. Pure functions — no DB access — so the
// chain builder, role gating and SLA math are unit-testable in isolation and
// reusable across the PO service, PR→PO conversion and analytics.

export const APPROVAL_SLA_HOURS = 48;

// Amount tiers (₹) for approval routing. Applied to the raw numeric amount.
export const PO_APPROVAL_TIERS = {
  managerOnly: 50_000,      // amount < 50k         → Manager
  managerFinance: 200_000,  // 50k ≤ amount ≤ 200k  → Manager → Finance
  // amount > 200k           → Manager → Finance → Director
};

export const PO_ROLE_LABELS = {
  manager: 'Manager',
  finance: 'Finance',
  director: 'Director',
};

export const PO_APPROVAL_ROLES = Object.keys(PO_ROLE_LABELS);

/** Build the sequential approval chain for a PO amount (in ₹). */
export function buildPoApprovalChain(amount) {
  const n = Number(amount) || 0;
  const chain = [{ level: 1, requiredRole: 'manager', status: 'pending' }];
  if (n >= PO_APPROVAL_TIERS.managerOnly) {
    chain.push({ level: 2, requiredRole: 'finance', status: 'pending' });
  }
  if (n > PO_APPROVAL_TIERS.managerFinance) {
    chain.push({ level: 3, requiredRole: 'director', status: 'pending' });
  }
  return chain;
}

/**
 * Can this user act on a given step? Admins may act on any pending step
 * (mirrors the PR service behaviour); otherwise the user's role must match
 * the step's requiredRole. Only the currently-pending step is ever offered.
 */
export function canApproveStep(userRole, step) {
  if (!step || step.status !== 'pending') return false;
  if (userRole === 'admin') return true;
  return userRole === step.requiredRole;
}

/**
 * SLA state for one step. durationHours = actedAt − startedAt when the step is
 * resolved, else now − startedAt while it is still pending. A pending step is
 * "breached" once it has been waiting longer than APPROVAL_SLA_HOURS.
 */
export function stepSla(step, now = new Date()) {
  if (!step) return { pending: false, durationHours: 0, breached: false };
  const start = step.startedAt ? new Date(step.startedAt).getTime() : now.getTime();
  const end = step.actedAt ? new Date(step.actedAt).getTime() : now.getTime();
  const durationHours = Math.max(0, (end - start) / 3600000);
  const pending = step.status === 'pending';
  return {
    pending,
    durationHours,
    breached: pending && durationHours > APPROVAL_SLA_HOURS,
  };
}

// PO statuses that mean the PO cleared (or never entered) the approval queue.
// A legacy PO in one of these states has no persisted chain, so the derived
// chain must reflect the terminal outcome rather than present it as pending.
const TERMINAL_PASS_STATUSES = new Set(['Approved', 'In Transit', 'Delivered', 'Cancelled']);

/**
 * Read-path helper: return the PO's approval chain, building one from its
 * amount when the PO predates this feature and has no persisted chain.
 * Pure — never mutates or persists. Used by list/get/analytics so old POs
 * still display and participate in SLA metrics without a data migration.
 *
 * For legacy POs the derived chain mirrors the PO's own status: a PO that is
 * already Approved / In Transit / Delivered / Cancelled yields an all-approved
 * chain (so it is never shown or counted as awaiting approval), a Rejected PO
 * yields a rejected first step, and a still-Pending PO backfills the first
 * stage's start to the PO creation time so its SLA is measured from when it
 * actually entered the queue.
 */
export function deriveApprovalChain(po = {}) {
  if (Array.isArray(po.approvalChain) && po.approvalChain.length > 0) return po.approvalChain;
  const chain = buildPoApprovalChain(po.amount);
  const created = po.createdAt ? new Date(po.createdAt).getTime() : Date.now();
  const base = (step) => ({ ...step, startedAt: new Date(created) });

  if (TERMINAL_PASS_STATUSES.has(po.status)) {
    return chain.map((step) => ({ ...base(step), status: 'approved', actedAt: new Date(created) }));
  }
  if (po.status === 'Rejected') {
    return chain.map((step, i) => (i === 0
      ? { ...base(step), status: 'rejected', actedAt: new Date(created) }
      : base(step)));
  }

  // Pending / Draft / unknown: only the first stage has entered the queue.
  chain[0] = base(chain[0]);
  return chain;
}
