// Formatting helpers shared by the supervisor and specialist agents.
// Moved out of the old single-agent core so every agent layer can produce
// citations and a structured fallback consistently.
import { groundedOnly } from './toolResult.js';

// Cap on the serialized tool-results block that rides inside an LLM system
// prompt. Tokens cost money and context window per request, and most questions
// only need the FIRST few results at full fidelity. See serializeToolResults.
export const AI_CONTEXT_BUDGET_CHARS = Number(process.env.AI_CONTEXT_BUDGET_CHARS || 6000);

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

export function toCitations(toolResults) {
  return groundedOnly(toolResults).map((r) => {
    const action = r.data?.action;
    return {
      label: action ? `${toolLabel(r.tool)} · ${humanizeAction(action)}` : (r.description || r.tool),
      kind: r.tool,
      value: { action: action || null, preview: previewData(r.data.data ?? r.data) },
    };
  });
}

// Serialize grounded tool results into the "TOOL_RESULTS" block that both the
// supervisor and specialist system prompts use, bounded by a total char budget.
//
// Planner order = importance order, so blocks are packed greedily from the
// front: earlier results stay whole, and once the budget is exhausted the next
// result is truncated to whatever room remains (never dropped entirely, so the
// LLM still sees which tools produced data). This replaces the previous
// unbounded JSON dump — a vendor summary alone was ~8k chars.
export function serializeToolResults(toolResults, { maxTotalChars = AI_CONTEXT_BUDGET_CHARS } = {}) {
  const blocks = groundedOnly(toolResults).map(
    (r) => `# ${r.tool} — ${r.data?.action ?? 'result'} (${r.description})\n${JSON.stringify(r.data?.data ?? r.data)}`
  );
  if (!blocks.length) return '';

  // Infinity / non-positive budget → unbounded serialization (benchmark mode).
  if (!(maxTotalChars > 0)) return blocks.join('\n\n');

  const out = [];
  let used = 0;
  for (const block of blocks) {
    const sep = out.length ? '\n\n' : '';
    const available = maxTotalChars - used - sep.length;
    if (available <= 0) break;
    if (block.length <= available) {
      out.push(block);
      used += sep.length + block.length;
    } else {
      out.push(`${block.slice(0, available)}…`);
      used = maxTotalChars;
      break;
    }
  }
  return out.join('\n\n');
}

// Data-only fallback used when the LLM provider is unavailable.
export function composeFallback(toolResults) {
  const lines = groundedOnly(toolResults)
    .map((r) => `• ${r.description}: ${JSON.stringify(r.data.data ?? r.data).slice(0, 300)}`);

  if (!lines.length) {
    return "I couldn't gather any live data for that question. Try rephrasing, or check the relevant page directly.";
  }
  return `Here is what I see in your workspace right now:\n\n${lines.join('\n\n')}\n\n_(Responded from live data — the AI model is currently unavailable, so this is the structured fallback.)_`;
}

export default { toCitations, composeFallback, serializeToolResults };
