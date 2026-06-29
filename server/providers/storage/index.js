// StorageService factory.
//
// Contract every provider MUST implement:
//   async upload({ buffer|base64, filename, contentType, folder? }) -> { url, key, provider }
//   async delete(key) -> boolean
//   async signedUrl?(key, ttlSeconds?) -> string   (optional)
//
// Switch providers via STORAGE_PROVIDER env. No business code change required.
import { MockStorageProvider } from './mock.provider.js';
import { logger } from '../../utils/logger.js';

let _cached = null;

export function getStorageProvider() {
  if (_cached) return _cached;
  const name = (process.env.STORAGE_PROVIDER || 'mock').toLowerCase();
  // TODO: plug Cloudinary here when CLOUDINARY_* env vars are provided.
  //   if (name === 'cloudinary') _cached = new CloudinaryProvider();
  _cached = new MockStorageProvider();
  logger.info('storage.provider.ready', { provider: _cached.name, requested: name });
  return _cached;
}

export function _resetStorageProvider() { _cached = null; }
