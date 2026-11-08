import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchReadingComments, submitReadingComment } from './communityClient';

afterEach(() => { vi.unstubAllGlobals(); });

describe('community client', () => {
  it('shows the API message when hosted notes are unavailable (503 JSON)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Hosted community notes are not configured for this app.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    await expect(fetchReadingComments('stillpoint:2026-11-01:daily-reflection-01')).rejects.toThrow('Hosted community notes are not configured for this app.');
  });

  it('falls back to a friendly message when the host returns a non-JSON error page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })));
    await expect(fetchReadingComments('stillpoint:2026-11-01:daily-reflection-01')).rejects.toThrow('Community notes are temporarily unavailable.');
    await expect(submitReadingComment({ commentId: 'a', readingKey: 'b', text: 'c', browserToken: 'd', deletionToken: 'e' })).rejects.toThrow('Your note could not be posted.');
  });

  it('returns comments from a successful same-origin response', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ comments: [{ id: '1', text: 'Hi', createdAt: '2026-11-01T00:00:00.000Z' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchReadingComments('stillpoint:2026-11-01:daily-reflection-01')).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/community/comments/stillpoint%3A2026-11-01%3Adaily-reflection-01', expect.objectContaining({ credentials: 'omit' }));
  });
});
