import express from 'express';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCommunityRouter } from './community-router.mjs';
import { hashRandomToken } from './community-policy.mjs';

const readingKey = 'stillpoint:2026-11-01:daily-reflection-01';
const commentId = randomUUID();
const browserToken = randomUUID();
const deletionToken = randomUUID();
let comment = null;
let server;
let baseUrl;

const connection = {
  async beginTransaction() {},
  async commit() {},
  async rollback() {},
  release() {},
  async execute(sql, parameters = []) {
    if (sql.includes('SELECT comment_count, report_count')) {
      return [[{ comment_count: 0, report_count: 0, since_comment_seconds: null, since_report_seconds: null }], []];
    }
    if (sql.includes('SELECT id, status FROM stillpoint_community_comments')) {
      return [comment ? [{ id: comment.id, status: comment.status }] : [], []];
    }
    if (sql.includes('SELECT comment_id FROM stillpoint_community_reports')) return [[], []];
    if (sql.includes('SELECT COUNT(*) AS total')) return [[{ total: 1 }], []];
    if (sql.includes('SELECT id, body, created_at FROM stillpoint_community_comments WHERE id = ?')) {
      return [comment ? [{ id: comment.id, body: comment.body, created_at: comment.created_at }] : [], []];
    }
    if (sql.startsWith('INSERT INTO stillpoint_community_comments')) {
      comment = { id: parameters[0], reading_key: parameters[1], body: parameters[2], created_at: new Date(), status: 'visible', deletion_token_hash: parameters[3] };
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith('UPDATE stillpoint_community_comments SET status')) {
      if (comment) comment.status = 'hidden';
      return [{ affectedRows: 1 }, []];
    }
    return [{ affectedRows: 1 }, []];
  },
};

const pool = {
  async getConnection() { return connection; },
  async execute(sql, parameters = []) {
    if (sql.includes('WHERE reading_key = ?')) {
      expect(sql).toContain('LIMIT 50');
      expect(sql).not.toMatch(/LIMIT\s*\?/);
      expect(parameters).toEqual([readingKey]);
      return [[comment?.reading_key === parameters[0] && comment.status === 'visible'
        ? { id: comment.id, body: comment.body, created_at: comment.created_at }
        : []].flat(), []];
    }
    if (sql.startsWith('DELETE FROM stillpoint_community_comments')) {
      const valid = comment?.id === parameters[0] && comment.deletion_token_hash === parameters[1];
      if (valid) comment = null;
      return [{ affectedRows: valid ? 1 : 0 }, []];
    }
    return [[], []];
  },
};

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/community', createCommunityRouter(pool));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('community API route flow (in-memory database only)', () => {
  it('reads, posts, reports, and deletes an opt-in note without any real database writes', async () => {
    comment = null;
    const firstRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(readingKey)}`);
    expect(firstRead.status).toBe(200);
    expect(await firstRead.json()).toMatchObject({ comments: [] });

    const posted = await fetch(`${baseUrl}/api/community/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, readingKey, text: 'One step at a time.', browserToken, deletionToken }),
    });
    expect(posted.status).toBe(201);
    expect(await posted.json()).toMatchObject({ comment: { id: commentId, text: 'One step at a time.' } });

    const secondRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(readingKey)}`);
    expect(await secondRead.json()).toMatchObject({ comments: [{ id: commentId, text: 'One step at a time.' }] });

    const reported = await fetch(`${baseUrl}/api/community/comments/${commentId}/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ browserToken }),
    });
    expect(reported.status).toBe(200);
    expect(await reported.json()).toMatchObject({ message: expect.stringContaining('Thank you') });

    const deleted = await fetch(`${baseUrl}/api/community/comments/${commentId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletionToken }),
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({ message: 'Your community note was deleted.' });
  });

  it('rejects a deletion token that does not own a note', async () => {
    comment = { id: commentId, reading_key: readingKey, body: 'Private test fixture', created_at: new Date(), status: 'visible', deletion_token_hash: hashRandomToken(deletionToken) };
    const wrong = await fetch(`${baseUrl}/api/community/comments/${commentId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletionToken: randomUUID() }),
    });
    expect(wrong.status).toBe(404);
    expect(comment).not.toBeNull();
    comment = null;
  });
});
