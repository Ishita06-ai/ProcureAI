// CacheService abstraction. Default: in-memory TTL store.
// Swap to Redis by re-implementing the same 5-method interface (get/set/del/keys/clear).
class MemoryCache {
  constructor() { this.store = new Map(); }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.exp && entry.exp < Date.now()) { this.store.delete(key); return null; }
    return entry.val;
  }
  async set(key, val, ttlSeconds = 60) {
    this.store.set(key, { val, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  }
  async del(key) { this.store.delete(key); }
  async delPrefix(prefix) {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
  async clear() { this.store.clear(); }
  get size() { return this.store.size; }
}

// In production: swap with RedisCache that has the same 5 methods.
export const cache = new MemoryCache();

// Helper: wrap a function with caching.
export async function cached(key, ttl, fn) {
  const hit = await cache.get(key);
  if (hit !== null) return hit;
  const val = await fn();
  await cache.set(key, val, ttl);
  return val;
}
