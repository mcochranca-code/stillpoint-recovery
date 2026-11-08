/* global console, process */

// Apply the community schema migration (001_optional_reading_community) explicitly.
// Usage: DATABASE_URL='mysql://…?ssl=…' pnpm db:migrate
// The Netlify Function also runs it automatically once per cold start; this script is for
// first-time setup or checking connectivity from a workstation.
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL to the mysql:// URL (with its ssl query parameter) before running this script.');
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
