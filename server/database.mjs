import mysql from 'mysql2/promise';
import { mysqlOptionsFromEnv } from './db-config.mjs';

const options = mysqlOptionsFromEnv(process.env);

export const pool = options ? mysql.createPool(options) : null;

const MIGRATION = '001_optional_reading_community';
const MIGRATION_LOCK = 'stillpoint_community_schema_v1';

export async function migrateCommunitySchema({ lockTimeoutSeconds = 20 } = {}) {
  if (!pool) throw new Error('A managed database is required for the hosted community API.');
  const connection = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [MIGRATION_LOCK, lockTimeoutSeconds]);
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error('Could not acquire the community schema migration lock.');
    lockAcquired = true;

    await connection.query(`CREATE TABLE IF NOT EXISTS stillpoint_schema_migrations (
      migration_key VARCHAR(190) CHARACTER SET ascii NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await connection.execute('SELECT migration_key FROM stillpoint_schema_migrations WHERE migration_key = ?', [MIGRATION]);
    if (rows.length) return;

    await connection.query(`CREATE TABLE IF NOT EXISTS stillpoint_community_comments (
      id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
      reading_key VARCHAR(120) CHARACTER SET ascii NOT NULL,
      body VARCHAR(480) NOT NULL,
      status VARCHAR(12) CHARACTER SET ascii NOT NULL DEFAULT 'visible',
      deletion_token_hash CHAR(64) CHARACTER SET ascii NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_community_reading_status_created (reading_key, status, created_at),
      INDEX idx_community_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await connection.query(`CREATE TABLE IF NOT EXISTS stillpoint_community_reports (
      comment_id CHAR(36) CHARACTER SET ascii NOT NULL,
      reporter_token_hash CHAR(64) CHARACTER SET ascii NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (comment_id, reporter_token_hash),
      CONSTRAINT fk_community_report_comment FOREIGN KEY (comment_id)
        REFERENCES stillpoint_community_comments(id) ON DELETE CASCADE,
      INDEX idx_community_report_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await connection.query(`CREATE TABLE IF NOT EXISTS stillpoint_community_rate_limits (
      token_hash CHAR(64) CHARACTER SET ascii NOT NULL,
      activity_date DATE NOT NULL,
      comment_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      report_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      last_comment_at DATETIME(3) NULL,
      last_report_at DATETIME(3) NULL,
      PRIMARY KEY (token_hash, activity_date),
      INDEX idx_community_rate_date (activity_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await connection.execute('INSERT INTO stillpoint_schema_migrations (migration_key) VALUES (?)', [MIGRATION]);
  } finally {
    if (lockAcquired) {
      try { await connection.query('SELECT RELEASE_LOCK(?)', [MIGRATION_LOCK]); } catch { /* connection release still follows */ }
    }
    connection.release();
  }
}

export async function removeExpiredCommunityData() {
  if (!pool) return;
  await pool.query('DELETE FROM stillpoint_community_comments WHERE created_at < UTC_TIMESTAMP(3) - INTERVAL 90 DAY');
  await pool.query('DELETE FROM stillpoint_community_rate_limits WHERE activity_date < UTC_DATE() - INTERVAL 2 DAY');
}
