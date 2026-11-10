import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../../db/database';
import { CommunityDiscussion } from './CommunityDiscussion';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => ({ notify }) }));

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const existing = { id: 'c-1', text: 'Grateful for today.', createdAt: '2026-11-01T12:00:00.000Z' };

function stubFetch(route: Route) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => route(url, init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function openNotes(name = 'Open notes') {
  fireEvent.click(screen.getByRole('button', { name }));
}

function writeNote(text: string, consent = true) {
  fireEvent.change(screen.getByLabelText('Add a short note'), { target: { value: text } });
  if (consent) fireEvent.click(screen.getByRole('checkbox', { name: /I understand this note will be public/ }));
}

describe('Community notes for a reading', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.communityCredentials.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('loads the reading thread on open, refreshes on request and closes again', async () => {
    const fetchMock = stubFetch(() => json({ comments: [existing] }));
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    expect(screen.getByText(/Opening this section loads public notes/)).toBeInTheDocument();

    openNotes();
    expect(await screen.findByText('Grateful for today.')).toBeInTheDocument();
    expect(screen.getByText('1 note')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/community/comments/${encodeURIComponent('stillpoint:2026-11-01:daily-01')}`);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Community notes are refreshed.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close notes' }));
    openNotes();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the hosted error when the thread cannot load', async () => {
    stubFetch(() => json({ error: 'Hosted community notes are not configured for this app.' }, 503));
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    expect(await screen.findByRole('alert')).toHaveTextContent('Hosted community notes are not configured for this app.');
  });

  it('requires public-posting consent and a note before posting', async () => {
    const fetchMock = stubFetch(() => json({ comments: [] }));
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    await screen.findByText('No notes yet. A kind, brief thought can be enough.');

    writeNote('A kind thought', false);
    fireEvent.submit(screen.getByRole('button', { name: /Post note/ }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please confirm you understand the note will be public and hosted before posting.');

    writeNote('   ');
    fireEvent.submit(screen.getByRole('button', { name: /Post note/ }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a note of 1–120 characters.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts a note, keeps its removal key on this device and lets the author delete it', async () => {
    const posted = { id: '', text: 'Breathing through it.', createdAt: '2026-11-02T08:00:00.000Z' };
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST' && url === '/api/community/comments') {
        const body = JSON.parse(String(init.body));
        posted.id = body.commentId;
        return json({ comment: posted }, 201);
      }
      if (init?.method === 'DELETE') return json({ ok: true });
      return json({ comments: [] });
    });
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    await screen.findByText('No notes yet. A kind, brief thought can be enough.');

    writeNote('Breathing through it.');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByText('Your short note is now visible with this original reading.')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('Your optional community note was posted.');
    expect(await db.communityCredentials.get(posted.id)).toMatchObject({ text: 'Breathing through it.' });

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const remove = await screen.findByRole('button', { name: /Delete your note/ });
    fireEvent.click(remove);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    fireEvent.click(remove);
    expect(await screen.findByText('Your community note was deleted.')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith('Your community note was deleted from Stillpoint.');
    await waitFor(async () => expect(await db.communityCredentials.get(posted.id)).toBeUndefined());
  });

  it('removes the saved key when the host rejects a note, and keeps it when the result is unknown', async () => {
    let mode: 'reject' | 'network' = 'reject';
    stubFetch((_url, init) => {
      if (init?.method === 'POST') {
        if (mode === 'network') throw new TypeError('Failed to fetch');
        return json({ error: 'Links are not allowed in community notes.' }, 422);
      }
      return json({ comments: [] });
    });
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    await screen.findByText('No notes yet. A kind, brief thought can be enough.');

    writeNote('see example dot com');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Links are not allowed in community notes.');
    await waitFor(async () => expect(await db.communityCredentials.count()).toBe(0));

    mode = 'network';
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/We could not confirm that your note was posted/);
    expect(await db.communityCredentials.count()).toBe(1);
  });

  it('reports a note and refreshes the thread, or shows why the report failed', async () => {
    let reportOk = true;
    stubFetch((url) => {
      if (url.endsWith('/report')) return reportOk ? json({ message: 'Thanks, the report was recorded.' }) : json({ error: 'Too many reports from this browser.' }, 429);
      return json({ comments: [existing] });
    });
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    fireEvent.click(await screen.findByRole('button', { name: /Report/ }));
    expect(await screen.findByText('Thanks, the report was recorded.')).toBeInTheDocument();

    reportOk = false;
    fireEvent.click(screen.getByRole('button', { name: /Report/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many reports from this browser.');
  });

  it('shows a delete failure without removing the note', async () => {
    await db.communityCredentials.put({ id: existing.id, readingKey: 'stillpoint:2026-11-01:daily-01', text: existing.text, createdAt: existing.createdAt, deletionToken: 'secret-token' });
    stubFetch((_url, init) => (init?.method === 'DELETE' ? json({ error: 'nope' }, 500) : json({ comments: [existing] })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    fireEvent.click(await screen.findByRole('button', { name: /Delete your note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The hosted note could not be deleted right now.');
    expect(screen.getByText('Grateful for today.')).toBeInTheDocument();
  });

  it('explains when this browser cannot keep a private key for posting or reporting', async () => {
    stubFetch(() => json({ comments: [existing] }));
    render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-01" />);
    openNotes();
    await screen.findByText('Grateful for today.');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });

    fireEvent.click(screen.getByRole('button', { name: /Report/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This browser could not save its private report limit.');

    writeNote('A kind thought');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This browser could not save the private removal key. Enable site storage before posting.');
  });

  it('posts to the separate board with board wording', async () => {
    stubFetch((_url, init) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        return json({ comment: { id: body.commentId, text: body.text, createdAt: '2026-11-02T08:00:00.000Z' } }, 201);
      }
      return json({ comments: [] });
    });
    render(<CommunityDiscussion mode="board" />);
    openNotes('Open board');
    await screen.findByText('No notes yet. A kind, brief thought can be enough.');
    fireEvent.change(screen.getByLabelText('Add a community note'), { target: { value: 'One day at a time.' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand this note will be public/ }));
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByText('Your short note is now visible on the Community Notes board.')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('Your community note was posted.');
    expect(screen.getByRole('button', { name: 'Close board' })).toBeInTheDocument();
  });
});
