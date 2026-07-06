// GeminiService — the only place inside src/ai/** that talks to an LLM.
//
// It delegates to the project's existing provider factory
// (server/providers/ai/index.js), which already implements the
// gemini <-> mock switch driven by the AI_PROVIDER env var, plus
// safe fallback-to-mock if the Gemini SDK fails to initialise.
// We reuse it instead of re-wrapping @google/genai here, so there is
// exactly one place that knows about the vendor SDK.
import { getAIProvider } from '../../../server/providers/ai/index.js';
import { logger } from '../utils/logger.js';

/**
 * Ask the configured LLM provider for a chat completion.
 *
 * @param {object} params
 * @param {string} params.systemPrompt - persona + grounded tool data
 * @param {{role: 'user'|'assistant', content: string}[]} params.messages
 * @returns {Promise<{content: string, provider: string, usage?: object}>}
 */
export async function generateReply({ systemPrompt, messages }) {
  const provider = getAIProvider();
  try {
    const result = await provider.chat({ systemPrompt, messages });
    return {
      content: (result?.content || '').trim(),
      provider: provider.name,
      usage: result?.usage,
    };
  } catch (err) {
    logger.warn('gemini.service.generate_failed', { err: err.message, provider: provider.name });
    throw err;
  }
}

export default { generateReply };