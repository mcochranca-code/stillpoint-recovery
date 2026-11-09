import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/database';
import { defaultPreferences, defaultRecoveryProfile, ensureDefaults } from '../db/repository';
import { localDateKey } from '../domain/time';
import { LOCAL_SIGNAL_KEYS } from '../platform/localSignals';

// The full coverage run is slow on small CI machines; give database-backed UI updates room to settle.
configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({ context: {} as never, notify: vi.fn() }));
vi.mock('./AppContext', () => ({ useAppContext: () => mocks.context }));

import Onboarding from './Onboarding';

beforeEach(async () => {
  window.localStorage.clear();
  await db.delete();
  await db.open();
  await ensureDefaults();
  mocks.notify.mockReset();
  mocks.context = { preferences: defaultPreferences(), profile: defaultRecoveryProfile(), notify: mocks.notify } as never;
});

afterEach(() => { db.close(); });

const renderOnboarding = () => render(<MemoryRouter><Onboarding /></MemoryRouter>);
const savedDraft = () => JSON.parse(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft) ?? '{}') as Record<string, unknown>;

describe('onboarding choices and recovery', () => {
  it('saves every comfort choice made on the first screen', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('checkbox', { name: /Reduced motion/ }));
    fireEvent.change(screen.getByLabelText('Appearance'), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText('Color palette'), { target: { value: 'obsidian' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Live timer/ }));
    expect(savedDraft()).toMatchObject({ reducedMotion: true, theme: 'dark', colorTheme: 'obsidian', liveCounter: false });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Welcome. Everything else can wait until you’re ready.'));
    expect(await db.preferences.get('preferences')).toMatchObject({
      onboardingComplete: true, reducedMotion: true, theme: 'dark', colorTheme: 'obsidian', liveCounter: false,
    });
  });

  it('records a custom focus, start time and intention and awards the first charm', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    const time = screen.getByLabelText(/Start time/);
    expect(time).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: '2026-10-01' } });
    expect(time).not.toBeDisabled();
    fireEvent.change(time, { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText(/A personal intention/), { target: { value: '  Show up honestly  ' } });
    expect(screen.queryByRole('textbox', { name: 'Custom recovery focus' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Recovery focus'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom recovery focus' }), { target: { value: '  Screen time  ' } });

    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('heading', { name: /daily reading to come from/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByLabelText(/Recovery start date/)).toHaveValue('2026-10-01');
    expect(screen.getByRole('textbox', { name: 'Custom recovery focus' })).toHaveValue('  Screen time  ');
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Decide later' })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your recovery date is saved on this device. Your path is yours to shape.'));
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({
      localStartDate: '2026-10-01', localStartTime: '07:30', focus: 'Screen time', intention: 'Show up honestly',
    });
    expect(await db.earnedCharms.get('charm:first-light')).toMatchObject({ charmId: 'first-light' });
    expect((await db.preferences.get('preferences'))?.traditionChoicePending).toBe(true);
  });

  it('refuses a future start date and keeps setup open', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    const future = localDateKey(new Date(Date.now() + 3 * 86_400_000));
    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: future } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Choose today or an earlier date. You can change it whenever you need.'));
    expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(false);
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft)).not.toBeNull();
    expect(screen.getByRole('button', { name: /Open my space/ })).not.toBeDisabled();
  });

  it('reports a generic message when saving fails with a non-Error value', async () => {
    vi.spyOn(db.recoveryProfiles, 'put').mockRejectedValueOnce('storage unavailable');
    renderOnboarding();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your settings could not be saved. Please try again.'));
  });

  it('lets someone go back from the details step or skip it entirely', async () => {
    mocks.context = {
      preferences: undefined,
      profile: { ...defaultRecoveryProfile(), focus: 'alcohol', intention: 'Keep going', startAt: '2026-09-01T07:00:00.000Z', localStartDate: '2026-09-01', localStartTime: '00:00' },
      notify: mocks.notify,
    } as never;
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    expect(screen.getByLabelText('Recovery focus')).toHaveValue('alcohol');
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByRole('heading', { name: 'One day is enough for today.' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Skip these for now' })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Welcome. Everything else can wait until you’re ready.'));
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({
      startAt: '2026-09-01T07:00:00.000Z', focus: 'alcohol', intention: 'Keep going',
    });
    expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true);
  });

  it('resumes a saved draft on the reading step with its tradition choice', async () => {
    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.onboardingDraft, JSON.stringify({
      step: 2, startDate: '', focus: '', intention: '', traditionChoice: { mode: 'one', traditions: ['reflective'] },
    }));
    renderOnboarding();
    expect(screen.getByText('Picking up where you left off')).toBeInTheDocument();
    expect(screen.getByText('Your choice will be saved on this device.')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Welcome. Everything else can wait until you’re ready.'));
    expect(await db.preferences.get('preferences')).toMatchObject({
      traditionPreference: { mode: 'one', traditions: ['reflective'] }, traditionChoicePending: false,
    });
  });

  it('ignores a corrupt or non-object draft and starts at the beginning', () => {
    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.onboardingDraft, '{not json');
    const first = renderOnboarding();
    expect(screen.getByRole('img', { name: 'Setup step 1 of 3' })).toBeInTheDocument();
    first.unmount();

    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.onboardingDraft, '7');
    renderOnboarding();
    expect(screen.getByRole('img', { name: 'Setup step 1 of 3' })).toBeInTheDocument();
  });
});
