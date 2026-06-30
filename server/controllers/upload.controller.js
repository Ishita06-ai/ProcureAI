import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { getStorageProvider } from '../providers/storage/index.js';
import { recordAudit } from '../services/audit.service.js';
import { badRequest } from '../utils/apiError.js';

// 8MB cap on base64 payload size (~6MB raw file) — keep mock provider responsive
// and avoid pathological in-memory payloads.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

export const UploadController = {
  create: asyncHandler(async (req, res) => {
    const { base64, filename, contentType, folder } = req.body;
    if (base64.length > MAX_BASE64_LENGTH) throw badRequest('File too large');

    const provider = getStorageProvider();
    const result = await provider.upload({
      base64,
      filename,
      contentType,
      folder: folder || 'uploads',
    });

    await recordAudit({
      req,
      action: 'file.upload',
      resource: 'storage',
      resourceId: result.key,
      meta: { filename, contentType, size: result.size, provider: result.provider },
    });

    res.status(201).json(ok(result));
  }),

  remove: asyncHandler(async (req, res) => {
    const provider = getStorageProvider();
    const key = req.query.key;
    if (!key) throw badRequest('key query param is required');
    const deleted = await provider.delete(key);
    await recordAudit({ req, action: 'file.delete', resource: 'storage', resourceId: key });
    res.json(ok({ key, deleted }));
  }),
};