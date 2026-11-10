import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  notify: vi.fn(),
  credentials: [] as unknown[],
  fetchReadingComments: vi.fn(),
  submitReadingComment: vi.fn(),
  reportReadingComment: vi.fn(),
  deleteCommunityComment: vi.fn(),
  saveCommunityCredential: vi.fn(),
  getCommunityBrowserToken: vi.fn(),
  credentialDelete: vi.fn(),
}));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.credentials }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => ({ notify: mocks.notify }) }));
vi.mock('../../db/database', () => ({
  db: { communityCredentials: { toArray: vi.fn().mockResolvedValue([]), delete: mocks.credentialDelete, put: vi.fn() } },
}));
vi.mock('../../domain/communityClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../domain/communityClient')>();
  return {
    ...actual,
    fetchReadingComments: mocks.fetchReadingComments,
    submitReadingComment: mocks.submitReadingComment,
    reportReadingComment: mocks.reportReadingComment,
    deleteCommunityComment: mocks.deleteCommunityComment,
    saveCommunityCredential: mocks.saveCommunityCredential,
    getCommunityBrowserToken: mocks.getCommunityBrowserToken,
  };
});

import { CommunityResponseError } from '../../domain/communityClient';
import { CommunityDiscussion } from './CommunityDiscussion';

const existing = { id: 'c1', text: 'Grateful for today', createdAt: '2026-11-01T17:00:00.000Z' };

