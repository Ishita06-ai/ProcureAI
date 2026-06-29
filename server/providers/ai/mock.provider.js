// MockAiProvider — deterministic fallback. Used when AI_PROVIDER=mock or when
// the configured provider fails to initialise. Never throws; always returns text.
export class MockAiProvider {
  constructor() { this.name = 'mock'; this.model = 'mock-ai'; }

  async chat({ messages }) {
    const last = [...(messages || [])].reverse().find(m => m.role !== 'system');
    const echo = last?.content?.slice(0, 280) || '';
    return {
      content: `Mock AI response (no provider configured). I received: "${echo}". Set AI_PROVIDER and credentials in .env to enable a real model.`,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
  async countTokens({ text }) { return Math.ceil(String(text || '').length / 4); }
}
