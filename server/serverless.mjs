import serverless from 'serverless-http';
import { createApp } from './app.mjs';

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

async function loadDatabaseFromEnv() {
  if (!process.env.DATABASE_URL) return null;
  return import('./database.mjs');
}

/**
 * Create a Netlify (AWS Lambda-compatible) handler for the community API.
 *
 * - No DATABASE_URL (or an invalid one): every /api/community request answers 503 JSON,
 *   so the Community tab shows its unavailable state and nothing else is affected.
 * - With a database: migration 001 runs once per cold start (guarded by GET_LOCK inside
 *   migrateCommunitySchema); a failure answers 503 and is retried on the next request.
 * - Expired notes are removed opportunistically, at most once per CLEANUP_INTERVAL_MS per instance.
 */
export function createCommunityHandler({ loadDatabase = loadDatabaseFromEnv, now = () => Date.now() } = {}) {
  let handlerPromise;
  let migration;
  let lastCleanupAt = 0;

  async function buildHandler() {
    let database = null;
    try {
      database = await loadDatabase();
    } catch {
      console.error('Stillpoint community function: DATABASE_URL is set but invalid; community notes are unavailable.');
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

    const app = createApp({ pool, prepare: pool ? prepare : undefined });
    return serverless(app, {
      request(request) { request.url = normalizeCommunityUrl(request.url); },
    });
  }

  return async function handler(event, context) {
    if (context && typeof context === 'object') context.callbackWaitsForEmptyEventLoop = false;
    handlerPromise ??= buildHandler();
    const run = await handlerPromise;
    return run(event, context);
  };
}
