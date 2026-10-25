import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../../db/database';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import type { JournalDraft, JournalEntry } from '../../domain/types';
import { JournalPage } from './JournalPage';

const notify = vi.hoisted(() => vi.fn());

vi.mock('../../app/AppContext', () => ({
  useAppContext: () => ({
    preferences: { discreetMode: false, timeFormat: '12h' },
    profile: { startAt: null },
    notify,
  }),
}));

const existingEntry: JournalEntry = {
  id: 'journal:existing',
  type: 'free-writing',
  title: 'A saved thought',
  body: 'The original words.',
  createdAt: '2026-10-22T12:30:00.000Z',
  updatedAt: '2026-10-22T12:30:00.000Z',
  tags: ['patience'],
  gratitude: [],
};

beforeEach(async () => {
  notify.mockClear();
  await db.delete();
  await db.open();
  await db.preferences.add(defaultPreferences());
  await db.recoveryProfiles.add(defaultRecoveryProfile());
});

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  db.close();
});

describe('JournalPage data mutations', () => {
  it('creates a gratitude entry, updates activity, and removes its saved draft', async () => {
    render(<JournalPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New entry' }));

    fireEvent.change(screen.getByLabelText('Entry type'), { target: { value: 'gratitude' } });
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Small comforts' } });
    fireEvent.change(screen.getByLabelText('Your words'), { target: { value: 'A quiet morning.' } });
    fireEvent.change(screen.getByLabelText(/Gratitude list/), { target: { value: 'A quiet morning.\nA kind message.' } });
    fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'today, patience' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 10_000 });
    const [saved] = await db.journalEntries.toArray();
    expect(await db.journalEntries.count()).toBe(1);
    expect(saved).toMatchObject({
      type: 'gratitude',
      title: 'Small comforts',
      body: 'A quiet morning.',
      tags: ['today', 'patience'],
      gratitude: ['A quiet morning.', 'A kind message.'],
    });
    expect(await db.journalDrafts.count()).toBe(0);

    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(await db.dailyActivity.get(localDate)).toMatchObject({ journalEntries: 1, gratitudeEntries: 1 });
  });

  it('recovers the last saved draft into the editor without committing it as an entry', async () => {
    const draft: JournalDraft = {
      id: 'active-journal-draft',
      type: 'trigger',
      title: 'A difficult moment',
      body: 'I paused and called a friend.',
      dateTimeLocal: '2026-10-20T09:30',
      mood: 'steady',
      tags: ['support'],
      gratitude: [],
      trigger: 'An unexpected change',
      copingStrategy: 'Reach out before reacting.',
      updatedAt: '2026-10-20T09:35:00.000Z',
    };
    await db.journalDrafts.add(draft);

    render(<JournalPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New entry' }));

    expect(await screen.findByText(/Draft recovered/)).toBeTruthy();
    expect((screen.getByLabelText('Entry type') as HTMLSelectElement).value).toBe('trigger');
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe(draft.title);
    expect((screen.getByLabelText('Your words') as HTMLTextAreaElement).value).toBe(draft.body);
    expect((screen.getByLabelText(/Situation or craving/) as HTMLTextAreaElement).value).toBe(draft.trigger);
    expect((screen.getByLabelText(/What helped or might help/) as HTMLTextAreaElement).value).toBe(draft.copingStrategy);
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('edits an existing record in place without counting a second journal entry', async () => {
    await db.journalEntries.add(existingEntry);
    render(<JournalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit A saved thought' }));
    fireEvent.change(screen.getByLabelText('Your words'), { target: { value: 'A clearer version of my words.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 10_000 });
    expect((await db.journalEntries.get(existingEntry.id))?.body).toBe('A clearer version of my words.');
    expect(await db.journalEntries.count()).toBe(1);
    expect(await db.dailyActivity.count()).toBe(0);
  });

  it('requires deletion confirmation and removes an entry only after approval', async () => {
    await db.journalEntries.add(existingEntry);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<JournalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete A saved thought' }));
    expect(await db.journalEntries.count()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete A saved thought' }));
    await waitFor(async () => expect(await db.journalEntries.count()).toBe(0), { timeout: 5000 });
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });
});
