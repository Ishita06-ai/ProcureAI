// Retry with exponential backoff + jitter. Provider-agnostic.
export async function retry(fn, { attempts = 3, baseMs = 250, factor = 2, jitter = true, shouldRetry } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (shouldRetry && !shouldRetry(e)) throw e;
      if (i === attempts - 1) break;
      const delay = baseMs * Math.pow(factor, i) * (jitter ? (0.7 + Math.random() * 0.6) : 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
