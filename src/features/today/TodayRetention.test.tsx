import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';
import { db } from '../../db/database';
import { saveDailyCheckIn } from '../../db/checkIns';
import { defaultPreferences, ensureDefaults } from '../../db/repository';
import { localDateKey } from '../../domain/time';
import { LOCAL_SIGNAL_KEYS, writeLocalSignal } from '../../platform/localSignals';

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
  updatePreferences: vi.fn(),
  permission: 'default' as string,
  request: vi.fn(),
}));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: () => Promise.resolve(mocks.permission),
  requestNotificationPermission: () => mocks.request(),
}));
vi.mock('../../db/backup', async (original) => ({ ...(await original<typeof import('../../db/backup')>()), downloadJsonBackup: vi.fn() }));

import { DailyCheckIn } from './DailyCheckIn';
import { TodayNudge } from './TodayNudge';
import { WelcomeBack } from './WelcomeBack';

beforeEach(async () => {
  window.localStorage.clear();
  await db.delete();
  await db.open();
  await ensureDefaults();
  mocks.notify.mockReset();
  mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
  mocks.request.mockReset().mockResolvedValue('granted');
  mocks.permission = 'default';
  // Most tests here are about the other cards, so the reading choice is already made.
  mocks.context = { preferences: { ...defaultPreferences(), traditionChoicePending: false }, notify: mocks.notify, updatePreferences: mocks.updatePreferences } as never;
});

const withUnchosenReadings = () => { mocks.context = { ...(mocks.context as object), preferences: defaultPreferences() } as never; };

afterEach(() => { db.close(); });

const daysAgo = (days: number) => localDateKey(new Date(Date.now() - days * 86_400_000));

describe('daily check-in', () => {
  it('confirms an emotion word, exposes pressed state, and offers a pause for heavier days', async () => {
    const { container } = render(<MemoryRouter><DailyCheckIn /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'How are you arriving today?' })).toBeInTheDocument();
    const anxious = within(screen.getByRole('group', { name: 'Choose a broad feeling to explore' })).getByRole('button', { name: 'Anxious' });
    await waitFor(() => expect(anxious).toBeEnabled());
    fireEvent.click(anxious);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this fits for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save today’s check-in' }));
    await screen.findByRole('heading', { name: 'You checked in today.' });
    expect(anxious).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /Take a 90-second pause/ })).toHaveAttribute('href', '/reset');
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith(expect.stringMatching(/^Checked in as anxious/)));
    expect(await db.journalEntries.count()).toBe(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('welcome back', () => {
  it('stays hidden on a first visit and records the visit locally', () => {
    render(<MemoryRouter><WelcomeBack onCheckIn={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole('heading', { name: 'It’s good to see you.' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.lastVisitDate)).toBe(localDateKey(new Date()));
  });

  it('greets someone after days away without guilt, and can be dismissed', async () => {
    writeLocalSignal('lastVisitDate', daysAgo(5));
    const onCheckIn = vi.fn();
    const { container } = render(<MemoryRouter><WelcomeBack onCheckIn={onCheckIn} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'It’s good to see you.' })).toBeInTheDocument();
    expect(screen.getByText(/nothing to catch up on/)).toBeInTheDocument();
    expect(screen.queryByText(/missed|streak/i)).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Check in for today' }));
    expect(onCheckIn).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'It’s good to see you.' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.welcomeBackDismissedOn)).toBe(localDateKey(new Date()));
  });
});

describe('today nudge', () => {
  it('shows nothing before any meaningful action', async () => {
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a reminder only after the first check-in and asks permission from that tap', async () => {
    await saveDailyCheckIn('steady');
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Would a gentle daily reminder help?' });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '08:30' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Turn on reminder' })); });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderEnabled: true, reminderTime: '08:30' });
  });

  it('does not offer reminders after a browser denial', async () => {
    mocks.permission = 'denied';
    await saveDailyCheckIn('steady');
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(container).toBeEmptyDOMElement();
  });

  it('nudges a private backup once there is enough to keep, records it, and respects Not now', async () => {
    mocks.permission = 'unsupported';
    for (let index = 0; index < 5; index += 1) {
      await db.journalEntries.add({ id: `journal:${index}`, type: 'free-writing', title: 't', body: 'b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [], gratitude: [] });
    }
    const first = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Keep a private copy of what you’ve saved.' });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Download backup/ })); });
    await waitFor(() => expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.lastBackupAt)).not.toBeNull());
    await waitFor(() => expect(first.container).toBeEmptyDOMElement());
    first.unmount();

    window.localStorage.clear();
    render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Keep a private copy of what you’ve saved.' });
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('heading', { name: 'Keep a private copy of what you’ve saved.' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.backupNudgeSnoozedUntil)).not.toBeNull();
  });

  it('invites a new person to choose readings first, ahead of every other optional card', async () => {
    withUnchosenReadings();
    await saveDailyCheckIn('steady'); // Would otherwise earn the reminder offer.
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Choose your readings' });
    expect(screen.queryByRole('heading', { name: 'Would a gentle daily reminder help?' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('.today-nudge')).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('opens the picker in one tap with nothing pre-selected and saves the choice', async () => {
    withUnchosenReadings();
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose your readings' }));
    const group = screen.getByRole('group', { name: 'Your daily readings' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Save my choice' })).toBeDisabled();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('radio', { name: /Spiritual but not religious/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save my choice' })); });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ traditionPreference: { mode: 'one', traditions: ['reflective'] }, traditionChoicePending: false });
  });

  it('rests the readings card on Not now, letting the next card take its turn', async () => {
    withUnchosenReadings();
    render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('heading', { name: 'Choose your readings' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.readingChoiceSnoozedUntil)).not.toBeNull();
  });

  it('never shows the readings card to someone who has already chosen (including migrated installs)', async () => {
    const migrated = { ...defaultPreferences() } as Record<string, unknown>;
    Reflect.deleteProperty(migrated, 'traditionChoicePending');
    mocks.context = { ...(mocks.context as object), preferences: migrated } as never;
    const { container } = render(<MemoryRouter><TodayNudge /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    expect(container).toBeEmptyDOMElement();
  });
});
