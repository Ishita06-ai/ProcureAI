// AIProvider factory. Provider selection is purely env-driven so business code
// never knows which provider is active.
//
// Contract every provider MUST implement:
//   async chat({ systemPrompt, messages }) -> { content, usage? }
//   async countTokens?({ text }) -> number   (optional)
//
// `messages` shape: [{ role: 'user'|'assistant'|'system', content: string }]
//
// Add new providers by creating a file in this folder and registering below.
import { GeminiProvider } from './gemini.provider.js';
import { MockAiProvider } from './mock.provider.js';
import { logger } from '../../utils/logger.js';

let _cached = null;

export function getAIProvider() {
  if (_cached) return _cached;
  const name = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  try {
    if (name === 'gemini') _cached = new GeminiProvider();
    else if (name === 'mock') _cached = new MockAiProvider();
    else { logger.warn('ai.provider.unknown', { name }); _cached = new MockAiProvider(); }
    logger.info('ai.provider.ready', { provider: _cached.name });
    return _cached;
  } catch (e) {
    logger.warn('ai.provider.init_failed_fallback_mock', { name, err: e.message });
    _cached = new MockAiProvider();
    return _cached;
  }
}

// Test helper: clear cached provider (used when env changes in tests)
export function _resetAIProvider() { _cached = null; }
