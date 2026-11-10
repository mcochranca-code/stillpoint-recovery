import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/database';
import { defaultPreferences, ensureDefaults } from '../../db/repository';
import { localDateKey } from '../../domain/time';
import type { UserPreferences } from '../../domain/types';

const mocks = vi.hoisted(() => ({ notify: vi.fn(), context: {} as never }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));

import { LibraryPage } from './LibraryPage';

const christianExtras: Partial<UserPreferences> = { traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['christian'] }, christianExtras: true };

function withPreferences(overrides: Partial<UserPreferences> = {}) {
  mocks.context = { profile: undefined, preferences: { ...defaultPreferences(), ...overrides }, notify: mocks.notify } as never;
}

function renderPage() {
  return render(<MemoryRouter><LibraryPage /></MemoryRouter>);
}

function reflectionCard(title: string) {
  return screen.getByRole('heading', { name: title, level: 2 }).closest('article') as HTMLElement;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureDefaults();
  mocks.notify.mockReset();
  withPreferences();
});
afterEach(() => { db.close(); });

describe('LibraryPage reflections', () => {
  it('searches reflections by theme and title', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search original reflections'), { target: { value: 'honesty' } });
    expect(screen.getByRole('heading', { name: 'Clear Water' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Room for This Moment' })).toBeNull();
  });

  it('saves and unsaves a reflection', async () => {
    renderPage();
    fireEvent.click(within(reflectionCard('Room for This Moment')).getByRole('button', { name: 'Love this reflection' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Added to saved reflections.'));
    fireEvent.click(screen.getByRole('tab', { name: 'Favorites' }));
    expect(await screen.findByRole('heading', { name: 'Room for This Moment' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Reflections' }));
    const unsave = await within(reflectionCard('Room for This Moment')).findByRole('button', { name: 'Remove reflection from favorites' });

    fireEvent.click(unsave);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Removed from saved reflections.'));
    expect(await within(reflectionCard('Room for This Moment')).findByRole('button', { name: 'Love this reflection' })).toBeInTheDocument();
    const records = await db.dailyReflections.where('reflectionId').equals('reflection-001').toArray();
    expect(records.every((record) => !record.favorite)).toBe(true);
  });

  it('marks a reflection for today once and records the activity', async () => {
    renderPage();
    fireEvent.click(within(reflectionCard('The Unhurried Step')).getByRole('button', { name: 'Mark reflected' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Reflection marked for today.'));
    expect(await within(reflectionCard('The Unhurried Step')).findByRole('button', { name: 'Reflected today' })).toBeInTheDocument();
    const today = localDateKey(new Date());
    expect((await db.dailyReflections.get(`reflection:${today}:reflection-002`))?.reflectedAt).toBeTruthy();
    expect((await db.dailyActivity.where('localDate').equals(today).first())?.reflectionsCompleted).toBe(1);

    fireEvent.click(within(reflectionCard('The Unhurried Step')).getByRole('button', { name: 'Reflected today' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledTimes(2));
    expect((await db.dailyActivity.where('localDate').equals(today).first())?.reflectionsCompleted).toBe(1);
  });

  it('saves a reflection to the private journal', async () => {
    renderPage();
    fireEvent.click(within(reflectionCard('Clear Water')).getByRole('button', { name: 'Save to journal' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Saved to your private journal on this device.'));
    expect(await db.journalEntries.count()).toBe(1);
  });
});

describe('LibraryPage tabs', () => {
  it('hides the Scripture tab unless Christian extras are on, and moves between tabs by keyboard', () => {
    renderPage();
    const tablist = screen.getByRole('tablist', { name: 'Library categories' });
    expect(within(tablist).queryByRole('tab', { name: 'Scripture' })).toBeNull();

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(within(tablist).getByRole('tab', { name: 'Favorites' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/No favorite reflections yet/)).toBeInTheDocument();
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(within(tablist).getByRole('tab', { name: 'Principles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Recovery principles' })).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(within(tablist).getByRole('tab', { name: 'Collection' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(within(tablist).getByRole('tab', { name: 'Reflections' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens related reflections from a principle', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Principles' }));
    const courage = screen.getByRole('heading', { name: 'Courage', level: 3 }).closest('article') as HTMLElement;
    fireEvent.click(within(courage).getByRole('button', { name: /Explore related reflections/ }));
    expect(screen.getByLabelText('Search original reflections')).toHaveValue('Courage');
    expect(screen.getByRole('heading', { name: 'A Brave Inch' })).toBeInTheDocument();
  });

  it('lists meditation exercises with links to start them', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Meditation' }));
    expect(screen.getByRole('heading', { name: 'Meditation exercises' })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Choose exercise' });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/meditation\?exercise=/));
  });

  it('shows the Journey Collection tab', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Collection' }));
    expect(await screen.findByText('Small signs of care, collected along the way.')).toBeInTheDocument();
  });
});

describe('LibraryPage scripture (Christian extras on)', () => {
  beforeEach(() => withPreferences(christianExtras));

  it('filters scripture by emotional need and search, with an empty state', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Scripture' }));
    const need = screen.getByLabelText('Browse scripture by emotional need');

    fireEvent.change(need, { target: { value: 'Loneliness' } });
    expect(screen.getByRole('heading', { name: 'Ecclesiastes 4:9–10' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Romans 12:2' })).toBeNull();

    fireEvent.change(need, { target: { value: 'Temptation' } });
    fireEvent.change(need, { target: { value: 'All needs' } });
    fireEvent.change(screen.getByLabelText('Search scripture and context'), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/No passage matched this filter/)).toBeInTheDocument();
  });

  it('saves scripture once as explored and then removes the favorite', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Scripture' }));
    const card = () => screen.getByRole('heading', { name: 'Romans 15:13' }).closest('article') as HTMLElement;

    fireEvent.click(within(card()).getByRole('button', { name: 'Save scripture' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Scripture saved to your private library.'));
    fireEvent.click(await within(card()).findByRole('button', { name: 'Unsave scripture' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Removed from scripture favorites.'));
    const today = localDateKey(new Date());
    expect((await db.dailyActivity.where('localDate').equals(today).first())?.scriptureExplored).toBe(1);
  });

  it('returns to reflections when extras are turned off while on the Scripture tab', () => {
    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Scripture' }));
    withPreferences();
    rerender(<MemoryRouter><LibraryPage /></MemoryRouter>);
    expect(screen.getByRole('tab', { name: 'Reflections' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Search original reflections')).toBeInTheDocument();
  });
});
