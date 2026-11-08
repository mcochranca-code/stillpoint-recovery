import { db } from '../db/database';
import type { CommunityCommentCredential } from './types';

export interface PublicCommunityComment {
  id: string;
  text: string;
  createdAt: string;
}

export const COMMUNITY_NOTES_BOARD_KEY = 'stillpoint:community-notes';

export class CommunityResponseError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const BROWSER_TOKEN_KEY = 'stillpoint-community-browser-token-v1';

export function clearCommunityBrowserToken(): void {
  try { window.localStorage.removeItem(BROWSER_TOKEN_KEY); } catch { /* Storage may be unavailable. */ }
}

export function countCommentCharacters(value: string): number {
  return Array.from(value).length;
}

export function getCommunityBrowserToken(): string | null {
  try {
    const existing = window.localStorage.getItem(BROWSER_TOKEN_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const token = window.crypto.randomUUID();
    window.localStorage.setItem(BROWSER_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function saveCommunityCredential(credential: CommunityCommentCredential): Promise<void> {
  await db.communityCredentials.put(credential);
}

export async function deleteCommunityComment(credential: CommunityCommentCredential): Promise<void> {
  const response = await fetch(`/api/community/comments/${encodeURIComponent(credential.id)}`, {
    method: 'DELETE',
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ deletionToken: credential.deletionToken }),
  });
  if (!response.ok && response.status !== 404) throw new Error('The hosted note could not be deleted right now.');
  await db.communityCredentials.delete(credential.id);
}

export async function fetchReadingComments(readingKey: string): Promise<PublicCommunityComment[]> {
  const response = await fetch(`/api/community/comments/${encodeURIComponent(readingKey)}`, {
    credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' },
  });
  const payload = await response.json() as { comments?: PublicCommunityComment[]; error?: string };
  if (!response.ok) throw new Error(payload.error || 'Community notes are temporarily unavailable.');
  return Array.isArray(payload.comments) ? payload.comments : [];
}

export async function submitReadingComment(input: {
  commentId: string;
  readingKey: string;
  text: string;
  browserToken: string;
  deletionToken: string;
}): Promise<PublicCommunityComment> {
  const response = await fetch('/api/community/comments', {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json() as { comment?: PublicCommunityComment; error?: string };
  if (!response.ok || !payload.comment) throw new CommunityResponseError(payload.error || 'Your note could not be posted.', response.status);
  return payload.comment;
}

export async function reportReadingComment(commentId: string, browserToken: string): Promise<string> {
  const response = await fetch(`/api/community/comments/${encodeURIComponent(commentId)}/report`, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ browserToken }),
  });
  const payload = await response.json() as { message?: string; error?: string };
  if (!response.ok) throw new Error(payload.error || 'The report could not be submitted.');
  return payload.message || 'Thank you. The report was recorded.';
}
