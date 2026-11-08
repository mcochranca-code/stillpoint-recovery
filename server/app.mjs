import express from 'express';
import { createCommunityRouter } from './community-router.mjs';

export const COMMUNITY_UNAVAILABLE_MESSAGE = 'Community notes are temporarily unavailable.';

/**
 * Build the community API app shared by the long-running server (server/index.mjs)
 * and the Netlify Function (netlify/functions/community.mjs).
 *
 * @param {{ pool: unknown, prepare?: () => Promise<void> }} options
 *   `pool` is a mysql2 pool or null when no database is configured.
 *   `prepare` runs before every community request (serverless migration and cleanup);
 *   if it throws, the request gets a 503 JSON response instead of crashing.
 */
export function createApp({ pool, prepare } = { pool: null }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.use(express.json({ limit: '8kb', strict: true }));
  app.get('/healthz', (_req, res) => res.status(200).type('text/plain').send('ok'));
  if (prepare && pool) {
    app.use('/api/community', async (_req, res, next) => {
      try {
        await prepare();
      } catch {
        return res.status(503).json({ error: COMMUNITY_UNAVAILABLE_MESSAGE });
      }
      return next();
    });
  }
  app.use('/api/community', createCommunityRouter(pool));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'This API route is not available.' }));
  app.use((error, _req, res, _next) => {
    void _next;
    const status = error?.type === 'entity.too.large' ? 413 : 400;
    res.status(status).json({ error: status === 413 ? 'This request is too large.' : 'This request could not be processed.' });
  });
  return app;
}
