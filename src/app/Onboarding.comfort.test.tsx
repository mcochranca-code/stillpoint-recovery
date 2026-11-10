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

describe('onboarding comfort settings and details', () => {
  it('saves every comfort choice made on the first screen', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByRole('checkbox', { name: /Reduced motion/ }));
    fireEvent.change(screen.getByLabelText('Appearance'), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText('Color palette'), { target: { value: (screen.getByLabelText('Color palette') as HTMLSelectElement).options[1]!.value } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Live timer/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Explore first, set up later' })); });

    await waitFor(async () => expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true));
    const saved = await db.preferences.get('preferences');
    expect(saved).toMatchObject({ reducedMotion: true, theme: 'dark', liveCounter: false });
    expect(saved?.colorTheme).not.toBe('stillpoint');
  });

  it('saves a start time and a custom focus, and ignores an unreadable saved draft', async () => {
    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.onboardingDraft, '{not json');
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/Start time/), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Recovery focus'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Custom recovery focus'), { target: { value: '  Rest  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open my space/ })); });

    await waitFor(async () => expect((await db.recoveryProfiles.get('recovery-profile'))?.localStartTime).toBe('07:30'));
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ localStartDate: '2026-10-01', focus: 'Rest' });
    expect(mocks.notify).toHaveBeenCalledWith('Your recovery date is saved on this device. Your path is yours to shape.');
  });
});
