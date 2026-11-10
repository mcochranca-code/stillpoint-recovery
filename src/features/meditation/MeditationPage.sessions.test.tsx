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
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryMeditationSessionsTest') };
});

import { db } from '../../db/database';
import { MeditationPage } from './MeditationPage';

function renderPage(path = '/meditation') {
  return render(<MemoryRouter initialEntries={[path]}><MeditationPage /></MemoryRouter>);
}

function setPreferences(overrides: Record<string, unknown> = {}) {
  mocks.context = {
    preferences: { ...defaultPreferences(), ...overrides },
    profile: defaultRecoveryProfile(),
    updatePreferences: mocks.updatePreferences,
    notify: mocks.notify,
  } as never;
}

async function seedFinishedSession(exerciseId = 'calm-breathing') {
  await db.activeSessions.add({
    id: 'session:finished', exerciseId, exerciseName: 'Calm breathing', plannedMinutes: 2,
    elapsedMs: 120_000, segmentStartedAt: Date.now(), status: 'running', createdAt: new Date().toISOString(),
  });
}

describe('MeditationPage practices and completion', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.preferences.put(defaultPreferences());
    mocks.notify.mockReset();
    mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
    setPreferences();
  });

  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
  });

  it('completes a session that has reached its length, then saves an optional reflection', async () => {
    await seedFinishedSession();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'You showed up for this moment.' })).toBeInTheDocument();
    expect(mocks.notify).toHaveBeenCalledWith('You made a little room for yourself. This completed session is saved on this device.');
    await waitFor(async () => expect(await db.meditationSessions.get('session:finished')).toMatchObject({ status: 'completed', elapsedSeconds: 120 }));
    expect(await db.activeSessions.count()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    expect(mocks.notify).toHaveBeenCalledWith('A reflection is optional; add a few words if you would like to keep them with this session.');

    fireEvent.change(screen.getByLabelText('Optional reflection'), { target: { value: '  Calmer now  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your meditation reflection is saved locally with this session.'));
    expect((await db.meditationSessions.get('session:finished'))?.reflection).toBe('Calmer now');

    fireEvent.click(screen.getByRole('button', { name: 'Choose another practice' }));
    expect(await screen.findByRole('heading', { name: 'Time for yourself' })).toBeInTheDocument();
    expect(screen.getByText('1 completed')).toBeInTheDocument();
  });

  it('opens the practice named in the link, offers the optional pause and starts the chosen length', async () => {
    renderPage('/meditation?exercise=box-breathing');
    expect(await screen.findByRole('heading', { name: 'Box Breathing', level: 3 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Include brief optional pause/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ allowBreathHolds: true });

    fireEvent.click(screen.getByRole('button', { name: /^5\s*minutes/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Begin 5-minute practice' }));
    await waitFor(async () => expect(await db.activeSessions.toCollection().first()).toMatchObject({ exerciseId: 'box-breathing', plannedMinutes: 5 }));
    expect(await screen.findByRole('timer')).toHaveAccessibleName('5 minutes and 0 seconds remaining');
  });

  it('shows each kind of guide while a practice runs, or a written cue when visuals are hidden', async () => {
    for (const exerciseId of ['extended-exhale', 'body-scan', 'gratitude-meditation']) {
      await db.activeSessions.clear();
      await db.activeSessions.add({
        id: `session:${exerciseId}`, exerciseId, exerciseName: exerciseId, plannedMinutes: 10,
        elapsedMs: 4_000, status: 'paused', createdAt: new Date().toISOString(),
      });
      const { unmount } = renderPage();
      expect(await screen.findByRole('region', { name: 'Paused meditation session' })).toBeInTheDocument();
      unmount();
    }

    setPreferences({ hideMeditationVisual: true, allowBreathHolds: true });
    renderPage();
    expect(await screen.findByText('Visual guide hidden')).toBeInTheDocument();
  });

  it('speaks breathing cues when voice cues are on, and ends and restarts a session', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal('SpeechSynthesisUtterance', class { rate = 1; constructor(readonly text: string) {} });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Begin 2-minute practice' }));
    const toggle = await screen.findByRole('button', { name: /Voice cues off/ });
    fireEvent.click(toggle);
    await waitFor(() => expect(speak).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Voice cues on/ }));
    expect(cancel).toHaveBeenCalled();

    const first = (await db.activeSessions.toCollection().first())?.id;
    fireEvent.click(screen.getByRole('button', { name: /Restart/ }));
    await waitFor(async () => expect((await db.activeSessions.toCollection().first())?.id).not.toBe(first));
    expect(await db.meditationSessions.get(first!)).toMatchObject({ status: 'ended' });
  });
});
