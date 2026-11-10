import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/database';
import {
  clearCommunityBrowserToken,
  CommunityResponseError,
  countCommentCharacters,
  deleteCommunityComment,
  fetchReadingComments,
  getCommunityBrowserToken,
  reportReadingComment,
  saveCommunityCredential,
  submitReadingComment,
} from './communityClient';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const credential = { id: 'note-1', readingKey: 'stillpoint:community-notes', text: 'Hi', createdAt: '2026-11-01T00:00:00.000Z', deletionToken: 'del-token' };

beforeEach(async () => {
  window.localStorage.clear();
  await db.communityCredentials.clear();
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('community browser token', () => {
  it('creates, persists, reuses, and clears a UUID token', () => {
    const first = getCommunityBrowserToken();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getCommunityBrowserToken()).toBe(first);
    clearCommunityBrowserToken();
    expect(window.localStorage.getItem('stillpoint-community-browser-token-v1')).toBeNull();
  });

  it('replaces a malformed stored token', () => {
    window.localStorage.setItem('stillpoint-community-browser-token-v1', 'tampered');
    const token = getCommunityBrowserToken();
    expect(token).not.toBe('tampered');
    expect(window.localStorage.getItem('stillpoint-community-browser-token-v1')).toBe(token);
  });

  it('returns null when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getCommunityBrowserToken()).toBeNull();
    expect(() => clearCommunityBrowserToken()).not.toThrow();
  });

  it('counts characters by code point so emoji count once', () => {
    expect(countCommentCharacters('hi 🙏')).toBe(4);
  });
});

describe('community requests', () => {
  it('treats a non-array comments payload as empty and a non-object payload as empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ comments: 'nope' })).mockResolvedValueOnce(jsonResponse(null)));
    await expect(fetchReadingComments('k')).resolves.toEqual([]);
    await expect(fetchReadingComments('k')).resolves.toEqual([]);
  });

  it('posts a note and returns the hosted copy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ comment: { id: 'a', text: 'Hi', createdAt: 'x' } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    await expect(submitReadingComment({ commentId: 'a', readingKey: 'k', text: 'Hi', browserToken: 'b', deletionToken: 'd' })).resolves.toEqual({ id: 'a', text: 'Hi', createdAt: 'x' });
    expect(fetchMock).toHaveBeenCalledWith('/api/community/comments', expect.objectContaining({ method: 'POST', credentials: 'omit' }));
  });

  it('raises a CommunityResponseError carrying the status and server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Slow down.' }, 429)));
    const error = await submitReadingComment({ commentId: 'a', readingKey: 'k', text: 'Hi', browserToken: 'b', deletionToken: 'd' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CommunityResponseError);
    expect(error).toMatchObject({ message: 'Slow down.', status: 429 });
  });

  it('reports a note, using the server message or a default thank-you', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Recorded.' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ error: 'Limit reached.' }, 429))
      .mockResolvedValueOnce(new Response('oops', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(reportReadingComment('id/1', 'b')).resolves.toBe('Recorded.');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/community/comments/id%2F1/report');
    await expect(reportReadingComment('id', 'b')).resolves.toBe('Thank you. The report was recorded.');
    await expect(reportReadingComment('id', 'b')).rejects.toThrow('Limit reached.');
    await expect(reportReadingComment('id', 'b')).rejects.toThrow('The report could not be submitted.');
  });

  it('deletes a hosted note and its local credential, treating 404 as already gone', async () => {
    await saveCommunityCredential(credential);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await deleteCommunityComment(credential);
    expect(fetchMock).toHaveBeenCalledWith('/api/community/comments/note-1', expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ deletionToken: 'del-token' }) }));
    expect(await db.communityCredentials.get('note-1')).toBeUndefined();
  });

  it('keeps the local credential when the hosted delete fails', async () => {
    await saveCommunityCredential(credential);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(deleteCommunityComment(credential)).rejects.toThrow('The hosted note could not be deleted right now.');
    expect(await db.communityCredentials.get('note-1')).toEqual(credential);
  });
});
