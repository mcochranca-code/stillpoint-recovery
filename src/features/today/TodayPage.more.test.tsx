import { act, cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import type { RecoveryProfile, UserPreferences } from '../../domain/types';

// The full coverage run is slow on small CI machines; give database-backed UI updates room to settle.
configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
  updatePreferences: vi.fn(),
  pending: new Set<Promise<unknown>>(),
}));

/** Record each background database task the page starts so a test can let it finish before the next one resets storage. */
function tracked<T extends (...args: never[]) => Promise<unknown>>(fn: T): T {
  return ((...args: Parameters<T>) => {
    const promise = fn(...args);
    mocks.pending.add(promise);
    void promise.catch(() => undefined).finally(() => mocks.pending.delete(promise));
    return promise;
  }) as T;
}

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../components/AmbientAudioPlayer', () => ({ AmbientAudioPlayer: () => null }));
vi.mock('./NaDailyReadingCard', () => ({ NaDailyReadingCard: () => null }));
vi.mock('./OdbResourcesCard', () => ({ OdbResourcesCard: () => null }));
vi.mock('./CommunityDiscussion', () => ({ CommunityDiscussion: () => <p>Community notes</p> }));
vi.mock('../../db/milestones', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/milestones')>();
  return { ...actual, syncReachedMilestones: tracked(actual.syncReachedMilestones) };
});
vi.mock('../../db/achievements', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/achievements')>();
  return { ...actual, awardEligibleCharms: tracked(actual.awardEligibleCharms) };
});
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryTodayPageMoreTest') };
});

import { db } from '../../db/database';
import { TodayPage } from './TodayPage';
import { dateOnlyToTimestamp, localDateKey } from '../../domain/time';

const previousDate = '2026-10-31';
const datedProfile = (): RecoveryProfile => ({
  ...defaultRecoveryProfile(),
  startAt: dateOnlyToTimestamp(previousDate, '00:00'),
  localStartDate: previousDate,
  localStartTime: '00:00',
  focus: 'Alcohol',
  intention: 'Stay honest',
});

function setContext(preferences: Partial<UserPreferences> = {}, profile: RecoveryProfile | null = datedProfile()) {
  mocks.context = {
    preferences: { ...defaultPreferences(), traditionChoicePending: false, ...preferences },
    profile,
    updatePreferences: mocks.updatePreferences,
    notify: mocks.notify,
  } as never;
}

function renderToday() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/journal" element={<h1>Journal destination</h1>} />
        <Route path="/reset" element={<h1>Reset destination</h1>} />
        <Route path="/field-guide" element={<h1>Field guide destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.preferences.put(defaultPreferences());
  mocks.notify.mockReset();
  mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
  setContext();
});

afterEach(async () => {
  cleanup();
  while (mocks.pending.size) await Promise.allSettled([...mocks.pending]);
  db.close();
  vi.unstubAllGlobals();
});

