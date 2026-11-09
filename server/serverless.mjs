import serverless from 'serverless-http';
import { createApp } from './app.mjs';
import { hasDatabaseConfig } from './db-config.mjs';

const FUNCTION_PREFIX = '/.netlify/functions/community';
const MIGRATION_LOCK_TIMEOUT_SECONDS = 5;
export const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Netlify may hand the function either the public path (/api/community/...) or the
 * function path (/.netlify/functions/community/...). Map both onto the Express mount.
 */
export function normalizeCommunityUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(FUNCTION_PREFIX)) return url;
  const rest = url.slice(FUNCTION_PREFIX.length);
  if (rest === '' || rest.startsWith('?')) return `/api/community${rest}`;
  if (rest.startsWith('/')) return `/api/community${rest}`;
  return url;
}

const COMMUNITY_MOUNT = '/api/community';
// vercel.json rewrites /api/community/<rest> to /api/community?__path=<rest>.
export const VERCEL_PATH_PARAM = '__path';

/**
 * Vercel may hand the function either the original public URL (/api/community/comments/x?y=1)
 * or the rewrite destination (/api/community?__path=comments/x&y=1). Map both onto the
 * Express mount and drop the internal __path parameter.
 */
export function normalizeVercelCommunityUrl(url) {
  if (typeof url !== 'string') return url;
  const parsed = new URL(url, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get(VERCEL_PATH_PARAM);
  parsed.searchParams.delete(VERCEL_PATH_PARAM);
  let pathname = parsed.pathname;
  if (rewrittenPath !== null && (pathname === COMMUNITY_MOUNT || pathname === `${COMMUNITY_MOUNT}/`)) {
    const segments = rewrittenPath.split('/').filter((segment) => segment !== '').map((segment) => {
      let decoded = segment;
      try { decoded = decodeURIComponent(segment); } catch { /* keep the raw segment */ }
      return encodeURIComponent(decoded);
    });
    pathname = segments.length ? `${COMMUNITY_MOUNT}/${segments.join('/')}` : COMMUNITY_MOUNT;
  }
  const search = parsed.searchParams.toString();
  return `${pathname}${search ? `?${search}` : ''}`;
}

async function loadDatabaseFromEnv() {
  if (!hasDatabaseConfig(process.env)) return null;
  return import('./database.mjs');
}

/**
 * Lazily build the community Express app for a serverless runtime (Netlify or Vercel).
 *
 * - No database configuration (or an invalid one): every /api/community request answers 503 JSON,
 *   so the Community tab shows its unavailable state and nothing else is affected.
 * - With a database: migration 001 runs once per cold start (guarded by GET_LOCK inside
 *   migrateCommunitySchema); a failure answers 503 and is retried on the next request.
 * - Expired notes are removed opportunistically, at most once per CLEANUP_INTERVAL_MS per instance.
 *
 * Returns a function that resolves to the same Express app on every call.
 */
export function createLazyCommunityApp({ loadDatabase = loadDatabaseFromEnv, now = () => Date.now() } = {}) {
  let appPromise;
  let migration;
  let lastCleanupAt = 0;

  async function buildApp() {
    let database = null;
    try {
      database = await loadDatabase();
    } catch {
      console.error('Stillpoint community function: the database settings are invalid; community notes are unavailable.');
      database = null;
    }
    const pool = database?.pool ?? null;

    async function prepare() {
      if (!migration) {
        migration = database.migrateCommunitySchema({ lockTimeoutSeconds: MIGRATION_LOCK_TIMEOUT_SECONDS }).catch((error) => {
          migration = undefined;
          console.error('Stillpoint community function: schema migration could not run.');
          throw error;
        });
      }
      await migration;
      if (now() - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
        lastCleanupAt = now();
        try { await database.removeExpiredCommunityData(); } catch { /* cleanup retries on a later request */ }
      }
    }

    return createApp({ pool, prepare: pool ? prepare : undefined });
  }

  return function getApp() {
    appPromise ??= buildApp();
    return appPromise;
  };
}

/** Netlify (AWS Lambda-compatible) handler for the community API. */
export function createCommunityHandler(options = {}) {
  const getApp = createLazyCommunityApp(options);
  let handlerPromise;

  return async function handler(event, context) {
    if (context && typeof context === 'object') context.callbackWaitsForEmptyEventLoop = false;
    handlerPromise ??= getApp().then((app) => serverless(app, {
      request(request) { request.url = normalizeCommunityUrl(request.url); },
    }));
    const run = await handlerPromise;
    return run(event, context);
  };
}

/** Vercel Node.js Function handler (req, res) for the community API. */
export function createVercelCommunityHandler(options = {}) {
  const getApp = createLazyCommunityApp(options);

  return async function handler(req, res) {
    req.url = normalizeVercelCommunityUrl(req.url);
    const app = await getApp();
    await new Promise((resolve) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      app(req, res, () => {
        if (!res.headersSent) res.statusCode = 404;
        if (!res.writableEnded) res.end();
        resolve();
      });
    });
  };
}
