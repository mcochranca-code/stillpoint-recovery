import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import type { ActiveMeditationSession, UserPreferences } from '../../domain/types';

// The full coverage run is slow on small CI machines; give database-backed UI updates room to settle.
configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20_000 });

const mocks = vi.hoisted(() => ({
  context: {} as never,
  notify: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../components/AmbientAudioPlayer', () => ({
  AmbientAudioPlayer: ({ sessionStatus }: { sessionStatus: string }) => <p data-testid="ambient-status">{sessionStatus}</p>,
}));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryMeditationMoreTest') };
});

import { db } from '../../db/database';
import { MeditationPage } from './MeditationPage';

const createdAt = '2026-11-01T17:00:00.000Z';

function setContext(preferences: Partial<UserPreferences> = {}, startAt: string | null = null) {
  mocks.context = {
    preferences: { ...defaultPreferences(), ...preferences },
    profile: { ...defaultRecoveryProfile(), startAt },
    updatePreferences: mocks.updatePreferences,
    notify: mocks.notify,
  } as never;
}

const session = (overrides: Partial<ActiveMeditationSession> = {}): ActiveMeditationSession => ({
  id: 'session:seeded', exerciseId: 'box-breathing', exerciseName: 'Box breathing', plannedMinutes: 2,
  elapsedMs: 0, status: 'paused', createdAt, ...overrides,
});

const renderPage = (path = '/meditation') => render(<MemoryRouter initialEntries={[path]}><MeditationPage /></MemoryRouter>);

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.preferences.put(defaultPreferences());
  mocks.notify.mockReset();
  mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
  setContext();
});

afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
  delete (window as { speechSynthesis?: unknown }).speechSynthesis;
});

describe('MeditationPage choosing a practice', () => {
  it('opens the practice named in the link and lets the person change length, practice and pauses', () => {
    renderPage('/meditation?exercise=body-scan');
    expect(screen.getByRole('heading', { level: 3, name: 'Body Scan' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '10 minutes' }));
    expect(screen.getByRole('button', { name: '10 minutes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Begin 10-minute practice/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Box Breathing/ }));
    expect(screen.getByRole('button', { name: /^Box Breathing/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 3, name: 'Box Breathing' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Include brief optional pause/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ allowBreathHolds: true });
    expect(screen.getByText(/Completed and ended sessions will appear here/)).toBeInTheDocument();
  });

  it('falls back to the first practice when the link names an unknown one', () => {
    renderPage('/meditation?exercise=not-a-practice');
    expect(screen.getByRole('heading', { level: 3, name: 'Calm Breathing' })).toBeInTheDocument();
    // The preview falls back to the first practice, but no practice card claims the unknown selection.
    const practiceGrid = document.querySelector('.exercise-grid')!;
    expect(practiceGrid.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Begin 2-minute practice/ })).toBeInTheDocument();
  });
});

describe('MeditationPage session lifecycle', () => {
  it('completes a session that reached its full time and saves an optional reflection', async () => {
    setContext({}, new Date(Date.now() - 10 * 86_400_000).toISOString());
    await db.activeSessions.add(session({ status: 'running', elapsedMs: 120_000, segmentStartedAt: Date.now() }));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'You showed up for this moment.' })).toBeInTheDocument();
    expect(mocks.notify).toHaveBeenCalledWith('You made a little room for yourself. This completed session is saved on this device.');
    expect(await db.activeSessions.count()).toBe(0);
    expect(await db.meditationSessions.get('session:seeded')).toMatchObject({ status: 'completed', elapsedSeconds: 120 });
    expect(screen.getByTestId('ambient-status')).toHaveTextContent('complete');

    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    expect(mocks.notify).toHaveBeenCalledWith('A reflection is optional; add a few words if you would like to keep them with this session.');

    fireEvent.change(screen.getByLabelText('Optional reflection'), { target: { value: '  Calmer than before  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your meditation reflection is saved locally with this session.'));
    expect((await db.meditationSessions.get('session:seeded'))?.reflection).toBe('Calmer than before');
    expect((await screen.findByRole('article')).textContent).toContain('Calmer than before');
    expect(screen.getByText('1 completed')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Choose another practice' }));
    expect(screen.getByRole('heading', { name: 'Time for yourself' })).toBeInTheDocument();
  });

  it('does not count a completed session twice when it is already in history', async () => {
    await db.meditationSessions.add({
      id: 'session:seeded', exerciseId: 'box-breathing', exerciseName: 'Box breathing', plannedMinutes: 2,
      elapsedSeconds: 120, startedAt: createdAt, completedAt: createdAt, status: 'completed',
    });
    await db.activeSessions.add(session({ status: 'running', elapsedMs: 200_000 }));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'You showed up for this moment.' })).toBeInTheDocument();
    expect(await db.activeSessions.count()).toBe(0);
    expect(await db.meditationSessions.count()).toBe(1);
    expect(await db.dailyActivity.count()).toBe(0);
  });

  it('restarts a session by ending the current one early and beginning a fresh one', async () => {
    await db.activeSessions.add(session({ status: 'paused', elapsedMs: 30_000 }));
    renderPage('/meditation?exercise=box-breathing');
    expect(await screen.findByRole('region', { name: 'Paused meditation session' })).toBeInTheDocument();
    expect(screen.getByText('Paused · take your time')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('01:30');

    fireEvent.click(screen.getByRole('button', { name: /Restart/ }));
    await waitFor(async () => expect(await db.meditationSessions.get('session:seeded')).toMatchObject({ status: 'ended', elapsedSeconds: 30 }));
    await waitFor(async () => {
      const [fresh] = await db.activeSessions.toArray();
      expect(fresh).toMatchObject({ exerciseId: 'box-breathing', status: 'running', elapsedMs: 0 });
      expect(fresh?.id).not.toBe('session:seeded');
    });
    expect(mocks.notify).toHaveBeenCalledWith('Session ended early and kept in your history as incomplete.');
    expect(await screen.findByRole('region', { name: 'Active meditation session' })).toBeInTheDocument();
    expect(screen.getByText('Ended early')).toBeInTheDocument();
  });

  it('pauses a running session that has no segment start without losing time', async () => {
    await db.activeSessions.add(session({ status: 'running', elapsedMs: 15_000, segmentStartedAt: undefined }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    await waitFor(async () => expect(await db.activeSessions.get('session:seeded')).toMatchObject({ status: 'paused', elapsedMs: 15_000 }));
  });

  it('refreshes the timer when the page becomes visible again', async () => {
    await db.activeSessions.add(session({ status: 'running', elapsedMs: 0, segmentStartedAt: Date.now() }));
    renderPage();
    await screen.findByRole('region', { name: 'Active meditation session' });
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    visibility.mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByRole('progressbar', { name: 'Meditation time elapsed' })).toBeInTheDocument();
  });
});

