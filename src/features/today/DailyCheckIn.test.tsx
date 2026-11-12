import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { defaultPreferences, ensureDefaults } from '../../db/repository';
import { db } from '../../db/database';
import { getTodayCheckIn } from '../../db/checkIns';
import { DailyCheckIn } from './DailyCheckIn';

const notify = vi.hoisted(() => vi.fn());

vi.mock('../../app/AppContext', () => ({ useAppContext: () => ({ notify }) }));
vi.mock('../../db/achievements', () => ({ awardEligibleCharms: vi.fn().mockResolvedValue([]) }));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointDailyCheckInFeatureTest') };
});

function JournalDestination() {
  const location = useLocation();
  return <output data-testid="journal-state">{JSON.stringify(location.state)}</output>;
}

function renderCheckIn() {
  return render(<MemoryRouter initialEntries={['/today']}><Routes>
    <Route path="/today" element={<DailyCheckIn />} />
    <Route path="/journal" element={<JournalDestination />} />
  </Routes></MemoryRouter>);
}

beforeEach(async () => {
  notify.mockReset();
  await db.delete();
  await db.open();
  await ensureDefaults();
  await db.preferences.put(defaultPreferences());
});

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  db.close();
});

describe('Daily Check-In emotional vocabulary', () => {
  it('offers definitions, keeps uncertainty, saves up to three words locally, and hands off an optional reflection', async () => {
    renderCheckIn();
    const sad = await screen.findByRole('button', { name: 'Sad' });
    await waitFor(() => expect(sad).toBeEnabled());

    fireEvent.click(sad);
    expect(screen.getAllByText(/A feeling that can come with loss, disappointment/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this fits for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Melancholy' }));
    expect(screen.getByText('A quiet, thoughtful kind of sadness that may not have one clear cause.')).toBeInTheDocument();
    expect(screen.getByText('Does this word feel true for you right now?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this fits for now' }));
    expect(screen.getByText('2 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apathetic' }));
    fireEvent.click(screen.getByRole('button', { name: 'I’m still figuring it out' }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bored' }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Depressed' }));
    expect(notify).toHaveBeenCalledWith('You can hold up to three feeling words here. You can change them any time.');

    fireEvent.click(screen.getByRole('button', { name: 'Save today’s check-in' }));
    await waitFor(async () => expect((await getTodayCheckIn())?.tags).toContain('feeling:apathetic'));
    expect((await getTodayCheckIn())?.tags).toEqual(['daily-check-in', 'feeling:sad', 'feeling:melancholy', 'feeling:apathetic']);

    fireEvent.click(screen.getByRole('link', { name: 'Write a reflection, if it helps' }));
    const handoff = await screen.findByTestId('journal-state');
    expect(handoff).toHaveTextContent('I am noticing sad, melancholy, apathetic.');
    expect(handoff).toHaveTextContent('feeling:melancholy');
    expect(await db.journalEntries.count()).toBe(1);
  });
});
