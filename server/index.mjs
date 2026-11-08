import { pool, migrateCommunitySchema, removeExpiredCommunityData } from './database.mjs';
import { createApp } from './app.mjs';

const app = createApp({ pool });

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
