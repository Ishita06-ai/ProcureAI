/**
 * Environment validation — runs at startup before any route is registered.
 * Fails fast with a clear message instead of silent misconfiguration.
 */

const REQUIRED = [
  { key: 'MONGO_URL',    hint: 'MongoDB connection string, e.g. mongodb://localhost:27017' },
  { key: 'DB_NAME',      hint: 'MongoDB database name, e.g. procureai' },
  { key: 'JWT_SECRET',   hint: 'Random 32+ char string. Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"' },
];

const WARN_IF_DEFAULT = [
  { key: 'JWT_SECRET', bad: 'dev-secret-change-me', msg: 'JWT_SECRET is using the insecure dev default — set a real secret before deploying' },
  { key: 'JWT_SECRET', bad: 'procurio-dev-secret-change-in-prod-9f8a7e6b5c', msg: 'JWT_SECRET is using the sample .env value — rotate it before production use' },
];

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  for (const { key, hint } of REQUIRED) {
    if (!process.env[key]) {
      errors.push(`  ✗ ${key} is not set\n    Hint: ${hint}`);
    }
  }

  for (const { key, bad, msg } of WARN_IF_DEFAULT) {
    if (process.env[key] === bad) {
      if (isProd) errors.push(`  ✗ ${msg}`);
      else warnings.push(`  ⚠ ${msg}`);
    }
  }

  if (warnings.length) {
    console.warn('\n[env] Configuration warnings:\n' + warnings.join('\n') + '\n');
  }

  if (errors.length) {
    console.error('\n[env] Fatal configuration errors:\n' + errors.join('\n') + '\n');
    if (isProd) process.exit(1);
  }
}