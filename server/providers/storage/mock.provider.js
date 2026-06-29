// MockStorageProvider — keeps file metadata in-memory and returns a data: URL
// or a fake CDN URL. Replace with CloudinaryProvider once credentials are set.
import { randomUUID } from 'crypto';

const _store = new Map(); // key -> { url, filename, contentType, size, uploadedAt }

export class MockStorageProvider {
  constructor() { this.name = 'mock'; }

  async upload({ buffer, base64, filename = 'file', contentType = 'application/octet-stream', folder = 'uploads' }) {
    const key = `${folder}/${randomUUID()}-${filename}`.replace(/\s+/g, '_');
    let size = 0;
    let dataUrl;
    if (buffer) {
      size = buffer.length;
      dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    } else if (base64) {
      const raw = base64.replace(/^data:[^;]+;base64,/, '');
      size = Math.floor((raw.length * 3) / 4);
      dataUrl = `data:${contentType};base64,${raw}`;
    } else {
      throw new Error('upload requires buffer or base64');
    }
    // Use a fake CDN URL for downstream consumers; the raw data URL is kept for the dev preview.
    const url = `mock-cdn://procurio/${key}`;
    _store.set(key, { url, dataUrl, filename, contentType, size, uploadedAt: new Date().toISOString() });
    return { url, key, provider: this.name, size };
  }

  async delete(key) {
    return _store.delete(key);
  }

  async signedUrl(key) {
    const entry = _store.get(key);
    return entry?.dataUrl || null;
  }

  // Dev helper — list stored files (used by /api/uploads route).
  async list() {
    return Array.from(_store.entries()).map(([key, v]) => ({ key, ...v, dataUrl: undefined }));
  }
}
