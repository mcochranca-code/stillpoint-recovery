import express from 'express';
import { pool, migrateCommunitySchema, removeExpiredCommunityData } from './database.mjs';
import { createCommunityRouter } from './community-router.mjs';

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
app.use('/api/community', createCommunityRouter(pool));
app.use('/api', (_req, res) => res.status(404).json({ error: 'This API route is not available.' }));
app.use((error, _req, res, _next) => {
  void _next;
  const status = error?.type === 'entity.too.large' ? 413 : 400;
  res.status(status).json({ error: status === 413 ? 'This request is too large.' : 'This request could not be processed.' });
});

let cleanupTimer;
let server;
async function start() {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
    console.info('No database configured; hosted community notes are unavailable in this local run.');
  } else {
    await migrateCommunitySchema();
    await removeExpiredCommunityData();
    cleanupTimer = setInterval(() => { void removeExpiredCommunityData().catch(() => {}); }, 24 * 60 * 60 * 1000);
  }
  const port = Number(process.env.APP_API_PORT || process.env.PORT || 3000);
  server = app.listen(port, '0.0.0.0', () => console.info(`Stillpoint community API listening on ${port}.`));
}

async function stop() {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
}

process.once('SIGINT', () => { void stop().finally(() => process.exit(0)); });
process.once('SIGTERM', () => { void stop().finally(() => process.exit(0)); });
start().catch(async () => {
  console.error('Stillpoint community API could not start. Check database connectivity and migrations.');
  if (pool) await pool.end();
  process.exit(1);
});
