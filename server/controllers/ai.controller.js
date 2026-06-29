import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { AiService } from '../services/ai.service.js';
import { recordAudit } from '../services/audit.service.js';

export const AiController = {
  list: asyncHandler(async (req, res) => res.json(ok(await AiService.listConversations(req.user.id)))),
  get:  asyncHandler(async (req, res) => res.json(ok(await AiService.getConversation(req.params.id, req.user.id)))),
  remove: asyncHandler(async (req, res) => {
    const out = await AiService.deleteConversation(req.params.id, req.user.id);
    await recordAudit({ req, action: 'ai.deleteConversation', resource: 'aiConversation', resourceId: req.params.id });
    res.json(ok(out));
  }),
  chat: asyncHandler(async (req, res) => {
    const out = await AiService.chat(req.body, req.user);
    await recordAudit({ req, action: 'ai.chat', resource: 'aiConversation', resourceId: out.conversationId });
    res.json(ok(out));
  }),
};
