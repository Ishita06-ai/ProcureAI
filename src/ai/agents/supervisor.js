// Supervisor — the coordinator agent in the multi-agent system.
//
// Per-turn handoff loop (supervisor → worker → supervisor):
//   1. ROUTE: pick a specialist agent (LLM routing, keyword fallback).
//   2. WORKER: the specialist plans within its own tool subset, executes, and
//      reasons with its own role prompt → structured findings + citations.
//   3. SYNTHESIZE: the supervisor writes the final user-facing answer grounded
//      in the specialist's findings, keeping the specialist's citations so the
//      UI popovers keep working.
// If routing finds no specialist, the supervisor handles the turn directly as a
// generalist using ALL tools (the classic single-agent path) — so vague or
// cross-domain questions (e.g. notifications) still get a grounded answer.
import { plan } from '../core/planner.js';
import { execute } from '../core/executor.js';
import { generateReply } from '../services/gemini.service.js';
import { logger } from '../utils/logger.js';
import { toCitations, composeFallback } from '../core/format.js';
import { specialists, getSpecialist } from './specialists.js';
import { routeToSpecialist } from './router.js';
import { runSpecialist } from './specialist.js';
import { buildSupervisorPrompt, buildSynthesisPrompt } from '../prompts/supervisor.prompt.js';

/**
 * Run the multi-agent supervisor for a single turn.
 * Keeps the same return shape as the old single-agent runAgent so the adapter
 * (src/ai/services/ai.service.js) and HTTP layer need zero changes.
 *
 * @param {object} params
 * @param {string} params.message - the user's latest message
 * @param {{role: 'user'|'assistant', content: string}[]} [params.history] - prior turns
 * @param {{id?: string, name?: string}} [params.actor] - the requesting user, if any.
 *   Forwarded to every tool as { userId } so tools can personalize (e.g. notifications).
 * @returns {Promise<{content: string, citations: object[], toolResults: object[], provider: string, usedFallback: boolean}>}
 */
export async function runSupervisor({ message, history = [], actor = null }) {
  if (!message || !message.trim()) throw new Error('Empty message');
  const context = { userId: actor?.id ?? null };

  // 1. ROUTE
  const routed = await routeToSpecialist({ message, specialists });
  const specialist = routed.specialistName ? getSpecialist(routed.specialistName) : null;
  logger.info('supervisor.routed', {
    message: message.slice(0, 120),
    specialist: routed.specialistName,
    method: routed.method,
  });

  let content;
  let citations = [];
  let toolResults = [];
  let provider = 'unknown';
  let usedFallback = false;

  if (specialist) {
    // 2. WORKER — the specialist reasons within its own tools + role prompt.
    const result = await runSpecialist({ message, specialist, context });
    toolResults = result.toolResults;
    console.log('RAW TOOL RESULTS (specialist) =', JSON.stringify(toolResults, null, 2));
    citations = result.citations;

    // 3. SYNTHESIZE — supervisor writes the final answer from the findings.
    const synthesisPrompt = buildSynthesisPrompt({ specialist, findings: result.content });
    try {
      const reply = await generateReply({
        systemPrompt: synthesisPrompt,
        messages: [...history, { role: 'user', content: message }],
      });
      content = reply.content;
      provider = reply.provider;
      usedFallback = result.usedFallback;
      if (!content) throw new Error('Empty synthesis from provider');
    } catch (err) {
      // The specialist already produced a grounded answer — keep it.
      logger.warn('supervisor.synthesis_failed_using_specialist', { agent: specialist.name, err: err.message });
      content = result.content;
      provider = result.provider;
      usedFallback = result.usedFallback;
    }
  } else {
    // GENERALIST — classic single-agent path over all tools.
    const planSteps = plan(message);
    toolResults = await execute(planSteps, context);
    console.log('RAW TOOL RESULTS (generalist) =', JSON.stringify(toolResults, null, 2));
    citations = toCitations(toolResults);
    const systemPrompt = buildSupervisorPrompt(toolResults);
    try {
      const reply = await generateReply({
        systemPrompt,
        messages: [...history, { role: 'user', content: message }],
      });
      content = reply.content;
      provider = reply.provider;
      if (!content) throw new Error('Empty content from provider');
    } catch (err) {
      logger.warn('supervisor.llm_failed_using_fallback', { err: err.message });
      content = composeFallback(toolResults);
      usedFallback = true;
    }
  }

  return { content, citations, toolResults, provider, usedFallback };
}

export default { runSupervisor };
