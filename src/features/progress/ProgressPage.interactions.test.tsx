import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/database';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import { localDateKey } from '../../domain/time';
import type { RecoveryProfile, UserPreferences } from '../../domain/types';

const mocks = vi.hoisted(() => ({ notify: vi.fn(), context: {} as never }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));

import { ProgressPage } from './ProgressPage';

const DAY = 86_400_000;

function profileStartedDaysAgo(days: number): RecoveryProfile {
  const startAt = new Date(Date.now() - days * DAY).toISOString();
  return { ...defaultRecoveryProfile(), startAt, localStartDate: startAt.slice(0, 10), intention: 'Stay present' };
}

function setContext(preferences: UserPreferences, profile?: RecoveryProfile) {
  mocks.context = { preferences, profile, notify: mocks.notify } as never;
}

function renderPage() {
  return render(<MemoryRouter><ProgressPage /></MemoryRouter>);
}

describe('ProgressPage with local records', () => {
  beforeEach(async () => {
    mocks.notify.mockReset();
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.preferences.put({ ...defaultPreferences(), onboardingComplete: true });
    setContext(defaultPreferences());
  });

  it('adds a personal goal, records steps up to the target, and removes it after confirming', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: '  Read before bed ' } });
    fireEvent.change(screen.getByLabelText('Target count'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Goal unit'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add personal goal' }));

    expect(await screen.findByText('Read before bed')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 steps')).toBeInTheDocument();
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your personal goal is saved on this device.'));

    fireEvent.click(screen.getByRole('button', { name: 'Record a step for Read before bed' }));
    expect(await screen.findByText('1 / 1 steps')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record a step for Read before bed' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(3));
    expect(screen.getByText('1 / 1 steps')).toBeInTheDocument();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove goal Read before bed' }));
    expect(screen.getByText('Read before bed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove goal Read before bed' }));
    await waitFor(() => expect(screen.queryByText('Read before bed')).toBeNull());
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('asks for a name and positive target before saving a goal', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add personal goal' }));
    expect(mocks.notify).toHaveBeenCalledWith('Give your personal goal a name and a target greater than zero.');
    expect(await db.personalGoals.count()).toBe(0);
  });

  it('validates, saves, and removes personal milestones before a start date is chosen', async () => {
    renderPage();
    expect(screen.getByText(/You can prepare a milestone now/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add personal milestone' }));
    expect(mocks.notify).toHaveBeenCalledWith('Give your personal milestone a name and a whole-number day target.');

    fireEvent.change(screen.getByLabelText('Milestone name'), { target: { value: 'Halfway' } });
    fireEvent.change(screen.getByLabelText('Days after your chosen start date'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add personal milestone' }));
    expect(await screen.findByText('Halfway')).toBeInTheDocument();
    expect(screen.getByText('45 days')).toBeInTheDocument();
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your personal milestone is saved on this device.'));

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove personal milestone Halfway' }));
    expect(screen.getByText('Halfway')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove personal milestone Halfway' }));
    await waitFor(() => expect(screen.queryByText('Halfway')).toBeNull());
  });

  it('marks reached personal milestones, shows the timeline, and opens the share preview', async () => {
    const profile = profileStartedDaysAgo(40);
    setContext(defaultPreferences(), profile);
    await db.personalMilestones.bulkPut([
      { id: 'pm-30', label: 'Thirty of my own', daysAfterStart: 30, createdAt: new Date().toISOString() },
      { id: 'pm-60', label: 'Sixty ahead', daysAfterStart: 60, createdAt: new Date().toISOString() },
    ]);
    await db.milestoneRecords.put({ id: 'm-7', milestoneId: '7-days', label: '7 days', startAt: profile.startAt!, reachedAt: new Date(Date.now() - 33 * DAY).toISOString() });
    await db.earnedCharms.put({ id: 'award-1', charmId: 'seven-day-oak', earnedAt: new Date(Date.now() - 33 * DAY).toISOString() });

    renderPage();

    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining('A personal milestone is reached: Thirty of my own')));
    expect((await db.personalMilestones.get('pm-30'))?.achievedAt).toBeTruthy();
    expect((await db.personalMilestones.get('pm-60'))?.achievedAt).toBeUndefined();
    expect(await screen.findByText('Thirty of my own · personal milestone')).toBeInTheDocument();
    expect(screen.getByText('7 days milestone')).toBeInTheDocument();
    expect(screen.getByText('seven day oak charm collected')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText(/Next ·/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Share milestone 7 days' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('hides timeline details and durations in discreet mode', async () => {
    setContext({ ...defaultPreferences(), discreetMode: true }, profileStartedDaysAgo(12));
    await db.milestoneRecords.put({ id: 'm-7', milestoneId: '7-days', label: '7 days', startAt: new Date().toISOString(), reachedAt: new Date(Date.now() - 5 * DAY).toISOString() });
    renderPage();
    expect(screen.getByLabelText('Duration hidden in discreet mode')).toHaveTextContent('Hidden');
    expect(await screen.findByText('A saved personal moment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Share milestone/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Open Today/ })).toBeInTheDocument();
  });

  it('summarizes meditation, journal, and faith activity and switches chart periods', async () => {
    setContext({ ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['christian'] }, christianExtras: true });
    const today = localDateKey(new Date());
    await db.dailyActivity.put({ id: `activity:${today}`, localDate: today, reflectionsCompleted: 1, scriptureExplored: 2, meditationMinutes: 5, journalEntries: 1, gratitudeEntries: 0 });
    await db.meditationSessions.put({ id: 's1', exerciseId: 'calm', exerciseName: 'Calm', plannedMinutes: 5, elapsedSeconds: 300, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: 'completed' });
    await db.scriptureActivity.put({ id: 'sa1', scriptureId: 'psalm-23' } as never);
    renderPage();

    expect(await screen.findByText('1 completed session')).toBeInTheDocument();
    expect(screen.getByText('0 reflections · 1 scripture passages')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Week activity chart/ })).toBeInTheDocument();

    const periods = screen.getByRole('group', { name: 'Activity chart period' });
    fireEvent.click(within(periods).getByRole('button', { name: 'Month' }));
    expect(await screen.findByRole('img', { name: /Month activity chart/ })).toBeInTheDocument();
    fireEvent.click(within(periods).getByRole('button', { name: 'Year' }));
    expect(await screen.findByRole('img', { name: /Year activity chart/ })).toBeInTheDocument();
  });

  it('opens the Journey Collection, filters charms, and saves a private memory', async () => {
    await db.recoveryProfiles.put(profileStartedDaysAgo(3));
    await db.earnedCharms.put({ id: 'award-ql', charmId: 'quiet-mind', earnedAt: new Date().toISOString() });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /The Journey Collection/ }));

    expect(await screen.findByText('Small signs of care, collected along the way.')).toBeInTheDocument();
    expect(await screen.findByText('Collected', { selector: '.pill' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Seven Day Oak progress|seven/i })).toBeInTheDocument();

    const filters = screen.getByRole('group', { name: 'Filter charms by category' });
    fireEvent.click(within(filters).getByRole('button', { name: 'Gratitude' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Show charms not yet collected/ }));
    expect(screen.getByText(/No collected charms in this category yet/)).toBeInTheDocument();

    fireEvent.click(within(filters).getByRole('button', { name: 'Meditation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a private memory' }));
    fireEvent.change(screen.getByPlaceholderText('What would you like to remember about this moment?'), { target: { value: '  First calm morning ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your private charm memory is saved on this device.'));
    expect((await db.earnedCharms.get('award-ql'))?.memory).toBe('First calm morning');
    expect(await screen.findByText('First calm morning')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit your private memory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit your private memory' }));
    fireEvent.change(screen.getByPlaceholderText('What would you like to remember about this moment?'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The private charm memory was removed.'));

    fireEvent.click(screen.getByRole('button', { name: /Back to overview/ }));
    expect(await screen.findByText('Progress, in your own measure.')).toBeInTheDocument();
  });

  it('hides a saved charm memory in discreet mode', async () => {
    await db.preferences.put({ ...defaultPreferences(), onboardingComplete: true, discreetMode: true });
    await db.earnedCharms.put({ id: 'award-ql', charmId: 'quiet-mind', earnedAt: new Date().toISOString(), memory: 'Secret' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /The Journey Collection/ }));
    expect(await screen.findByText('Details hidden while discreet display is on.')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).toBeNull();
  });
});
