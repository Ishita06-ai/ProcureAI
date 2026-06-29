// Structured JSON logger. Zero deps. Drop-in replaceable by pino/winston later.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 20;

function emit(level, msg, meta) {
  if (LEVELS[level] < MIN) return;
  const out = { t: new Date().toISOString(), lvl: level, msg, ...meta };
  const line = JSON.stringify(out);
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
}

export const logger = {
  debug: (m, meta) => emit('debug', m, meta),
  info:  (m, meta) => emit('info',  m, meta),
  warn:  (m, meta) => emit('warn',  m, meta),
  error: (m, meta) => emit('error', m, meta),
  child(bindings) {
    return {
      debug: (m, meta) => emit('debug', m, { ...bindings, ...meta }),
      info:  (m, meta) => emit('info',  m, { ...bindings, ...meta }),
      warn:  (m, meta) => emit('warn',  m, { ...bindings, ...meta }),
      error: (m, meta) => emit('error', m, { ...bindings, ...meta }),
    };
  },
};
