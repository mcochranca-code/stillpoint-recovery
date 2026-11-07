import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/database';
import { defaultPreferences, defaultRecoveryProfile, ensureDefaults } from '../db/repository';
import { LOCAL_SIGNAL_KEYS } from '../platform/localSignals';

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
  it('has two steps and lets someone explore first from the very first screen', async () => {
    renderOnboarding();
    expect(screen.getByRole('img', { name: 'Setup step 1 of 2' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });
    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    expect((await db.recoveryProfiles.get('recovery-profile'))?.startAt).toBeNull();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft)).toBeNull();
  });

  it('never asks for notification permission during setup', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', Object.assign(function Notification() {}, { permission: 'default', requestPermission }));
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    expect(screen.queryByText(/meditation reminder/i)).not.toBeInTheDocument();
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
    expect(screen.getByRole('img', { name: 'Setup step 2 of 2' })).toBeInTheDocument();
    expect(screen.getByText('Picking up where you left off')).toBeInTheDocument();
    expect(screen.getByLabelText(/A personal intention/)).toHaveValue('Be gentle with myself');

    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: '2026-01-05' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });
    await waitFor(async () => expect((await db.recoveryProfiles.get('recovery-profile'))?.intention).toBe('Be gentle with myself'));
    expect((await db.recoveryProfiles.get('recovery-profile'))?.localStartDate).toBe('2026-01-05');
    expect(await db.earnedCharms.get('charm:first-light')).toBeTruthy();
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.onboardingDraft)).toBeNull();
  });
});
