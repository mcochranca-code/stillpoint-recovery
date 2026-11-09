import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../components/AmbientAudioPlayer', () => ({ AmbientAudioPlayer: () => null }));
vi.mock('./NaDailyReadingCard', () => ({ NaDailyReadingCard: () => null }));
vi.mock('./OdbResourcesCard', () => ({ OdbResourcesCard: () => null }));
vi.mock('./CommunityDiscussion', () => ({ CommunityDiscussion: () => null }));
// Milestone and charm syncing run in background effects that can outlive a test; their behavior is covered by db tests.
vi.mock('../../db/achievements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db/achievements')>()),
  awardEligibleCharms: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../db/milestones', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db/milestones')>()),
  syncReachedMilestones: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryTodayActionsTest') };
});

import { db } from '../../db/database';
import { TodayPage } from './TodayPage';
import { dateOnlyToTimestamp, localDateKey } from '../../domain/time';

function renderToday() {
  return render(<MemoryRouter><TodayPage /></MemoryRouter>);
}

function setContext(preferences = defaultPreferences(), startDate: string | null = '2026-10-01') {
  mocks.context = {
    preferences,
    profile: startDate
      ? { ...defaultRecoveryProfile(), startAt: dateOnlyToTimestamp(startDate, '00:00'), localStartDate: startDate, localStartTime: '00:00' }
      : defaultRecoveryProfile(),
    updatePreferences: mocks.updatePreferences,
    notify: mocks.notify,
  } as never;
}

describe('TodayPage reflection and date actions', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    mocks.notify.mockReset();
    mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
    await db.preferences.put(defaultPreferences());
    setContext();
  });

  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
  });

  it('marks the reflection, saves it to the journal and toggles it as a favorite', async () => {
    renderToday();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as reflected' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Reflection marked for today. You can return to it whenever you like.'));
    expect(await screen.findByRole('button', { name: /Reflected today/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save to journal/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Saved to your private journal on this device.'));
    expect(await db.journalEntries.where('type').equals('daily-reflection').count()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Love this reflection' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Saved with your reflections.'));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove reflection from favorites' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Removed from saved reflections.'));

    fireEvent.click(screen.getByRole('button', { name: 'Read full original reflection' }));
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('reads the reflection aloud and stops on request, or explains when speech is unavailable', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal('SpeechSynthesisUtterance', class { onend: (() => void) | null = null; constructor(readonly text: string) {} });
    const { unmount } = renderToday();

    fireEvent.click(screen.getByRole('button', { name: 'Read reflection aloud' }));
    expect(speak).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop reading reflection aloud' }));
    expect(cancel).toHaveBeenCalledTimes(1);
    unmount();

    Reflect.deleteProperty(window, 'speechSynthesis');
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Read reflection aloud' }));
    expect(mocks.notify).toHaveBeenCalledWith('Text-to-speech is not available in this browser.');
  });

  it('asks for a date that is set and not in the future, and closes the editor on cancel', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recovery date' }));
    const dateInput = screen.getByLabelText('Start date');

    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.submit(dateInput.closest('form')!);
    expect(mocks.notify).toHaveBeenCalledWith('Choose a date, or close this window and continue without one.');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    fireEvent.change(dateInput, { target: { value: localDateKey(tomorrow) } });
    fireEvent.submit(dateInput.closest('form')!);
    expect(mocks.notify).toHaveBeenCalledWith('Choose today or an earlier date. You can adjust your date whenever you need.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('begins again today, keeps a note of the stretch behind, and offers a next step', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: /Begin again/ }));
    expect(screen.getByRole('heading', { name: 'Begin again today' })).toBeInTheDocument();
    expect(screen.getByText(/behind you still happened and still count/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Optional start time'), { target: { value: '00:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Begin again' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Today is a new beginning. Everything you saved is still yours.'));
    const [history] = await db.recoveryDateHistory.toArray();
    expect(history).toMatchObject({ note: 'began-again' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('keeps recovery details hidden in discreet display until the person reveals them', () => {
    setContext({ ...defaultPreferences(), discreetMode: true });
    renderToday();
    expect(screen.getByText('Private timer')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Recovery timer and milestone details are hidden' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show private details/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ discreetMode: false });
  });

  it('offers to set a date when none is saved', () => {
    setContext(defaultPreferences(), null);
    renderToday();
    expect(screen.getByText('A date, if and when it helps')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'No recovery date set yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set a recovery date' }));
    expect(screen.getByLabelText('Start date')).toHaveValue(localDateKey(new Date()));
  });
});
