import express from 'express';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createCommunityRouter } from './community-router.mjs';
import { MAX_COMMENTS_PER_BROWSER_PER_DAY, MAX_REPORTS_PER_BROWSER_PER_DAY, REPORT_HIDE_THRESHOLD } from './community-policy.mjs';

const readingKey = 'stillpoint:2026-11-01:daily-reflection-01';
let server;

async function startApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/community', createCommunityRouter(pool));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}/api/community`;
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(() => resolve()));
  server = undefined;
});

/** A scripted connection: `handlers` match SQL fragments to results; everything is recorded. */
function scriptedConnection(handlers = {}, options = {}) {
  const calls = [];
  const connection = {
    calls,
    released: 0,
    rolledBack: 0,
    committed: 0,
    async beginTransaction() {},
    async commit() { connection.committed += 1; },
    async rollback() {
      connection.rolledBack += 1;
      if (options.rollbackThrows) throw new Error('already closed');
    },
    release() { connection.released += 1; },
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      for (const [fragment, result] of Object.entries(handlers)) {
        if (sql.includes(fragment)) {
          if (result instanceof Error) throw result;
          return typeof result === 'function' ? result(parameters) : result;
        }
      }
      return [{ affectedRows: 1 }, []];
    },
  };
  return connection;
}

function poolWith(connection, execute = async () => [[], []]) {
  return { async getConnection() { return connection; }, execute };
}

const freshLimits = { comment_count: 0, report_count: 0, since_comment_seconds: null, since_report_seconds: null };

