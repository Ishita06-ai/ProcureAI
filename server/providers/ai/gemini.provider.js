// GeminiProvider — wraps the official @google/genai SDK.
// Free-tier compatible. Default model: gemini-2.5-flash (set via GEMINI_MODEL).
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../utils/logger.js';

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
      res = await this.client.models.generateContent({
        model: this.model,
        contents,
        config,
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
