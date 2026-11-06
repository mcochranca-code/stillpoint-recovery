import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/database';
import { defaultPreferences, defaultRecoveryProfile, ensureDefaults } from '../db/repository';
import { LOCAL_SIGNAL_KEYS } from '../platform/localSignals';
import { axeViolations } from '../../tests/axe';

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

describe('short, skippable onboarding', () => {
  it('has three steps and lets someone explore first from the very first screen', async () => {
    renderOnboarding();
    expect(screen.getByRole('img', { name: 'Setup step 1 of 3' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    expect((await db.recoveryProfiles.get('recovery-profile'))?.startAt).toBeNull();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft)).toBeNull();
    // Skipping never assigns a tradition: the choice stays open and Today offers it.
    const preferences = await db.preferences.get('preferences');
    expect(preferences?.traditionChoicePending).toBe(true);
    expect(preferences?.traditionPreference.traditions).not.toContain('christian');
  });

  it('never asks for notification permission during setup', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', Object.assign(function Notification() {}, { permission: 'default', requestPermission }));
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    expect(screen.queryByText(/meditation reminder/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    expect(requestPermission).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps comfort settings even when the rest of setup is skipped', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('checkbox', { name: /High contrast/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.highContrast).toBe(true));
  });

  it('resumes where someone left off and moves focus to the new step heading', async () => {
    const { unmount } = renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Anything you’d like to remember?' })));
    fireEvent.change(screen.getByLabelText(/A personal intention/), { target: { value: 'Be gentle with myself' } });
    unmount();

    renderOnboarding();
    expect(screen.getByRole('img', { name: 'Setup step 2 of 3' })).toBeInTheDocument();
    expect(screen.getByText('Picking up where you left off')).toBeInTheDocument();
    expect(screen.getByLabelText(/A personal intention/)).toHaveValue('Be gentle with myself');

    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: '2026-01-05' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(async () => expect((await db.recoveryProfiles.get('recovery-profile'))?.intention).toBe('Be gentle with myself'));
    expect((await db.recoveryProfiles.get('recovery-profile'))?.localStartDate).toBe('2026-01-05');
    expect(await db.earnedCharms.get('charm:first-light')).toBeTruthy();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft)).toBeNull();
  });

  it('presents the reading choice as its own gentle step with nothing pre-selected, and saves what is chosen', async () => {
    const { container } = renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: /Where would you like your daily reading to come from/ })));
    expect(screen.getByRole('img', { name: 'Setup step 3 of 3' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Your daily readings' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0);
    expect(screen.getByRole('radio', { name: /Spiritual but not religious/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decide later' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole('radio', { name: /A few I choose/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Buddhist/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Muslim/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    const preferences = await db.preferences.get('preferences');
    expect(preferences?.traditionPreference).toEqual({ mode: 'several', traditions: ['buddhist', 'muslim'] });
    expect(preferences?.traditionChoicePending).toBe(false);
  });

  it('lets someone decide later on the readings step without assigning a tradition', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Christian/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Decide later' })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    const preferences = await db.preferences.get('preferences');
    expect(preferences?.traditionChoicePending).toBe(true);
    expect(preferences?.traditionPreference).toEqual({ mode: 'one', traditions: ['reflective'] });
  });

  it('keeps a migrated install’s existing tradition selected', () => {
    const migrated = { ...defaultPreferences(), traditionPreference: { mode: 'one', traditions: ['hindu'] } } as Record<string, unknown>;
    Reflect.deleteProperty(migrated, 'traditionChoicePending');
    mocks.context = { ...(mocks.context as object), preferences: migrated } as never;
    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.onboardingDraft, JSON.stringify({ step: 2 }));
    renderOnboarding();
    expect(screen.getByRole('radio', { name: /^Hindu/ })).toBeChecked();
  });
});
