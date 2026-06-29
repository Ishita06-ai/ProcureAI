// MockEmailProvider — logs to console, persists to MongoDB `sentemails` collection
// (best-effort; never throws). Replace with NodemailerProvider/Resend/etc later.
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger.js';

const SentEmailSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  provider: { type: String, default: 'mock' },
  to: String,
  from: String,
  subject: String,
  html: String,
  text: String,
  meta: mongoose.Schema.Types.Mixed,
  at: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

const SentEmail = mongoose.models.SentEmail || mongoose.model('SentEmail', SentEmailSchema);

export class MockEmailProvider {
  constructor() {
    this.name = 'mock';
    this.from = process.env.EMAIL_FROM || 'Procurio <no-reply@procurio.app>';
  }

  async send({ to, subject, html, text, from, replyTo, meta }) {
    const id = randomUUID();
    const payload = {
      _id: id, provider: 'mock', to, from: from || this.from, subject,
      html, text, meta: { ...(meta || {}), replyTo },
    };
    logger.info('email.mock.send', { id, to, subject });
    try { await SentEmail.create(payload); } catch (e) { logger.warn('email.mock.persist_failed', { err: e.message }); }
    return { id, provider: this.name, accepted: true };
  }

  async list({ limit = 50 } = {}) {
    try { return await SentEmail.find().sort({ at: -1 }).limit(limit).lean(); }
    catch { return []; }
  }
}
