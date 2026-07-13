// Agent — the single entry point for the AI Assistant.
//
// Orchestration: Planner picks tools -> Executor runs them -> the LLM (via
// GeminiService) composes the final answer grounded in the tool output.
// If the LLM call fails, a structured summary is composed from the same
// tool results so the assistant is never silent (same safety net the
// previous implementation had, just fed by tools instead of one big
// context-builder function).
import { plan } from './planner.js';
import { execute } from './executor.js';
import { generateReply } from '../services/gemini.service.js';
import { buildSupervisorPrompt } from '../prompts/supervisor.prompt.js';
import { groundedOnly } from './toolResult.js';
import { logger } from '../utils/logger.js';

// "low_stock" -> "Low Stock"
function humanizeAction(action) {
  if (!action) return '';
  return action.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function toolLabel(tool) {
  return tool.charAt(0).toUpperCase() + tool.slice(1);
}

// Cap how much of a tool's data rides along on a citation — this gets
// persisted on the conversation message (AiMessageSchema.citations[].value),
// so keep it small rather than storing the full payload indefinitely.
function previewData(data, maxChars = 1200) {
  const json = JSON.stringify(data);
  if (!json) return null;
  return json.length > maxChars ? `${json.slice(0, maxChars)}…` : json;
}

function toCitations(toolResults) {
  return groundedOnly(toolResults).map((r) => {
    const action = r.data?.action;
    return {
      label: action ? `${toolLabel(r.tool)} · ${humanizeAction(action)}` : (r.description || r.tool),
      kind: r.tool,
      value: { action: action || null, preview: previewData(r.data.data ?? r.data) },
    };
  });
}

// Data-only fallback used when the LLM provider is unavailable.
function composeFallback(toolResults) {
  const lines = groundedOnly(toolResults)
    .map((r) => `• ${r.description}: ${JSON.stringify(r.data.data ?? r.data).slice(0, 300)}`);

  if (!lines.length) {
    return "I couldn't gather any live data for that question. Try rephrasing, or check the relevant page directly.";
  }
  return `Here is what I see in your workspace right now:\n\n${lines.join('\n\n')}\n\n_(Responded from live data — the AI model is currently unavailable, so this is the structured fallback.)_`;
}

/**
 * Run the agent for a single turn.
 *
 * @param {object} params
 * @param {string} params.message - the user's latest message
 * @param {{role: 'user'|'assistant', content: string}[]} [params.history] - prior turns
 * @param {{id?: string, name?: string}} [params.actor] - the requesting user, if any.
 *   Forwarded to every tool as { userId } so tools can personalize (e.g. notifications).
 * @returns {Promise<{content: string, citations: object[], toolResults: object[], provider: string, usedFallback: boolean}>}
 */
export async function runAgent({ message, history = [], actor = null }) {
  if (!message || !message.trim()) throw new Error('Empty message');

  const planSteps = plan(message);
  logger.info('agent.plan', { message: message.slice(0, 120), steps: planSteps.map((s) => s.tool) });

  const toolResults = await execute(planSteps, { userId: actor?.id ?? null });
  const systemPrompt = buildSupervisorPrompt(toolResults);

  let content;
  let provider = 'unknown';
  let usedFallback = false;
  try {
    const reply = await generateReply({
      systemPrompt,
      messages: [...history, { role: 'user', content: message }],
    });
    content = reply.content;
    provider = reply.provider;
    if (!content) throw new Error('Empty content from provider');
  } catch (err) {
    logger.warn('agent.llm_failed_using_fallback', { err: err.message });
    content = composeFallback(toolResults);
    usedFallback = true;
  }

  return {
    content,
    citations: toCitations(toolResults),
    toolResults,
    provider,
    usedFallback,
  };
}

export default { runAgent };