import { AuditLog } from '../models/auditLog.model.js';

// Fire-and-forget audit logger. Use from controllers after successful actions.
export async function recordAudit({ req, action, resource, resourceId, meta }) {
  try {
    await AuditLog.create({
      actorId: req.user?.id || null,
      actorName: req.user?.name || 'system',
      action, resource, resourceId,
      meta,
      ip: req.ip || req.headers['x-forwarded-for'] || null,
    });
  } catch (e) { console.warn('[audit] failed', e.message); }
}
