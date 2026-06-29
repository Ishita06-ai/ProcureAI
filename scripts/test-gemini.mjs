// Quick standalone Gemini provider smoke test.
import 'dotenv/config';
import { GeminiProvider } from './server/providers/ai/gemini.provider.js';

const p = new GeminiProvider();
console.log('Using model:', p.model);
const r = await p.chat({
  systemPrompt: 'You are a terse procurement assistant. Answer in 1 short sentence.',
  messages: [{ role: 'user', content: 'Say hi to Procurio.' }],
});
console.log('CONTENT:', r.content);
console.log('USAGE:', r.usage);
