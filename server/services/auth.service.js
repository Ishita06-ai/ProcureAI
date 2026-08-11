import { randomBytes } from 'crypto';
import { User } from '../models/user.model.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signJwt } from '../utils/jwt.js';
import { conflict, unauthorized, notFound, badRequest } from '../utils/apiError.js';

// Demo accounts for interview / demo showcasing. These are deliberately NOT
// real credentials: each account's password is a random, unguessable hash that
// is never stored or shown anywhere, so the account can only be entered through
// the demo-login endpoint — never the normal login form. Accounts are created
// on first use (find-or-create), so the demo works on any environment (local,
// staging, Vercel) without a reseed, and they only touch the sample dataset.
export const DEMO_ACCOUNTS = {
  admin: { email: 'demo.admin@procurio.app', name: 'Demo Admin', role: 'admin' },
  buyer: { email: 'demo.buyer@procurio.app', name: 'Demo Buyer', role: 'buyer' },
  manager: { email: 'demo.manager@procurio.app', name: 'Demo Manager', role: 'manager' },
  finance: { email: 'demo.finance@procurio.app', name: 'Demo Finance', role: 'finance' },
  director: { email: 'demo.director@procurio.app', name: 'Demo Director', role: 'director' },
};

export const AuthService = {
  async register({ email, name, password, role }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw conflict('Email already registered');
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, name, passwordHash, role: role || 'buyer' });
    const token = signJwt({ sub: user._id, role: user.role, name: user.name, email: user.email });
    return { user, token };
  },

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) throw unauthorized('Invalid credentials');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid credentials');
    user.lastLoginAt = new Date();
    await user.save();
    const token = signJwt({ sub: user._id, role: user.role, name: user.name, email: user.email });
    return { user, token };
  },

  async me(userId) {
    const user = await User.findById(userId);
    if (!user) throw notFound('User not found');
    return user;
  },

  // One-click demo access. Accepts 'admin' | 'buyer' | 'manager' | 'finance' |
  // 'director' — anything else is a 400. Returns the same { user, token }
  // shape as login() so the frontend treats it identically. No scrypt
  // verification (nothing to verify against), so it is cheap and safe to
  // expose behind a rate limiter.
  async demoLogin(role) {
    const cfg = DEMO_ACCOUNTS[role];
    if (!cfg) throw badRequest(`Unknown demo account: ${role}`);
    let user = await User.findOne({ email: cfg.email });
    if (!user) {
      const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
      user = await User.create({ email: cfg.email, name: cfg.name, role: cfg.role, passwordHash });
    }
    user.lastLoginAt = new Date();
    await user.save();
    const token = signJwt({ sub: user._id, role: user.role, name: user.name, email: user.email });
    return { user, token };
  },
};
