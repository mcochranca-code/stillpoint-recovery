import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../db/repository';

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
}));

vi.mock('./AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryOnboardingTest') };
});

import { db } from '../db/database';

import Onboarding from './Onboarding';

describe('Onboarding', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    mocks.notify.mockReset();
    mocks.context = {
      preferences: defaultPreferences(),
      profile: defaultRecoveryProfile(),
      notify: mocks.notify,
    } as never;
  });

  afterEach(() => {
    db.close();
  });

  it('allows setup to be skipped without creating a recovery date', async () => {
    render(<Onboarding />);

    fireEvent.click(screen.getByRole('button', { name: 'Skip optional setup for now' }));

    await waitFor(async () => {
      expect(await db.preferences.get('preferences')).toMatchObject({ onboardingComplete: true });
      expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({
        startAt: null, localStartDate: null, localStartTime: null,
      });
    });
    expect(mocks.notify).toHaveBeenCalledWith('You can set a recovery date later, whenever you feel ready.');
  });

  it('saves an optional recovery date during setup without making it mandatory', async () => {
    render(<Onboarding />);

    fireEvent.click(screen.getByRole('button', { name: /Make this space yours/ }));
    fireEvent.change(screen.getByLabelText(/Recovery start date/), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));

    await waitFor(async () => {
      expect(await db.preferences.get('preferences')).toMatchObject({ onboardingComplete: true });
      expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({
        localStartDate: '2026-11-01', localStartTime: '00:00',
      });
    });
    expect(mocks.notify).toHaveBeenCalledWith('Your recovery date is saved on this device. Your path is yours to shape.');
  });
});
