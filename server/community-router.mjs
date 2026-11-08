import { Router } from 'express';
import {
  hashRandomToken,
  isValidRandomToken,
  isValidReadingKey,
  validateCommentText,
  MAX_COMMENTS_PER_BROWSER_PER_DAY,
  MAX_REPORTS_PER_BROWSER_PER_DAY,
  REPORT_HIDE_THRESHOLD,
} from './community-policy.mjs';

const COMMENT_COOLDOWN_SECONDS = 20;
const REPORT_COOLDOWN_SECONDS = 2;
const COMMENT_LIST_LIMIT = 50;

function publicComment(row) {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(`${row.created_at}Z`).toISOString();
  return { id: row.id, text: row.body, createdAt };
}

function invalidRequest(res, message) {
  return res.status(400).json({ error: message });
}

async function takeDailySlot(connection, tokenHash, action) {
  await connection.execute(
    `INSERT IGNORE INTO stillpoint_community_rate_limits (token_hash, activity_date) VALUES (?, UTC_DATE())`,
    [tokenHash],
  );
  const [rows] = await connection.execute(
    `SELECT comment_count, report_count,
      TIMESTAMPDIFF(SECOND, last_comment_at, UTC_TIMESTAMP(3)) AS since_comment_seconds,
      TIMESTAMPDIFF(SECOND, last_report_at, UTC_TIMESTAMP(3)) AS since_report_seconds
     FROM stillpoint_community_rate_limits
     WHERE token_hash = ? AND activity_date = UTC_DATE() FOR UPDATE`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return false;

  if (action === 'comment') {
    if (Number(row.comment_count) >= MAX_COMMENTS_PER_BROWSER_PER_DAY) return false;
    if (row.since_comment_seconds !== null && Number(row.since_comment_seconds) < COMMENT_COOLDOWN_SECONDS) return false;
    await connection.execute(
      'UPDATE stillpoint_community_rate_limits SET comment_count = comment_count + 1, last_comment_at = UTC_TIMESTAMP(3) WHERE token_hash = ? AND activity_date = UTC_DATE()',
      [tokenHash],
    );
  } else {
    if (Number(row.report_count) >= MAX_REPORTS_PER_BROWSER_PER_DAY) return false;
    if (row.since_report_seconds !== null && Number(row.since_report_seconds) < REPORT_COOLDOWN_SECONDS) return false;
    await connection.execute(
      'UPDATE stillpoint_community_rate_limits SET report_count = report_count + 1, last_report_at = UTC_TIMESTAMP(3) WHERE token_hash = ? AND activity_date = UTC_DATE()',
      [tokenHash],
    );
  }
  return true;
}

export function createCommunityRouter(pool) {
  const router = Router();
  router.use((_req, res, next) => {
    if (!pool) return res.status(503).json({ error: 'Hosted community notes are not configured for this local app.' });
    next();
  });

  router.get('/comments/:readingKey', async (req, res) => {
    const readingKey = req.params.readingKey;
    if (!isValidReadingKey(readingKey)) return invalidRequest(res, 'This reading cannot host community notes.');
    try {
      const [rows] = await pool.execute(
        `SELECT id, body, created_at FROM stillpoint_community_comments
         WHERE reading_key = ? AND status = 'visible'
           AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 90 DAY
         ORDER BY created_at DESC LIMIT ${COMMENT_LIST_LIMIT}`,
        [readingKey],
      );
      return res.json({ comments: rows.reverse().map(publicComment), limit: COMMENT_LIST_LIMIT });
    } catch {
      return res.status(503).json({ error: 'Community notes are temporarily unavailable.' });
    }
  });

  router.post('/comments', async (req, res) => {
    const { commentId, readingKey, text, browserToken, deletionToken } = req.body ?? {};
    if (!isValidReadingKey(readingKey)) return invalidRequest(res, 'This reading cannot host community notes.');
    if (!isValidRandomToken(commentId) || !isValidRandomToken(browserToken) || !isValidRandomToken(deletionToken)) return invalidRequest(res, 'A local privacy token could not be created. Check browser storage and try again.');
    const checked = validateCommentText(text);
    if (!checked.ok) return invalidRequest(res, checked.reason);

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const allowed = await takeDailySlot(connection, hashRandomToken(browserToken), 'comment');
      if (!allowed) {
        await connection.rollback();
        return res.status(429).json({ error: 'The local-browser comment limit or short cooldown has been reached. Please return later.' });
      }
      await connection.execute(
        `INSERT INTO stillpoint_community_comments (id, reading_key, body, deletion_token_hash, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))`,
        [commentId, readingKey, checked.text, hashRandomToken(deletionToken)],
      );
      const [rows] = await connection.execute('SELECT id, body, created_at FROM stillpoint_community_comments WHERE id = ?', [commentId]);
      await connection.commit();
      return res.status(201).json({ comment: publicComment(rows[0]) });
    } catch {
      if (connection) { try { await connection.rollback(); } catch { /* transaction already closed */ } }
      return res.status(503).json({ error: 'Your note could not be saved right now. Please try again later.' });
    } finally {
      connection?.release();
    }
  });

  router.post('/comments/:commentId/report', async (req, res) => {
    const { commentId } = req.params;
    const { browserToken } = req.body ?? {};
    if (!isValidRandomToken(commentId) || !isValidRandomToken(browserToken)) return invalidRequest(res, 'This report could not be submitted.');
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [comments] = await connection.execute('SELECT id, status FROM stillpoint_community_comments WHERE id = ? FOR UPDATE', [commentId]);
      if (!comments.length || comments[0].status !== 'visible') {
        await connection.rollback();
        return res.status(404).json({ error: 'This community note is no longer available.' });
      }
      const reporterHash = hashRandomToken(browserToken);
      const [prior] = await connection.execute('SELECT comment_id FROM stillpoint_community_reports WHERE comment_id = ? AND reporter_token_hash = ?', [commentId, reporterHash]);
      if (prior.length) {
        await connection.commit();
        return res.json({ message: 'This note has already been reported from this browser.' });
      }
      if (!(await takeDailySlot(connection, reporterHash, 'report'))) {
        await connection.rollback();
        return res.status(429).json({ error: 'The daily report limit or short cooldown has been reached.' });
      }
      await connection.execute('INSERT IGNORE INTO stillpoint_community_reports (comment_id, reporter_token_hash, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))', [commentId, reporterHash]);
      const [counts] = await connection.execute('SELECT COUNT(*) AS total FROM stillpoint_community_reports WHERE comment_id = ?', [commentId]);
      const hidden = Number(counts[0]?.total ?? 0) >= REPORT_HIDE_THRESHOLD;
      if (hidden) await connection.execute("UPDATE stillpoint_community_comments SET status = 'hidden' WHERE id = ?", [commentId]);
      await connection.commit();
      return res.json({ message: 'Thank you. The note has been recorded for community review.' });
    } catch {
      if (connection) { try { await connection.rollback(); } catch { /* transaction already closed */ } }
      return res.status(503).json({ error: 'The report could not be submitted right now.' });
    } finally {
      connection?.release();
    }
  });

  router.delete('/comments/:commentId', async (req, res) => {
    const { commentId } = req.params;
    const { deletionToken } = req.body ?? {};
    if (!isValidRandomToken(commentId) || !isValidRandomToken(deletionToken)) return invalidRequest(res, 'This deletion request could not be verified.');
    try {
      const [result] = await pool.execute('DELETE FROM stillpoint_community_comments WHERE id = ? AND deletion_token_hash = ?', [commentId, hashRandomToken(deletionToken)]);
      if (result.affectedRows !== 1) return res.status(404).json({ error: 'This note could not be deleted from this browser.' });
      return res.json({ message: 'Your community note was deleted.' });
    } catch {
      return res.status(503).json({ error: 'The note could not be deleted right now.' });
    }
  });

  return router;
}
