import { User } from '../models/user.model.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signJwt } from '../utils/jwt.js';
import { conflict, unauthorized, notFound } from '../utils/apiError.js';

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
};
