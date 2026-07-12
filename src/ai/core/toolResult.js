// Shared by agent.js and prompts/supervisor.prompt.js.
//
// A tool result can be "unusable" two different ways:
//  1. executor-level failure: r.error is set (tool threw or wasn't found)
//  2. tool-level failure: the tool followed the { success, action, data }
//     envelope convention (see inventory/vendor/analytics/notification
//     tools) and returned success:false with a domain error inside `data`.
// Both cases must be excluded from grounding — otherwise an error message
// like "No product found for SKU X" gets fed to the LLM/citations as if it
// were real data.
export function isGrounded(result) {
  if (!result || result.error || !result.data) return false;
  if (result.data.success === false) return false;
  return true;
}

export function groundedOnly(toolResults = []) {
  return toolResults.filter(isGrounded);
}

export default { isGrounded, groundedOnly };