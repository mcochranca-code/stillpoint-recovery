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
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryMeditationTest') };
});

import { db } from '../../db/database';
import { MeditationPage } from './MeditationPage';

describe('MeditationPage session state', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    mocks.notify.mockReset();
    mocks.context = {
      preferences: defaultPreferences(),
      profile: defaultRecoveryProfile(),
      updatePreferences: vi.fn(),
      notify: mocks.notify,
    } as never;
  });

  afterEach(() => {
    db.close();
  });

  it('persists start, pause, resume, and early completion in local session history', async () => {
    render(<MemoryRouter><MeditationPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Begin 2-minute practice' }));
    await waitFor(async () => expect(await db.activeSessions.count()).toBe(1));
    expect((await db.activeSessions.toCollection().first())?.status).toBe('running');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(async () => expect((await db.activeSessions.toCollection().first())?.status).toBe('paused'));

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(async () => expect((await db.activeSessions.toCollection().first())?.status).toBe('running'));

    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    await waitFor(async () => {
      expect(await db.activeSessions.count()).toBe(0);
      expect(await db.meditationSessions.toArray()).toMatchObject([{ status: 'ended', plannedMinutes: 2 }]);
    });
    expect(mocks.notify).toHaveBeenCalledWith('Session ended early and kept in your history as incomplete.');
  });
});
