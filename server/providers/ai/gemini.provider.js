// GeminiProvider — wraps the official @google/genai SDK.
// Free-tier compatible. Default model: gemini-2.5-flash (set via GEMINI_MODEL).
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../utils/logger.js';
import { retry } from '../../utils/retry.js';

// Only transient failures get retried: 429/5xx HTTP statuses and network
// errors (timeouts, connection resets). Auth errors (401/403) and malformed
// requests are NOT transient — retrying them just wastes attempts.
function isTransientGeminiError(err) {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if (typeof status === 'number') return status === 429 || (status >= 500 && status < 600);
  const msg = String(err?.message || '');
  return /rate\s*limit|quota|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|5\d\d|temporar/.test(msg);
}

export class GeminiProvider {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.name = 'gemini';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Multi-turn chat. We pass a unified `contents` array (Gemini format) plus a
   * `systemInstruction` config. We translate the OpenAI-style messages we get
   * from the service layer into Gemini's contents shape:
   *   { role: 'user'|'model', parts: [{ text }] }
   * (Gemini uses 'model' instead of 'assistant'.)
   */
  async chat({ systemPrompt, messages }) {
    const contents = (messages || [])
      .filter(m => m && m.content && m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));

    const config = {};
    if (systemPrompt) config.systemInstruction = String(systemPrompt);

    let res;
    try {
      // Transient failures (rate limits, 5xx, network blips) are retried with
      // exponential backoff + jitter before giving up. The project-wide retry()
      // utility is bench-verified (see benchmark/bench-reliability.js).
      res = await retry(() => this.client.models.generateContent({ model: this.model, contents, config }), {
        attempts: 3,
        baseMs: 400,
        jitter: true,
        shouldRetry: isTransientGeminiError,
      });
    } catch (e) {
      logger.warn('gemini.call_failed', { err: e?.message });
      const err = new Error(`Gemini call failed: ${e?.message || 'unknown'}`);
      err.detail = e?.response?.data || e?.stack?.slice(0, 400);
      throw err;
    }

    // Robust text extraction across SDK shapes.
    const text =
      (typeof res?.text === 'string' && res.text) ||
      res?.response?.text?.() ||
      res?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') ||
      '';

    if (!text) throw new Error('Gemini returned empty response');

    const usage = res?.usageMetadata
      ? {
          prompt_tokens: res.usageMetadata.promptTokenCount,
          completion_tokens: res.usageMetadata.candidatesTokenCount,
          total_tokens: res.usageMetadata.totalTokenCount,
        }
      : undefined;

    return { content: text.trim(), usage };
  }

  async countTokens({ text }) {
    try {
      const r = await this.client.models.countTokens({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: String(text || '') }] }],
      });
      return r?.totalTokens || 0;
    } catch {
      return 0;
    }
  }
}
