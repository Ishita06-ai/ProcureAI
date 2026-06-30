import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { getStorageProvider } from '../providers/storage/index.js';
import { PrService } from '../services/purchaseRequest.service.js';
import { recordAudit } from '../services/audit.service.js';
import { badRequest } from '../utils/apiError.js';

// Rough cap so someone can't paste a multi-hundred-MB base64 blob into JSON
// and stall the request. ~15MB encoded (~10-11MB decoded).
const MAX_BASE64_LENGTH = 15 * 1024 * 1024;

export const UploadController = {
  // POST /api/uploads — uploads a file via StorageService and optionally
  // attaches it to a Purchase Request in the same call.
  create: asyncHandler(async (req, res) => {
    const { base64, filename, contentType, folder, purchaseRequestId, kind } = req.body;

    if (base64.length > MAX_BASE64_LENGTH) {
      throw badRequest('File too large (max ~10MB)');
    }

    const provider = getStorageProvider();
    const result = await provider.upload({
      base64,
      filename,
      contentType,
      folder: folder || 'uploads',
    });

    let attachedTo = null;
    if (purchaseRequestId) {
      const pr = await PrService.addAttachment(purchaseRequestId, {
        name: filename,
        url: result.url,
        mime: contentType,
        size: result.size,
        kind: kind || 'other',
      }, req.user);
      attachedTo = { purchaseRequestId, prNumber: pr.number };
    }

    await recordAudit({
      req, action: 'upload.create', resource: 'file', resourceId: result.key,
      meta: { filename, size: result.size, provider: result.provider, attachedTo: !!attachedTo },
    });

    res.status(201).json(ok({ ...result, filename, contentType, attachedTo }));
  }),

  // GET /api/uploads — dev helper to list what's currently stored (mock provider only).
  list: asyncHandler(async (req, res) => {
    const provider = getStorageProvider();
    const items = typeof provider.list === 'function' ? await provider.list() : [];
    res.json(ok(items));
  }),

  // GET /api/uploads/:key/signed-url — fetch a viewable URL for a stored file.
  signedUrl: asyncHandler(async (req, res) => {
    const provider = getStorageProvider();
    const key = decodeURIComponent(req.params.key);
    const url = typeof provider.signedUrl === 'function' ? await provider.signedUrl(key) : null;
    if (!url) throw badRequest('File not found or provider does not support signed URLs');
    res.json(ok({ key, url }));
  }),

  // DELETE /api/uploads/:key
  remove: asyncHandler(async (req, res) => {
    const provider = getStorageProvider();
    const key = decodeURIComponent(req.params.key);
    const deleted = await provider.delete(key);
    await recordAudit({ req, action: 'upload.delete', resource: 'file', resourceId: key });
    res.json(ok({ key, deleted }));
  }),
};