async function openReflectionNotes() {
  render(<CommunityDiscussion date="2026-11-01" reflectionId="daily-reflection-01" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open notes' }));
  await waitFor(() => expect(mocks.fetchReadingComments).toHaveBeenCalled());
}

function fillNote(value: string, consent = true) {
  fireEvent.change(screen.getByLabelText('Add a short note'), { target: { value } });
  if (consent) fireEvent.click(screen.getByRole('checkbox', { name: /will be public and hosted/ }));
}

describe('CommunityDiscussion reflection thread', () => {
  beforeEach(() => {
    mocks.credentials = [];
    mocks.fetchReadingComments.mockReset().mockResolvedValue([existing]);
    mocks.submitReadingComment.mockReset();
    mocks.reportReadingComment.mockReset();
    mocks.deleteCommunityComment.mockReset();
    mocks.saveCommunityCredential.mockReset().mockResolvedValue(undefined);
    mocks.getCommunityBrowserToken.mockReset().mockReturnValue('browser-token');
    mocks.credentialDelete.mockReset().mockResolvedValue(undefined);
    mocks.notify.mockReset();
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('loads notes for the reading key, then closes and reopens without refetching', async () => {
    await openReflectionNotes();
    expect(mocks.fetchReadingComments).toHaveBeenCalledWith('stillpoint:2026-11-01:daily-reflection-01');
    expect(await screen.findByText('Grateful for today')).toBeInTheDocument();
    expect(screen.getByText('1 note')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close notes' }));
    expect(screen.getByText(/Opening this section loads public notes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open notes' }));
    expect(mocks.fetchReadingComments).toHaveBeenCalledTimes(1);
  });

  it('shows a load error and confirms a successful refresh', async () => {
    mocks.fetchReadingComments.mockRejectedValueOnce(new Error('Community notes are temporarily unavailable.'));
    await openReflectionNotes();
    expect(await screen.findByRole('alert')).toHaveTextContent('Community notes are temporarily unavailable.');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Community notes are refreshed.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses a fallback message when loading fails with a non-error value', async () => {
    mocks.fetchReadingComments.mockRejectedValueOnce('down');
    await openReflectionNotes();
    expect(await screen.findByRole('alert')).toHaveTextContent('Community notes are temporarily unavailable.');
  });

  it('requires consent and a non-empty note before posting', async () => {
    await openReflectionNotes();
    const form = screen.getByRole('button', { name: /Post note/ }).closest('form') as HTMLFormElement;
    fillNote('A kind word', false);
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please confirm you understand the note will be public and hosted');

    fillNote('   ');
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('Write a note of 1–120 characters.');
    expect(mocks.submitReadingComment).not.toHaveBeenCalled();
  });

  it('caps the note at 120 characters and counts them', async () => {
    await openReflectionNotes();
    fireEvent.change(screen.getByLabelText('Add a short note'), { target: { value: 'a'.repeat(150) } });
    expect(screen.getByLabelText('Add a short note')).toHaveValue('a'.repeat(120));
    expect(screen.getByText('120/120')).toBeInTheDocument();
  });

  it('explains when the browser cannot keep a removal key', async () => {
    mocks.getCommunityBrowserToken.mockReturnValue(null);
    await openReflectionNotes();
    fillNote('Stay steady');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This browser could not save the private removal key.');
  });

  it('saves the removal key before posting and shows the new note', async () => {
    mocks.submitReadingComment.mockResolvedValue({ id: 'new', text: 'Stay steady', createdAt: '2026-11-01T18:00:00.000Z' });
    await openReflectionNotes();
    fillNote('  Stay steady  ');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));

    expect(await screen.findByText('Your short note is now visible with this original reading.')).toBeInTheDocument();
    expect(screen.getByText('Stay steady')).toBeInTheDocument();
    expect(screen.getByText('2 notes')).toBeInTheDocument();
    expect(mocks.submitReadingComment).toHaveBeenCalledWith(expect.objectContaining({ text: 'Stay steady', browserToken: 'browser-token', readingKey: 'stillpoint:2026-11-01:daily-reflection-01' }));
    expect(mocks.saveCommunityCredential).toHaveBeenCalledTimes(2);
    expect(mocks.saveCommunityCredential.mock.invocationCallOrder[0]).toBeLessThan(mocks.submitReadingComment.mock.invocationCallOrder[0] ?? 0);
    expect(mocks.notify).toHaveBeenCalledWith('Your optional community note was posted.');
    expect(screen.getByLabelText('Add a short note')).toHaveValue('');
  });

  it('drops the local key and shows the server message when the note is rejected', async () => {
    mocks.submitReadingComment.mockRejectedValue(new CommunityResponseError('Links are not allowed.', 422));
    await openReflectionNotes();
    fillNote('see example dot com');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Links are not allowed.');
    expect(mocks.credentialDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps the local key when the post outcome is unknown', async () => {
    mocks.submitReadingComment.mockRejectedValue(new TypeError('network'));
    await openReflectionNotes();
    fillNote('Stay steady');
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm that your note was posted.');
    expect(mocks.credentialDelete).not.toHaveBeenCalled();
  });

  it('reports a note and reloads the thread', async () => {
    mocks.reportReadingComment.mockResolvedValue('Thank you. The report was recorded.');
    await openReflectionNotes();
    fireEvent.click(await screen.findByRole('button', { name: /Report/ }));
    expect(await screen.findByText('Thank you. The report was recorded.')).toBeInTheDocument();
    expect(mocks.reportReadingComment).toHaveBeenCalledWith('c1', 'browser-token');
    await waitFor(() => expect(mocks.fetchReadingComments).toHaveBeenCalledTimes(2));
  });

  it('shows report failures and missing report tokens', async () => {
    mocks.reportReadingComment.mockRejectedValue(new Error('Too many reports.'));
    await openReflectionNotes();
    fireEvent.click(await screen.findByRole('button', { name: /Report/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many reports.');

    mocks.getCommunityBrowserToken.mockReturnValue(null);
    fireEvent.click(screen.getByRole('button', { name: /Report/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This browser could not save its private report limit.');
  });

  it('lets the author delete their own note after confirming', async () => {
    mocks.credentials = [{ id: 'c1', readingKey: 'k', text: existing.text, createdAt: existing.createdAt, deletionToken: 'secret' }];
    mocks.deleteCommunityComment.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await openReflectionNotes();
    const deleteButton = await screen.findByRole('button', { name: /Delete your note/ });

    fireEvent.click(deleteButton);
    expect(mocks.deleteCommunityComment).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);
    expect(await screen.findByText('Your community note was deleted.')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(mocks.deleteCommunityComment).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', deletionToken: 'secret' }));
    expect(screen.queryByText('Grateful for today')).toBeNull();
    expect(mocks.notify).toHaveBeenCalledWith('Your community note was deleted from Stillpoint.');
  });

  it('shows an error when deleting fails', async () => {
    mocks.credentials = [{ id: 'c1', readingKey: 'k', text: existing.text, createdAt: existing.createdAt, deletionToken: 'secret' }];
    mocks.deleteCommunityComment.mockRejectedValue(new Error('The hosted note could not be deleted right now.'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await openReflectionNotes();
    fireEvent.click(await screen.findByRole('button', { name: /Delete your note/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The hosted note could not be deleted right now.');
    expect(screen.getByText('Grateful for today')).toBeInTheDocument();
  });

  it('posts to the board with board-specific confirmation', async () => {
    mocks.fetchReadingComments.mockResolvedValue([]);
    mocks.submitReadingComment.mockResolvedValue({ id: 'b1', text: 'Hello all', createdAt: '2026-11-01T18:00:00.000Z' });
    render(<CommunityDiscussion mode="board" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    fireEvent.change(await screen.findByLabelText('Add a community note'), { target: { value: 'Hello all' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /will be public and hosted/ }));
    fireEvent.click(screen.getByRole('button', { name: /Post note/ }));
    expect(await screen.findByText('Your short note is now visible on the Community Notes board.')).toBeInTheDocument();
    expect(mocks.notify).toHaveBeenCalledWith('Your community note was posted.');
    fireEvent.click(screen.getByRole('button', { name: 'Close board' }));
    expect(screen.getByText(/The board is independent of the daily reflection thread/)).toBeInTheDocument();
  });
});
