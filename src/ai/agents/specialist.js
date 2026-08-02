// Specialist runner — executes ONE specialist agent for a turn.
//
// A specialist is { name, label, description, tools[], systemPrompt }. It:
//   1. plans tool calls within ITS OWN tool subset (never outside it),
//   2. executes them via the shared executor,
//   3. reasons with its own role prompt over the grounded results (one LLM call).
// The outcome — content + citations — is handed back to the Supervisor, who
// synthesizes the final user-facing answer (supervisor → worker → supervisor).
// If the LLM call fails, it degrades to a structured data summary (never silent).
import { plan } from '../core/planner.js';
import { execute } from '../core/executor.js';
import { groundedOnly } from '../core/toolResult.js';
import { generateReply } from '../services/gemini.service.js';
import { logger } from '../utils/logger.js';
import { toCitations, composeFallback } from '../core/format.js';

function serializeGrounded(toolResults) {
  return groundedOnly(toolResults)
    .map((r) => `# ${r.tool} — ${r.data?.action ?? 'result'} (${r.description})\n${JSON.stringify(r.data?.data ?? r.data)}`)
    .join('\n\n');
}

/**
 * @param {{message: string, specialist: object, context?: object}} params
 * @returns {Promise<{content: string, toolResults: object[], citations: object[], provider: string, usedFallback: boolean}>}
 */
export async function runSpecialist({ message, specialist, context = {} }) {
  // Restrict the plan to this specialist's tool subset. If the message
  // triggered nothing inside its scope (routing edge case), run every tool the
  // specialist owns with a summary-style input so it always has data to reason over.
  const steps = plan(message).filter((s) => specialist.tools.includes(s.tool));
  const toolSteps = steps.length
    ? steps
    : specialist.tools.map((tool) => ({ tool, input: { query: message } }));

  const toolResults = await execute(toolSteps, context);
  const grounded = groundedOnly(toolResults);
  const systemPrompt = `${specialist.systemPrompt}\n\nTOOL_RESULTS (authoritative live data — ground your answer in it):\n${serializeGrounded(grounded) || 'No tool produced data for this question.'}`;

  let content;
  let provider = 'unknown';
  let usedFallback = false;
  try {
    const reply = await generateReply({
      systemPrompt,
      messages: [{ role: 'user', content: message }],
    });
    content = reply.content;
    provider = reply.provider;
    if (!content) throw new Error('Empty content from provider');
  } catch (err) {
    logger.warn('specialist.llm_failed_using_fallback', { agent: specialist.name, err: err.message });
    content = composeFallback(toolResults);
    usedFallback = true;
  }

  return {
    content,
    toolResults,
    citations: toCitations(toolResults),
    provider,
    usedFallback,
  };
}

export default { runSpecialist };
