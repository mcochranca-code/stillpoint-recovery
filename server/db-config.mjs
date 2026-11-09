// Database connection options for the community API, shared by the standalone server,
// the Netlify Function, the Vercel Function, and `pnpm db:migrate`.
//
// Two ways to configure it (DATABASE_URL wins when both are set):
//   1. DATABASE_URL: a mysql:// URL whose `ssl` query parameter is URL-encoded JSON TLS settings.
//   2. DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: separate values, pasted raw (no URL-encoding).
//      TLS is always required here: TLSv1.2 minimum, certificate verified against the system CAs.

export const REQUIRED_TLS = Object.freeze({ minVersion: 'TLSv1.2', rejectUnauthorized: true });

const SEPARATE_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

const POOL_DEFAULTS = {
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
};

function present(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function parsePort(value, fallback = 3306) {
  if (!present(value)) return fallback;
  const port = Number(String(value).trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('The database port is invalid.');
  return port;
}

export function mysqlOptionsFromUrl(connectionUrl) {
  const url = new URL(connectionUrl);
  if (!['mysql:', 'mysql2:'].includes(url.protocol)) throw new Error('DATABASE_URL must use a MySQL URL.');
  const sslValue = url.searchParams.get('ssl');
  if (!sslValue) throw new Error('The managed MySQL connection must provide its TLS settings.');
  let ssl;
  try { ssl = JSON.parse(sslValue); }
  catch { throw new Error('The managed MySQL TLS configuration is invalid.'); }
  if (!ssl || typeof ssl !== 'object' || Array.isArray(ssl)) throw new Error('The managed MySQL TLS configuration is invalid.');
  return {
    host: url.hostname,
    port: parsePort(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    ssl,
    ...POOL_DEFAULTS,
  };
}

export function mysqlOptionsFromParts(env) {
  const missing = SEPARATE_VARS.filter((name) => !present(env[name]));
  if (missing.length) throw new Error(`Database settings are incomplete; missing ${missing.join(', ')}.`);
  return {
    host: env.DB_HOST.trim(),
    port: parsePort(env.DB_PORT),
    user: env.DB_USER.trim(),
    // The password is used exactly as pasted (no trimming, no URL-decoding).
    password: env.DB_PASSWORD,
    database: env.DB_NAME.trim(),
    // No `ca` override: Node verifies the server certificate against its bundled/system CAs.
    ssl: { ...REQUIRED_TLS },
    ...POOL_DEFAULTS,
  };
}

/** True when either DATABASE_URL or any of the separate DB_* variables is set. */
export function hasDatabaseConfig(env = process.env) {
  return present(env.DATABASE_URL) || SEPARATE_VARS.some((name) => present(env[name])) || present(env.DB_PORT);
}

/**
 * Resolve mysql2 pool options from the environment.
 * Returns null when nothing is configured; throws when the configuration is present but invalid.
 */
export function mysqlOptionsFromEnv(env = process.env) {
  if (present(env.DATABASE_URL)) return mysqlOptionsFromUrl(env.DATABASE_URL.trim());
  if (hasDatabaseConfig(env)) return mysqlOptionsFromParts(env);
  return null;
}
