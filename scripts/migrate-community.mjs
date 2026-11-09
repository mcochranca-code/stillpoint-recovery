/* global console, process */

// Apply the community schema migration (001_optional_reading_community) explicitly.
// Usage: DATABASE_URL='mysql://…?ssl=…' pnpm db:migrate
//    or: DB_HOST=… DB_PORT=4000 DB_USER=… DB_PASSWORD='…' DB_NAME=stillpoint pnpm db:migrate
// The Vercel and Netlify Functions also run it automatically once per cold start; this script is for
// first-time setup or checking connectivity from a workstation.
import { hasDatabaseConfig } from '../server/db-config.mjs';

if (!hasDatabaseConfig(process.env)) {
  console.error('Set DATABASE_URL (mysql:// URL with its ssl query parameter) or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME before running this script.');
  process.exit(1);
}

const { pool, migrateCommunitySchema } = await import('../server/database.mjs');
try {
  await migrateCommunitySchema();
  console.log('Community schema migration is applied.');
} catch (error) {
  console.error(`Community schema migration failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