describe('TodayPage reflection actions', () => {
  it('marks the reflection, saves it to the journal and toggles it as a favorite', async () => {
    renderToday();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as reflected' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Reflection marked for today. You can return to it whenever you like.'));
    expect(await screen.findByRole('button', { name: /Reflected today/ })).toBeInTheDocument();
    const [stored] = await db.dailyReflections.toArray();
    expect(stored).toMatchObject({ localDate: localDateKey(new Date()), favorite: false, favoriteKey: 0 });
    expect(stored?.reflectedAt).toBeTruthy();
    const activity = await db.dailyActivity.get(localDateKey(new Date()));
    expect(activity?.reflectionsCompleted).toBe(1);

    // Marking again keeps the original timestamp and does not double-count the activity.
    fireEvent.click(screen.getByRole('button', { name: /Reflected today/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(2));
    expect((await db.dailyReflections.toArray())[0]?.reflectedAt).toBe(stored?.reflectedAt);
    expect((await db.dailyActivity.get(localDateKey(new Date())))?.reflectionsCompleted).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Love this reflection' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Saved with your reflections.'));
    const favoriteButton = await screen.findByRole('button', { name: 'Remove reflection from favorites' });
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
    expect((await db.dailyReflections.toArray())[0]).toMatchObject({ favorite: true, favoriteKey: 1, reflectedAt: stored?.reflectedAt });

    // A favorited reflection that is marked again keeps its favorite key.
    fireEvent.click(screen.getByRole('button', { name: /Reflected today/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(4));
    expect((await db.dailyReflections.toArray())[0]).toMatchObject({ favorite: true, favoriteKey: 1 });

    fireEvent.click(favoriteButton);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Removed from saved reflections.'));
    expect((await db.dailyReflections.toArray())[0]).toMatchObject({ favorite: false, favoriteKey: 0 });

    fireEvent.click(screen.getByRole('button', { name: /Save to journal/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Saved to your private journal on this device.'));
    const [entry] = await db.journalEntries.toArray();
    expect(entry).toMatchObject({ type: 'daily-reflection' });
    expect(entry?.body).toContain('A principle for today:');
    expect((await db.dailyActivity.get(localDateKey(new Date())))?.journalEntries).toBe(1);
  });

  it('expands the full reflection reading and collapses it again', () => {
    renderToday();
    const expand = screen.getByRole('button', { name: 'Read full original reflection' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByRole('button', { name: 'Read full original reflection' })).toBeInTheDocument();
  });

  it('reads the reflection aloud, stops on request and resets when speech ends', () => {
    const utterances: { text: string; onend: (() => void) | null }[] = [];
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string;
      onend: (() => void) | null = null;
      constructor(text: string) { this.text = text; utterances.push(this); }
    });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel } });
    try {
      renderToday();
      fireEvent.click(screen.getByRole('button', { name: 'Read reflection aloud' }));
      expect(speak).toHaveBeenCalledTimes(1);
      expect(utterances[0]?.text.length).toBeGreaterThan(10);
      fireEvent.click(screen.getByRole('button', { name: 'Stop reading reflection aloud' }));
      expect(cancel).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: 'Read reflection aloud' }));
      act(() => { utterances[1]?.onend?.(); });
      expect(screen.getByRole('button', { name: 'Read reflection aloud' })).toBeInTheDocument();
    } finally {
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    }
  });

  it('explains when text-to-speech is unavailable', () => {
    expect('speechSynthesis' in window).toBe(false);
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Read reflection aloud' }));
    expect(mocks.notify).toHaveBeenCalledWith('Text-to-speech is not available in this browser.');
  });

  it('shows community notes only when the person has turned them on', () => {
    setContext({ communityNotesEnabled: true });
    renderToday();
    expect(screen.getByText('Community notes')).toBeInTheDocument();
  });
});

