// Provider-agnostic chat orchestration.
//
// As of the agentic refactor, planning / tool-execution / LLM-composition
// live in src/ai/core/agent.js. This service is now a thin adapter:
// conversation persistence in, Agent out. Its public shape (chat,
// listConversations, getConversation, deleteConversation) is unchanged, so
// ai.controller.js and ai.routes.js require ZERO changes.
import { AiConversation } from '../../../server/models/aiConversation.model.js';
import { notFound } from '../../../server/utils/apiError.js';
import { runAgent } from '../core/agent.js';
import { logger } from '../utils/logger.js';

export const AiService = {
  async listConversations(userId) {
    return AiConversation.find({ userId }).sort({ updatedAt: -1 }).select('_id title updatedAt').limit(30).lean();
  },
  async getConversation(id, userId) {
    const c = await AiConversation.findOne({ _id: id, userId }).lean();
    if (!c) throw notFound('Conversation not found');
    return c;
  },
  async deleteConversation(id, userId) {
    await AiConversation.deleteOne({ _id: id, userId });
    return { id };
  },

  async chat({ conversationId, message }, actor) {
    if (!message || !message.trim()) throw new Error('Empty message');

    let convo = conversationId
      ? await AiConversation.findOne({ _id: conversationId, userId: actor.id })
      : null;
    if (!convo) {
      convo = await AiConversation.create({
        userId: actor.id,
        userName: actor.name,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    // Persist the user turn first so it's never lost even if the agent fails.
    convo.messages.push({ role: 'user', content: message });

    // History for the LLM (last 8 turns, excluding the message we just
    // pushed — the agent appends it itself before calling the provider).
    const history = convo.messages.slice(-9, -1).map((m) => ({ role: m.role, content: m.content }));

    let result;
    try {
      result = await runAgent({ message, history, actor });
    } catch (err) {
      logger.error('ai.service.agent_failed', { err: err.message });
      result = {
        content: 'Something went wrong generating a response. Please try again.',
        citations: [],
        provider: 'unknown',
        usedFallback: true,
      };
    }

    convo.messages.push({ role: 'assistant', content: result.content, citations: result.citations });
    if (convo.messages.length <= 2) convo.title = message.slice(0, 60);
    await convo.save();

    return {
      conversationId: convo._id,
      title: convo.title,
      provider: result.provider,
      assistant: {
        role: 'assistant',
        content: result.content,
        citations: result.citations,
        fallback: result.usedFallback,
      },
    };
  },
};