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
import { logger } from '../utils/logger.js';

function toCitations(toolResults) {
  return toolResults
    .filter((r) => !r.error && r.data)
    .map((r) => ({ label: r.description || r.tool, kind: r.tool, value: r.tool }));
}

// Data-only fallback used when the LLM provider is unavailable.
function composeFallback(toolResults) {
  const lines = toolResults
    .filter((r) => !r.error && r.data)
    .map((r) => `• ${r.description}: ${JSON.stringify(r.data).slice(0, 300)}`);

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
 * @returns {Promise<{content: string, citations: object[], toolResults: object[], provider: string, usedFallback: boolean}>}
 */
export async function runAgent({ message, history = [] }) {
  if (!message || !message.trim()) throw new Error('Empty message');

  const planSteps = plan(message);
  logger.info('agent.plan', { message: message.slice(0, 120), steps: planSteps.map((s) => s.tool) });

  const toolResults = await execute(planSteps);
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