describe('TodayPage recovery date dialog', () => {
  it('begins again today with a private note and offers next support choices', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: /Begin again today/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Begin again today' });
    expect(dialog).toHaveTextContent('A fresh start, with your story intact');
    expect(dialog).toHaveTextContent('Beginning again is part of recovery');
    const keep = screen.getByRole('checkbox', { name: /Keep a private note of the stretch behind you/ });
    expect(keep).toBeChecked();
    expect(screen.getByLabelText('Start date')).toHaveValue(localDateKey(new Date()));

    fireEvent.click(screen.getByRole('button', { name: 'Begin again' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Today is a new beginning. Everything you saved is still yours.'));
    const [history] = await db.recoveryDateHistory.toArray();
    expect(history).toMatchObject({ note: 'began-again', previousStartAt: datedProfile().startAt });
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ localStartDate: localDateKey(new Date()), focus: 'Alcohol', intention: 'Stay honest' });

    expect(await screen.findByRole('dialog', { name: 'What support would feel helpful now?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Write a few lines/ }));
    expect(await screen.findByRole('heading', { name: 'Journal destination' })).toBeInTheDocument();
  });

  it('lets the support choices be skipped or closed', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recovery date' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Optional start time'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save date' }));

    await screen.findByRole('dialog', { name: 'What support would feel helpful now?' });
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ localStartDate: '2026-10-01', localStartTime: '00:00' });
    expect(await db.recoveryDateHistory.count()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'What support would feel helpful now?' })).not.toBeInTheDocument());
  });

  it('refuses empty and future dates without saving', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recovery date' }));
    const dateInput = screen.getByLabelText('Start date');
    const form = dateInput.closest('form')!;

    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.submit(form);
    expect(mocks.notify).toHaveBeenCalledWith('Choose a date, or close this window and continue without one.');

    const tomorrow = localDateKey(new Date(Date.now() + 2 * 86_400_000));
    fireEvent.change(dateInput, { target: { value: tomorrow } });
    fireEvent.submit(form);
    expect(mocks.notify).toHaveBeenCalledWith('Choose today or an earlier date. You can adjust your date whenever you need.');
    expect(await db.recoveryProfiles.get('recovery-profile')).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Recovery date' })).not.toBeInTheDocument());
  });

  it('reports an invalid time instead of saving', async () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recovery date' }));
    const timeInput = screen.getByLabelText('Optional start time') as HTMLInputElement;
    // jsdom sanitizes time inputs, so force a malformed value the way an older browser might submit it.
    Object.defineProperty(timeInput, 'value', { configurable: true, get: () => '99:99', set: () => {} });
    fireEvent.change(timeInput, { target: { value: '99:99' } });
    fireEvent.submit(timeInput.closest('form')!);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Choose a valid local recovery date and time.'));
    expect(await db.recoveryProfiles.get('recovery-profile')).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Save date' })).not.toBeDisabled();
  });

  it('sets a first recovery date without opening support choices', async () => {
    setContext({}, { ...defaultRecoveryProfile() });
    renderToday();
    expect(screen.getByRole('heading', { name: 'A date, if and when it helps' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'No recovery date set yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Begin again today/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set a recovery date' }));
    expect(screen.getByLabelText('Start date')).toHaveValue(localDateKey(new Date()));
    fireEvent.click(screen.getByRole('button', { name: 'Close date editor' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Set a recovery date' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Keep a local date-change record/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save date' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith(expect.stringMatching(/date is updated/)));
    expect(await db.recoveryDateHistory.count()).toBe(0);
    expect(screen.queryByRole('dialog', { name: 'What support would feel helpful now?' })).not.toBeInTheDocument();
  });

  it('works without a stored profile at all', async () => {
    setContext({}, null);
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Set a recovery date' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save date' }));
    await waitFor(async () => expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ focus: '', intention: '' }));
  });
});

describe('TodayPage display preferences', () => {
  it('hides recovery details in discreet mode and lets the person reveal them', () => {
    setContext({ discreetMode: true });
    renderToday();
    expect(screen.getByText('A private space')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private timer' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Recovery timer and milestone details are hidden' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Begin again today/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review private date' }));
    expect(screen.getByRole('dialog', { name: 'Recovery date' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show private details/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ discreetMode: false });
  });

  it('shows a days-only counter without live seconds', () => {
    setContext({ counterStyle: 'days', liveCounter: false });
    renderToday();
    expect(screen.getByRole('heading', { name: 'Time you have chosen for yourself' })).toBeInTheDocument();
    expect(screen.queryByText('seconds')).not.toBeInTheDocument();
    expect(screen.queryByText('hours')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progress toward your next milestone' })).toBeInTheDocument();
  });

  it('describes a one-day stretch in the singular', () => {
    const start = new Date(Date.now() - 86_400_000 - 3_600_000 - 60_000);
    setContext({}, { ...datedProfile(), startAt: start.toISOString(), localStartDate: null });
    renderToday();
    expect(screen.getByText(/^1 day, 1 hour and 1 minute in recovery$/)).toBeInTheDocument();
    expect(screen.getByText(/to go$/)).toBeInTheDocument();
  });

  it('announces milestones reached in the last few minutes', async () => {
    const start = new Date(Date.now() - 24 * 3_600_000 - 60_000);
    setContext({}, { ...datedProfile(), startAt: start.toISOString() });
    renderToday();
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith(expect.stringMatching(/^A milestone reached: 24 hours\./)));
  });
});
