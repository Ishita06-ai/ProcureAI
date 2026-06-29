// EmailService factory.
//
// Contract every provider MUST implement:
//   async send({ to, subject, html, text, from?, replyTo?, meta? }) -> { id, provider }
//
// Switch providers via EMAIL_PROVIDER env. Business code (notifications, password
// resets, exports) MUST go through this factory — never call SDKs directly.
import { MockEmailProvider } from './mock.provider.js';
import { logger } from '../../utils/logger.js';

let _cached = null;

export function getEmailProvider() {
  if (_cached) return _cached;
  const name = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();
  // TODO: plug real providers here when credentials are provided.
  //   if (name === 'nodemailer') _cached = new NodemailerProvider();
  //   if (name === 'resend')     _cached = new ResendProvider();
  //   if (name === 'sendgrid')   _cached = new SendgridProvider();
  //   if (name === 'ses')        _cached = new SesProvider();
  _cached = new MockEmailProvider();
  logger.info('email.provider.ready', { provider: _cached.name, requested: name });
  return _cached;
}

export function _resetEmailProvider() { _cached = null; }
