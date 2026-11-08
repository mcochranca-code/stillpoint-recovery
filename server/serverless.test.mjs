import { describe, expect, it, vi } from 'vitest';
import { CLEANUP_INTERVAL_MS, createCommunityHandler, normalizeCommunityUrl } from './serverless.mjs';

const readingKey = 'stillpoint:2026-11-01:daily-reflection-01';

function lambdaEvent(path, { method = 'GET', body } = {}) {
  return {
    httpMethod: method,
    path,
    headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    requestContext: {},
  };
}

function fakeDatabase({ migrate } = {}) {
  const pool = {
    execute: vi.fn(async (sql) => {
      if (sql.includes('WHERE reading_key = ?')) {
        return [[{ id: '9f5e1f4e-1111-4111-8111-111111111111', body: 'One step at a time.', created_at: new Date('2026-11-01T10:00:00Z') }], []];
      }
      return [[], []];
    }),
    getConnection: vi.fn(),
  };
  return {
    pool,
    migrateCommunitySchema: vi.fn(migrate ?? (async () => {})),
    removeExpiredCommunityData: vi.fn(async () => {}),
  };
}

describe('normalizeCommunityUrl', () => {
  it('maps the Netlify function path onto the public API mount', () => {
    expect(normalizeCommunityUrl('/.netlify/functions/community/comments/abc')).toBe('/api/community/comments/abc');
    expect(normalizeCommunityUrl('/.netlify/functions/community?x=1')).toBe('/api/community?x=1');
    expect(normalizeCommunityUrl('/api/community/comments/abc')).toBe('/api/community/comments/abc');
    expect(normalizeCommunityUrl('/.netlify/functions/community-other/x')).toBe('/.netlify/functions/community-other/x');
  });
});

describe('Netlify community function without a database', () => {
  it('answers 503 JSON for community routes instead of crashing', async () => {
    const handler = createCommunityHandler({ loadDatabase: async () => null });
    const response = await handler(lambdaEvent(`/api/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toMatchObject({ error: expect.any(String) });
  });

  it('answers 503 JSON for posts too', async () => {
    const handler = createCommunityHandler({ loadDatabase: async () => null });
    const response = await handler(lambdaEvent('/.netlify/functions/community/comments', { method: 'POST', body: { text: 'hi' } }), {});
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body).error).toBeTruthy();
  });

  it('treats an invalid DATABASE_URL as unavailable rather than crashing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createCommunityHandler({ loadDatabase: async () => { throw new Error('bad url'); } });
    const response = await handler(lambdaEvent(`/api/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(response.statusCode).toBe(503);
    expect(error).toHaveBeenCalled();
  });
});

describe('Netlify community function with a database', () => {
  it('routes both public and function paths to the community router and migrates once', async () => {
    const database = fakeDatabase();
    const handler = createCommunityHandler({ loadDatabase: async () => database });

    const first = await handler(lambdaEvent(`/api/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toMatchObject({ comments: [{ text: 'One step at a time.' }] });
    expect(first.headers['cache-control']).toBe('no-store');

    const second = await handler(lambdaEvent(`/.netlify/functions/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(second.statusCode).toBe(200);

    expect(database.migrateCommunitySchema).toHaveBeenCalledTimes(1);
    expect(database.migrateCommunitySchema).toHaveBeenCalledWith({ lockTimeoutSeconds: 5 });
  });

  it('rejects invalid input with the router validation and unknown routes with 404 JSON', async () => {
    const handler = createCommunityHandler({ loadDatabase: async () => fakeDatabase() });
    const invalid = await handler(lambdaEvent('/api/community/comments/not%20valid!'), {});
    expect(invalid.statusCode).toBe(400);
    const missing = await handler(lambdaEvent('/api/community/nothing-here/a/b/c'), {});
    expect(missing.statusCode).toBe(404);
    expect(JSON.parse(missing.body)).toMatchObject({ error: expect.any(String) });
  });

  it('answers 503 when migration fails and retries it on the next request', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const database = fakeDatabase({ migrate: async () => { attempts += 1; if (attempts === 1) throw new Error('lock'); } });
    const handler = createCommunityHandler({ loadDatabase: async () => database });

    const failed = await handler(lambdaEvent(`/api/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(failed.statusCode).toBe(503);
    const recovered = await handler(lambdaEvent(`/api/community/comments/${encodeURIComponent(readingKey)}`), {});
    expect(recovered.statusCode).toBe(200);
    expect(database.migrateCommunitySchema).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalled();
  });

  it('throttles expired-note cleanup to once per interval', async () => {
    let clock = 10 * CLEANUP_INTERVAL_MS;
    const database = fakeDatabase();
    const handler = createCommunityHandler({ loadDatabase: async () => database, now: () => clock });
    const path = `/api/community/comments/${encodeURIComponent(readingKey)}`;

    await handler(lambdaEvent(path), {});
    await handler(lambdaEvent(path), {});
    expect(database.removeExpiredCommunityData).toHaveBeenCalledTimes(1);

    clock += CLEANUP_INTERVAL_MS;
    await handler(lambdaEvent(path), {});
    expect(database.removeExpiredCommunityData).toHaveBeenCalledTimes(2);
  });
});
