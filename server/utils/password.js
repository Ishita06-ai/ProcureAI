import crypto from 'crypto';

// Lightweight scrypt-based hashing — zero external deps, works in Node 18+/20+.
// In Express portability, swap to bcrypt if preferred; signature is identical.
export async function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await new Promise((resolve, reject) =>
    crypto.scrypt(plain, salt, 64, (err, key) => err ? reject(err) : resolve(key))
  );
  return `scrypt$${salt}$${buf.toString('hex')}`;
}

export async function verifyPassword(plain, stored) {
  if (!stored?.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  const buf = await new Promise((resolve, reject) =>
    crypto.scrypt(plain, salt, 64, (err, key) => err ? reject(err) : resolve(key))
  );
  const a = Buffer.from(hash, 'hex');
  return a.length === buf.length && crypto.timingSafeEqual(a, buf);
}
