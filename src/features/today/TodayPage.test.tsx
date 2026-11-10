import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../components/AmbientAudioPlayer', () => ({ AmbientAudioPlayer: () => null }));
vi.mock('./NaDailyReadingCard', () => ({ NaDailyReadingCard: () => null }));
vi.mock('./OdbResourcesCard', () => ({ OdbResourcesCard: () => null }));
vi.mock('./CommunityDiscussion', () => ({ CommunityDiscussion: () => null }));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryTodayPageTest') };
});

import { db } from '../../db/database';
import { TodayPage } from './TodayPage';
import { dateOnlyToTimestamp } from '../../domain/time';

describe('TodayPage recovery-date changes', () => {
  const previousDate = '2026-10-31';

  beforeEach(async () => {
    await db.delete();
    await db.open();
    mocks.notify.mockReset();
    mocks.context = {
      preferences: defaultPreferences(),
      profile: {
        ...defaultRecoveryProfile(),
        startAt: dateOnlyToTimestamp(previousDate, '00:00'),
        localStartDate: previousDate,
        localStartTime: '00:00',
      },
      updatePreferences: vi.fn(),
      notify: mocks.notify,
    } as never;
    await db.preferences.put(defaultPreferences());
    await db.journalEntries.add({
      id: 'journal:preserved', type: 'free-writing', title: 'Private note', body: 'Keep this',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [], gratitude: [],
    });
  });

  afterEach(() => {
    db.close();
  });

  it('updates the chosen date, records history only by choice, and preserves journal data', async () => {
    render(<MemoryRouter><TodayPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Adjust date' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Keep a local date-change record/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save date' }));

    await waitFor(async () => {
      expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ localStartDate: '2026-11-01' });
      expect(await db.recoveryDateHistory.count()).toBe(1);
      expect(await db.journalEntries.get('journal:preserved')).toMatchObject({ body: 'Keep this' });
    });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith(
      'Your recovery date is updated. Your saved entries, sessions and charms remain yours.',
    ));
  });
});
