import { getEmailProvider } from '../providers/email/index.js';
import { NotificationService } from './notification.service.js';
import { User } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

function simpleHtml({ title, body, link }) {
  const url = process.env.APP_URL || '';
  const cta = link ? `<p><a href="${url}/${link}">Open in ProcureAI</a></p>` : '';
  return `<div style="font-family:sans-serif"><h2>${title}</h2><p>${body || ''}</p>${cta}</div>`;
}

// Sends an email (best-effort, never throws) and records an in-app notification.
// `to` can be a single email, an array of emails, or omitted (notification-only).
async function notifyAndEmail({ to, userId = null, kind = 'system', severity = 'info', title, body, link, meta }) {
  await NotificationService.emit({ userId, kind, severity, title, body, link, meta });

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return;

  const provider = getEmailProvider();
  for (const email of recipients) {
    try {
      await provider.send({ to: email, subject: title, html: simpleHtml({ title, body, link }), text: body, meta });
    } catch (err) {
      logger.warn('emailNotify.send_failed', { to: email, err: err.message });
    }
  }
}

// Emails everyone with one of the given roles (used for approval requests).
async function emailUsersWithRole(roles, { title, body, link, kind, severity, meta }) {
  const users = await User.find({ role: { $in: roles }, status: 'active' }).select('email').lean();
  await notifyAndEmail({ to: users.map(u => u.email), kind, severity, title, body, link, meta });
}

export const EmailNotify = { notifyAndEmail, emailUsersWithRole };