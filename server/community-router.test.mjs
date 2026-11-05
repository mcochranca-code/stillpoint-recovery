import express from 'express';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCommunityRouter } from './community-router.mjs';
import { hashRandomToken } from './community-policy.mjs';

const reflectionKey = 'stillpoint:2026-11-01:daily-reflection-01';
const boardKey = 'stillpoint:community-notes';
const commentId = randomUUID();
const browserToken = randomUUID();
const deletionToken = randomUUID();
let comments = [];
let reports = [];
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
      const found = comments.find((row) => row.id === parameters[0]);
      return [found ? [{ id: found.id, status: found.status }] : [], []];
    }
    if (sql.includes('SELECT comment_id FROM stillpoint_community_reports')) {
      return [reports.filter((row) => row.comment_id === parameters[0] && row.reporter_token_hash === parameters[1]).map((row) => ({ comment_id: row.comment_id })), []];
    }
    if (sql.includes('SELECT COUNT(*) AS total')) {
      return [[{ total: reports.filter((row) => row.comment_id === parameters[0]).length }], []];
    }
    if (sql.includes('SELECT id, body, created_at FROM stillpoint_community_comments WHERE id = ?')) {
      const found = comments.find((row) => row.id === parameters[0]);
      return [found ? [{ id: found.id, body: found.body, created_at: found.created_at }] : [], []];
    }
    if (sql.startsWith('INSERT INTO stillpoint_community_comments')) {
      comments.push({ id: parameters[0], reading_key: parameters[1], body: parameters[2], created_at: new Date(), status: 'visible', deletion_token_hash: parameters[3] });
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith('INSERT IGNORE INTO stillpoint_community_reports')) {
      reports.push({ comment_id: parameters[0], reporter_token_hash: parameters[1] });
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith('UPDATE stillpoint_community_comments SET status')) {
      const found = comments.find((row) => row.id === parameters[0]);
      if (found) found.status = 'hidden';
      return [{ affectedRows: found ? 1 : 0 }, []];
    }
    return [{ affectedRows: 1 }, []];
  },
};

const pool = {
  async getConnection() { return connection; },
  async execute(sql, parameters = []) {
    if (sql.includes('WHERE reading_key = ?')) {
      const matches = comments.filter((row) => row.reading_key === parameters[0] && row.status === 'visible');
      return [matches.map((row) => ({ id: row.id, body: row.body, created_at: row.created_at })), []];
    }
    if (sql.startsWith('DELETE FROM stillpoint_community_comments')) {
      const index = comments.findIndex((row) => row.id === parameters[0] && row.deletion_token_hash === parameters[1]);
      if (index < 0) return [{ affectedRows: 0 }, []];
      comments.splice(index, 1);
      return [{ affectedRows: 1 }, []];
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
  it('reads, posts, reports, and deletes an opt-in reflection note without real database writes', async () => {
    comments = [];
    reports = [];
    const firstRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(reflectionKey)}`);
    expect(firstRead.status).toBe(200);
    expect(await firstRead.json()).toMatchObject({ comments: [] });

    const posted = await fetch(`${baseUrl}/api/community/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, readingKey: reflectionKey, text: 'One step at a time.', browserToken, deletionToken }),
    });
    expect(posted.status).toBe(201);
    expect(await posted.json()).toMatchObject({ comment: { id: commentId, text: 'One step at a time.' } });

    const secondRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(reflectionKey)}`);
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

  it('keeps standalone board notes in their own namespace and does not return them in reflection reads', async () => {
    comments = [];
    const boardNoteId = randomUUID();
    const boardDeletionToken = randomUUID();
    const boardPost = await fetch(`${baseUrl}/api/community/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: boardNoteId, readingKey: boardKey, text: 'There is room to begin again.', browserToken: randomUUID(), deletionToken: boardDeletionToken }),
    });
    expect(boardPost.status).toBe(201);

    const boardRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(boardKey)}`);
    expect(await boardRead.json()).toMatchObject({ comments: [{ id: boardNoteId, text: 'There is room to begin again.' }] });
    const reflectionRead = await fetch(`${baseUrl}/api/community/comments/${encodeURIComponent(reflectionKey)}`);
    expect(await reflectionRead.json()).toMatchObject({ comments: [] });
  });

  it('rejects a deletion token that does not own a note', async () => {
    comments = [{ id: commentId, reading_key: reflectionKey, body: 'Private test fixture', created_at: new Date(), status: 'visible', deletion_token_hash: hashRandomToken(deletionToken) }];
    const wrong = await fetch(`${baseUrl}/api/community/comments/${commentId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletionToken: randomUUID() }),
    });
    expect(wrong.status).toBe(404);
    expect(comments).toHaveLength(1);
    comments = [];
  });
});
