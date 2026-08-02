// Formatting helpers shared by the supervisor and specialist agents.
// Moved out of the old single-agent core so every agent layer can produce
// citations and a structured fallback consistently.
import { groundedOnly } from './toolResult.js';

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

// Data-only fallback used when the LLM provider is unavailable.
export function composeFallback(toolResults) {
  const lines = groundedOnly(toolResults)
    .map((r) => `• ${r.description}: ${JSON.stringify(r.data.data ?? r.data).slice(0, 300)}`);

  if (!lines.length) {
    return "I couldn't gather any live data for that question. Try rephrasing, or check the relevant page directly.";
  }
  return `Here is what I see in your workspace right now:\n\n${lines.join('\n\n')}\n\n_(Responded from live data — the AI model is currently unavailable, so this is the structured fallback.)_`;
}

export default { toCitations, composeFallback };