function post(url, body, method = 'POST') {
  return fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function validComment(overrides = {}) {
  return { commentId: randomUUID(), readingKey, text: 'One day at a time.', browserToken: randomUUID(), deletionToken: randomUUID(), ...overrides };
}

describe('community router guards and failures', () => {
  it('answers 503 for every route when no database is configured', async () => {
    const base = await startApp(null);
    const response = await fetch(`${base}/comments/${encodeURIComponent(readingKey)}`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Hosted community notes are not configured for this app.' });
  });

  it('rejects invalid reading keys, tokens, and text with 400', async () => {
    const base = await startApp(poolWith(scriptedConnection()));
    const badRead = await fetch(`${base}/comments/not-a-key`);
    expect(badRead.status).toBe(400);
    expect(await badRead.json()).toEqual({ error: 'This reading cannot host community notes.' });

    expect((await post(`${base}/comments`, validComment({ readingKey: 'nope' }))).status).toBe(400);
    const badToken = await post(`${base}/comments`, validComment({ browserToken: 'short' }));
    expect(await badToken.json()).toEqual({ error: expect.stringContaining('A local privacy token could not be created') });
    expect((await post(`${base}/comments`, validComment({ text: '' }))).status).toBe(400);

    const badReport = await post(`${base}/comments/not-a-uuid/report`, { browserToken: randomUUID() });
    expect(badReport.status).toBe(400);
    expect(await badReport.json()).toEqual({ error: 'This report could not be submitted.' });

    const badDelete = await post(`${base}/comments/${randomUUID()}`, {}, 'DELETE');
    expect(badDelete.status).toBe(400);
    expect(await badDelete.json()).toEqual({ error: 'This deletion request could not be verified.' });
  });

  it('serializes string timestamps as UTC and returns notes oldest first', async () => {
    const execute = async () => [[
      { id: 'b', body: 'Newer', created_at: '2026-11-01 18:00:00.000' },
      { id: 'a', body: 'Older', created_at: '2026-11-01 17:00:00.000' },
    ], []];
    const base = await startApp(poolWith(scriptedConnection(), execute));
    const response = await fetch(`${base}/comments/${encodeURIComponent(readingKey)}`);
    expect(await response.json()).toEqual({
      comments: [
        { id: 'a', text: 'Older', createdAt: '2026-11-01T17:00:00.000Z' },
        { id: 'b', text: 'Newer', createdAt: '2026-11-01T18:00:00.000Z' },
      ],
      limit: 50,
    });
  });

  it('returns 503 when reading or deleting hits a database error', async () => {
    const base = await startApp(poolWith(scriptedConnection(), async () => { throw new Error('db down'); }));
    const read = await fetch(`${base}/comments/${encodeURIComponent(readingKey)}`);
    expect(read.status).toBe(503);
    expect(await read.json()).toEqual({ error: 'Community notes are temporarily unavailable.' });

    const removed = await post(`${base}/comments/${randomUUID()}`, { deletionToken: randomUUID() }, 'DELETE');
    expect(removed.status).toBe(503);
    expect(await removed.json()).toEqual({ error: 'The note could not be deleted right now.' });
  });

  it('enforces the daily comment limit and the short cooldown', async () => {
    const atLimit = scriptedConnection({ 'SELECT comment_count': [[{ ...freshLimits, comment_count: MAX_COMMENTS_PER_BROWSER_PER_DAY }], []] });
    let base = await startApp(poolWith(atLimit));
    const limited = await post(`${base}/comments`, validComment());
    expect(limited.status).toBe(429);
    expect(atLimit.rolledBack).toBe(1);
    expect(atLimit.released).toBe(1);
    await new Promise((resolve) => server.close(() => resolve()));

    const coolingDown = scriptedConnection({ 'SELECT comment_count': [[{ ...freshLimits, since_comment_seconds: 3 }], []] });
    base = await startApp(poolWith(coolingDown));
    expect((await post(`${base}/comments`, validComment())).status).toBe(429);
    await new Promise((resolve) => server.close(() => resolve()));

    const missingRow = scriptedConnection({ 'SELECT comment_count': [[], []] });
    base = await startApp(poolWith(missingRow));
    expect((await post(`${base}/comments`, validComment())).status).toBe(429);
  });

  it('rolls back and returns 503 when saving a note fails, even if rollback also fails', async () => {
    const failing = scriptedConnection({
      'SELECT comment_count': [[freshLimits], []],
      'INSERT INTO stillpoint_community_comments': new Error('write failed'),
    }, { rollbackThrows: true });
    const base = await startApp(poolWith(failing));
    const response = await post(`${base}/comments`, validComment());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Your note could not be saved right now. Please try again later.' });
    expect(failing.rolledBack).toBe(1);
    expect(failing.released).toBe(1);
  });

  it('returns 503 without a connection when the pool cannot connect', async () => {
    const pool = { async getConnection() { throw new Error('no connection'); }, execute: async () => [[], []] };
    const base = await startApp(pool);
    expect((await post(`${base}/comments`, validComment())).status).toBe(503);
    const report = await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() });
    expect(report.status).toBe(503);
    expect(await report.json()).toEqual({ error: 'The report could not be submitted right now.' });
  });

  it('answers 404 when reporting a missing or hidden note', async () => {
    const hidden = scriptedConnection({ 'SELECT id, status': [[{ id: 'x', status: 'hidden' }], []] });
    const base = await startApp(poolWith(hidden));
    const response = await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'This community note is no longer available.' });
    expect(hidden.rolledBack).toBe(1);
  });

  it('does not double-count a repeat report from the same browser', async () => {
    const repeat = scriptedConnection({
      'SELECT id, status': [[{ id: 'x', status: 'visible' }], []],
      'SELECT comment_id FROM stillpoint_community_reports': [[{ comment_id: 'x' }], []],
    });
    const base = await startApp(poolWith(repeat));
    const response = await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'This note has already been reported from this browser.' });
    expect(repeat.calls.some(({ sql }) => sql.startsWith('INSERT IGNORE INTO stillpoint_community_reports'))).toBe(false);
  });

  it('limits reports per browser per day and by cooldown', async () => {
    const handlers = (limits) => ({
      'SELECT id, status': [[{ id: 'x', status: 'visible' }], []],
      'SELECT comment_id FROM stillpoint_community_reports': [[], []],
      'SELECT comment_count': [[{ ...freshLimits, ...limits }], []],
    });
    let base = await startApp(poolWith(scriptedConnection(handlers({ report_count: MAX_REPORTS_PER_BROWSER_PER_DAY }))));
    const limited = await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'The daily report limit or short cooldown has been reached.' });
    await new Promise((resolve) => server.close(() => resolve()));

    base = await startApp(poolWith(scriptedConnection(handlers({ since_report_seconds: 0 }))));
    expect((await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() })).status).toBe(429);
  });

  it('hides a note once reports reach the threshold', async () => {
    const reaching = scriptedConnection({
      'SELECT id, status': [[{ id: 'x', status: 'visible' }], []],
      'SELECT comment_id FROM stillpoint_community_reports': [[], []],
      'SELECT comment_count': [[{ ...freshLimits, since_report_seconds: 60 }], []],
      'SELECT COUNT(*) AS total': [[{ total: REPORT_HIDE_THRESHOLD }], []],
    });
    const base = await startApp(poolWith(reaching));
    const response = await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() });
    expect(response.status).toBe(200);
    expect(reaching.calls.some(({ sql }) => sql.includes("SET status = 'hidden'"))).toBe(true);
    expect(reaching.committed).toBe(1);
  });

  it('keeps a note visible below the threshold and recovers from a failed report insert', async () => {
    const below = scriptedConnection({
      'SELECT id, status': [[{ id: 'x', status: 'visible' }], []],
      'SELECT comment_id FROM stillpoint_community_reports': [[], []],
      'SELECT comment_count': [[freshLimits], []],
      'SELECT COUNT(*) AS total': [[], []],
    });
    let base = await startApp(poolWith(below));
    expect((await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() })).status).toBe(200);
    expect(below.calls.some(({ sql }) => sql.includes("SET status = 'hidden'"))).toBe(false);
    await new Promise((resolve) => server.close(() => resolve()));

    const failing = scriptedConnection({
      'SELECT id, status': [[{ id: 'x', status: 'visible' }], []],
      'SELECT comment_id FROM stillpoint_community_reports': [[], []],
      'SELECT comment_count': [[freshLimits], []],
      'INSERT IGNORE INTO stillpoint_community_reports': new Error('write failed'),
    }, { rollbackThrows: true });
    base = await startApp(poolWith(failing));
    expect((await post(`${base}/comments/${randomUUID()}/report`, { browserToken: randomUUID() })).status).toBe(503);
    expect(failing.released).toBe(1);
  });
});