describe('MeditationPage guidance', () => {
  it.each([
    { elapsedMs: 1_000, label: 'Breathe in' },
    { elapsedMs: 4_000, label: 'Hold' },
    { elapsedMs: 6_000, label: 'Breathe out' },
    { elapsedMs: 9_000, label: 'Rest' },
  ])('moves the box-breathing guide to the $label phase', async ({ elapsedMs, label }) => {
    setContext({ allowBreathHolds: true });
    await db.activeSessions.add(session({ status: 'running', elapsedMs, segmentStartedAt: Date.now() }));
    const { container } = renderPage();
    await screen.findByRole('region', { name: 'Active meditation session' });
    expect(container.querySelector('.phase-label')).toHaveTextContent(label);
    expect(container.querySelector('.box-breathing-orb')).toBeInTheDocument();
  });

  it('centers the box guide when motion is reduced', async () => {
    setContext({ reducedMotion: true });
    await db.activeSessions.add(session());
    const { container } = renderPage();
    await screen.findByRole('region', { name: 'Paused meditation session' });
    const orb = container.querySelector<HTMLElement>('.box-breathing-orb');
    expect(orb?.style.left).toBe('50%');
    expect(orb?.style.top).toBe('50%');
  });

  it.each([
    { exerciseId: 'calm-breathing', src: '/assets/meditation/breathing-orb.svg' },
    { exerciseId: 'extended-exhale', src: '/assets/meditation/grounding-ripples.svg' },
    { exerciseId: 'body-scan', src: '/assets/backgrounds/still-lake.svg' },
    { exerciseId: 'gratitude-meditation', src: '/assets/backgrounds/soft-bokeh.svg' },
  ])('shows the $exerciseId visual during a session', async ({ exerciseId, src }) => {
    await db.activeSessions.add(session({ exerciseId, exerciseName: exerciseId }));
    const { container } = renderPage();
    await screen.findByRole('region', { name: 'Paused meditation session' });
    expect(container.querySelector('.meditation-visual-stage img')).toHaveAttribute('src', src);
  });

  it('hides the visual guide when the person prefers', async () => {
    setContext({ hideMeditationVisual: true });
    await db.activeSessions.add(session());
    renderPage();
    expect(await screen.findByText('Visual guide hidden')).toBeInTheDocument();
  });

  it('speaks phase cues only while voice cues are on', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      rate = 1;
      constructor(public text: string) {}
    });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel } });
    await db.activeSessions.add(session({ status: 'running', elapsedMs: 1_000, segmentStartedAt: Date.now() }));
    renderPage();
    const toggle = await screen.findByRole('button', { name: /Voice cues off/ });
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);
    await waitFor(() => expect(speak).toHaveBeenCalled());
    expect((speak.mock.calls[0]?.[0] as { text: string; rate: number })).toMatchObject({ text: 'Breathe in', rate: 0.85 });

    const cancelsBefore = cancel.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Voice cues on/ }));
    expect(cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
    expect(screen.getByRole('button', { name: /Voice cues off/ })).toBeInTheDocument();
  });

  it('disables voice cues when the browser has no speech support', async () => {
    await db.activeSessions.add(session());
    renderPage();
    expect(await screen.findByRole('button', { name: /Voice cues off/ })).toBeDisabled();
  });
});
