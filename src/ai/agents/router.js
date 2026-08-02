// Router — the Supervisor's first job: decide WHICH specialist agent handles
// a message.
//
// Two tiers, mirroring the project's resilience philosophy:
//   1. LLM routing (preferred): the Supervisor asks the model to pick an agent,
//      then validates the reply against the known specialist names.
//   2. Keyword routing (fallback): deterministic and free — reuses the planner's
//      intent detection and scores each specialist by how many of its tools the
//      message triggers. Unit-tested with no mocks.
// If the LLM is unavailable, returns an unknown agent, or nothing fits, the
// Supervisor handles the turn directly as a generalist (see supervisor.js).
import { plan, hasIntent } from '../core/planner.js';
import { generateReply } from '../services/gemini.service.js';
import { logger } from '../utils/logger.js';

export function buildRouterPrompt(specialists) {
  const team = specialists
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n');
  return `You are the Supervisor of a multi-agent procurement AI. Your specialist team:\n${team}\n- generalist: general questions, notifications, or anything no specialist clearly fits.\n\nRead the user's message and pick the SINGLE best agent to handle it. Reply with ONLY a JSON object, no prose: {"specialist":"<name>"}`;
}

// Validate the model's routing reply against the known agent names. Tolerates
// JSON, prose, or prose-with-JSON; returns null when nothing recognizable is
// found so the caller can degrade to keyword routing.
export function parseRouterResponse(text, specialists) {
  if (!text) return null;
  const known = ['generalist', ...specialists.map((s) => s.name)];
  try {
    const parsed = JSON.parse(text);
    const name = parsed?.specialist;
    if (known.includes(name)) return name;
  } catch {
    // Not pure JSON — scan the raw text below.
  }
  for (const name of known) {
    if (text.includes(name)) return name;
  }
  return null;
}

// Keyword routing: reuse the planner's intent detection, then score each
// specialist by how many of its tools the planned steps hit. Highest score
// wins; ties go to the first specialist in the list. Returns null when no
// specialist is a fit (message routes to the generalist instead).
export function routeByKeywords(message, specialists) {
  // Vague/general questions hit the planner's analytics+inventory fallback —
  // treat those as "no specialist" so the Supervisor handles them directly.
  if (!hasIntent(message)) return null;
  const steps = plan(message);
  if (!steps.length) return null;
  let best = null;
  let bestScore = 0;
  for (const s of specialists) {
    const score = steps.filter((step) => s.tools.includes(step.tool)).length;
    if (score > bestScore) {
      bestScore = score;
      best = s.name;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Route a message to a specialist (or the generalist).
 * @param {{message: string, specialists: object[]}} params
 * @returns {Promise<{specialistName: string|null, method: 'llm'|'keywords'|'generalist'}>}
 */
export async function routeToSpecialist({ message, specialists }) {
  let specialistName = null;
  let method = 'generalist';
  try {
    const reply = await generateReply({
      systemPrompt: buildRouterPrompt(specialists),
      messages: [{ role: 'user', content: message }],
    });
    const parsed = parseRouterResponse(reply?.content, specialists);
    if (parsed && parsed !== 'generalist') {
      specialistName = parsed;
      method = 'llm';
    } else if (parsed === 'generalist') {
      method = 'llm';
    } else {
      specialistName = routeByKeywords(message, specialists);
      method = specialistName ? 'keywords' : 'generalist';
    }
  } catch (err) {
    logger.warn('router.llm_failed_using_keywords', { err: err.message });
    specialistName = routeByKeywords(message, specialists);
    method = specialistName ? 'keywords' : 'generalist';
  }
  return { specialistName, method };
}

export default { buildRouterPrompt, parseRouterResponse, routeByKeywords, routeToSpecialist };
