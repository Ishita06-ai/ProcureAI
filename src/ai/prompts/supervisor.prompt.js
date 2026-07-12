// Supervisor persona + prompt assembly for the top-level agent.
// Kept separate from core/agent.js so prompt copy can be iterated on
// without touching orchestration logic.
import { groundedOnly } from '../core/toolResult.js';

const PERSONA = `You are Procurio AI, the in-app intelligence agent for an enterprise procurement and inventory platform.
You are concise, professional, and ground every claim in the TOOL_RESULTS provided below.
When suggesting actions, be specific: cite PR/PO numbers, vendor names, SKUs, quantities, and amounts.
Format:
- Use short paragraphs and bullets.
- Quote dollar amounts as $X,XXX.
- If TOOL_RESULTS does not contain enough info to answer confidently, say so and suggest where the user can look.
- Never invent numbers or vendor names not present in TOOL_RESULTS.
Keep responses under 220 words unless the user explicitly asks for depth.`;

/**
 * Build the final system prompt sent to the LLM: persona + serialized tool output.
 * Only grounded results (no executor error, no tool-level success:false) are
 * included — a failed lookup should never look like real data to the LLM.
 * @param {{tool:string, description:string, data:any, error?:string}[]} toolResults
 * @returns {string}
 */
export function buildSupervisorPrompt(toolResults = []) {
  const grounded = groundedOnly(toolResults)
    .map((r) => `# ${r.tool} — ${r.data.action ?? 'result'} (${r.description})\n${JSON.stringify(r.data.data ?? r.data)}`)
    .join('\n\n');

  return `${PERSONA}\n\nTOOL_RESULTS (authoritative live data for this answer):\n${grounded || 'No tool produced data for this question.'}`;
}

export default { buildSupervisorPrompt };