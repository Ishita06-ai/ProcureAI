import { getEmailProvider } from '../providers/email/index.js';
import { User } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

// All sends are best-effort: a failed email must never fail the underlying
// business transaction (PR approval, PO update, etc). Errors are logged only.
async function safeSend(payload) {
  try {
    return await getEmailProvider().send(payload);
  } catch (e) {
    logger.warn('email.send_failed', { err: e.message, to: payload.to, subject: payload.subject });
    return null;
  }
}

async function emailsForRole(role) {
  const users = await User.find({ role, status: 'active' }).select('email').lean();
  return users.map(u => u.email).filter(Boolean);
}

async function emailForUserId(userId) {
  if (!userId) return null;
  const user = await User.findById(userId).select('email').lean();
  return user?.email || null;
}

export const EmailNotify = {
  async prSubmitted(pr) {
    const idx = (pr.currentLevel || 1) - 1;
    const approverRole = pr.approvalChain?.[idx]?.requiredRole || 'manager';
    const to = await emailsForRole(approverRole);
    if (!to.length) return;
    await safeSend({
      to: to.join(','),
      subject: `PR ${pr.number} awaiting your approval`,
      html: `<p><strong>${pr.requesterName}</strong> submitted purchase request <strong>${pr.number}</strong> (${pr.title}) for review. Estimated total: ${pr.estimatedTotal}.</p>`,
      text: `${pr.requesterName} submitted PR ${pr.number} (${pr.title}) for review. Estimated total: ${pr.estimatedTotal}.`,
      meta: { kind: 'pr.submitted', prId: pr._id },
    });
  },

  async prApproved(pr, { final }) {
    const to = await emailForUserId(pr.requesterId);
    if (!to) return;
    const subject = final ? `PR ${pr.number} fully approved` : `PR ${pr.number} approved at one level`;
    await safeSend({
      to,
      subject,
      html: `<p>Your purchase request <strong>${pr.number}</strong> (${pr.title}) ${final ? 'has been fully approved' : 'moved to the next approval level'}.</p>`,
      text: `Your PR ${pr.number} (${pr.title}) ${final ? 'has been fully approved' : 'moved to the next approval level'}.`,
      meta: { kind: 'pr.approved', prId: pr._id, final: !!final },
    });
  },

  async prRejected(pr, { comment }) {
    const to = await emailForUserId(pr.requesterId);
    if (!to) return;
    await safeSend({
      to,
      subject: `PR ${pr.number} was rejected`,
      html: `<p>Your purchase request <strong>${pr.number}</strong> (${pr.title}) was rejected.${comment ? ` Reason: ${comment}` : ''}</p>`,
      text: `Your PR ${pr.number} (${pr.title}) was rejected.${comment ? ` Reason: ${comment}` : ''}`,
      meta: { kind: 'pr.rejected', prId: pr._id },
    });
  },

  async teamInvite({ email, name, role, tempPassword }) {
    await safeSend({
      to: email,
      subject: 'You have been invited to Procurio',
      html: `<p>Hi ${name},</p><p>You've been added to Procurio as a <strong>${role}</strong>. Temporary password: <code>${tempPassword}</code></p><p>Please sign in and change your password.</p>`,
      text: `Hi ${name}, you've been added to Procurio as a ${role}. Temporary password: ${tempPassword}. Please sign in and change your password.`,
      meta: { kind: 'team.invite' },
    });
  },

  async poStatusChanged(po, { from, to: toStatus }) {
    const recipients = [];
    const ownerEmail = await emailForUserId(po.ownerId);
    if (ownerEmail) recipients.push(ownerEmail);
    if (po.vendorContactEmail) recipients.push(po.vendorContactEmail);
    if (!recipients.length) return;
    await safeSend({
      to: recipients.join(','),
      subject: `PO ${po.number} status changed to ${toStatus}`,
      html: `<p>Purchase order <strong>${po.number}</strong> for ${po.vendorName} moved from <strong>${from}</strong> to <strong>${toStatus}</strong>.</p>`,
      text: `PO ${po.number} for ${po.vendorName} moved from ${from} to ${toStatus}.`,
      meta: { kind: 'po.statusChange', poId: po._id, from, to: toStatus },
    });
  },
};