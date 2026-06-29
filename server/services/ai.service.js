// Provider-agnostic LLM call. The provider is selected at runtime via env
// (AI_PROVIDER=gemini|mock). Business code below never imports a vendor SDK directly.
import { AiConversation } from '../models/aiConversation.model.js';
import { AiContextService } from './aiContext.service.js';
import { notFound } from '../utils/apiError.js';
import { getAIProvider } from '../providers/ai/index.js';
import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `You are Procurio AI, the in-app intelligence agent for an enterprise procurement and inventory platform.
You are concise, professional, and ground every claim in the LIVE_DATA provided.
When suggesting actions, be specific: cite PR/PO numbers, vendor names, SKUs, quantities, and amounts.
Format:
- Use short paragraphs and bullets.
- Quote dollar amounts as $X,XXX.
- If LIVE_DATA does not contain enough info to answer confidently, say so and suggest where the user can look.
- Never invent numbers or vendor names not present in LIVE_DATA.
Keep responses under 220 words unless the user explicitly asks for depth.`;

// Data-grounded fallback (used if the LLM call fails). Composes a structured
// summary from the same context blocks so the assistant remains useful.
function composeFallback(question, ctx) {
  const bullets = [];
  const data = Object.fromEntries(ctx.blocks.map(b => [b.label, b.data]));

  if (data.procurement_snapshot) {
    const k = data.procurement_snapshot;
    bullets.push(`Spend MTD is $${(k.monthSpend || 0).toLocaleString()} across ${k.openPurchaseOrders} open POs. ${k.pendingApprovals} PRs are awaiting approval.`);
  }
  if (data.low_stock_items && data.low_stock_items.length) {
    const top = data.low_stock_items.slice(0, 3).map(p => `${p.sku} (${p.name}, ${p.available}/${p.reorderLevel} · ${p.leadTimeDays}d lead)`).join('; ');
    bullets.push(`Low-stock alert: ${data.low_stock_items.length} SKU(s). Critical: ${top}.`);
  }
  if (data.risky_vendors && data.risky_vendors.length) {
    bullets.push(`Vendor risk: ${data.risky_vendors.map(v => `${v.name} (score ${v.score})`).join(', ')}.`);
  }
  if (data.pending_approvals && data.pending_approvals.length) {
    const top = data.pending_approvals.slice(0, 3).map(p => `${p.number} ${p.title} ($${p.total.toLocaleString()})`).join('; ');
    bullets.push(`Top pending approvals: ${top}.`);
  }
  if (data.by_warehouse) {
    const high = data.by_warehouse.find(w => w.utilization > 70);
    if (high) bullets.push(`Warehouse ${high.code} at ${high.utilization}% capacity — consider rebalancing.`);
  }

  let intro = '';
  if (ctx.intent.recommend) intro = 'Here are the most actionable items I see right now:';
  else if (ctx.intent.stockout) intro = 'Inventory health snapshot:';
  else if (ctx.intent.vendors) intro = 'Vendor portfolio snapshot:';
  else if (ctx.intent.spend) intro = 'Spend snapshot:';
  else intro = 'Here is what I see in your workspace right now:';

  if (!bullets.length) bullets.push('No notable signals in the live data for that query.');
  return `${intro}\n\n• ${bullets.join('\n\n• ')}\n\n_(Responded from live data — the AI model is currently unavailable, so this is the structured fallback.)_`;
}

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
        userId: actor.id, userName: actor.name,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    // Build grounded context from live MongoDB data
    const ctx = await AiContextService.build(message);

    // Persist the user turn
    convo.messages.push({ role: 'user', content: message });

    // Build chat history for the LLM (cap to last 8 turns for token efficiency).
    // We pass the history without 'system' roles — providers receive systemPrompt separately.
    const history = convo.messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

    // System prompt = base persona + live-data grounding block
    const systemPrompt = `${SYSTEM_PROMPT}\n\nLIVE_DATA (from MongoDB, authoritative for this answer):\n${ctx.summary}`;

    let answer;
    let usedFallback = false;
    let providerName = 'unknown';
    try {
      const provider = getAIProvider();
      providerName = provider.name;
      const r = await provider.chat({ systemPrompt, messages: history });
      answer = (r.content || '').trim();
      if (!answer) throw new Error('Empty content from provider');
    } catch (e) {
      logger.warn('ai.provider_failed_fallback', { err: e.message, detail: e.detail });
      answer = composeFallback(message, ctx);
      usedFallback = true;
    }

    convo.messages.push({ role: 'assistant', content: answer, citations: ctx.citations });
    if (convo.messages.length <= 2) convo.title = message.slice(0, 60);
    await convo.save();

    return {
      conversationId: convo._id,
      title: convo.title,
      provider: providerName,
      assistant: { role: 'assistant', content: answer, citations: ctx.citations, fallback: usedFallback },
    };
  },
};
