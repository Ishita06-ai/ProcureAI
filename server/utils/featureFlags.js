// Lightweight feature flag service. Reads from env (FEATURE_X=true) with overrides.
const overrides = new Map();
export const flags = {
  isOn(name, defaultValue = false) {
    if (overrides.has(name)) return overrides.get(name);
    const env = process.env[`FEATURE_${name.toUpperCase()}`];
    if (env === undefined) return defaultValue;
    return env === 'true' || env === '1';
  },
  set(name, value) { overrides.set(name, value); },
  all() {
    return Object.fromEntries(
      [...Object.keys(process.env)]
        .filter(k => k.startsWith('FEATURE_'))
        .map(k => [k.replace('FEATURE_', '').toLowerCase(), process.env[k] === 'true'])
    );
  },
};
