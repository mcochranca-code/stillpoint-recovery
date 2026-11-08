import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';
import { db } from '../../db/database';
import { defaultPreferences, ensureDefaults } from '../../db/repository';
import type { UserPreferences } from '../../domain/types';

const mocks = vi.hoisted(() => ({ context: {} as never }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
  requestNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
}));

import { TodayPage } from './TodayPage';
import { LibraryPage } from '../library/LibraryPage';

const odbHeading = 'Explore an official reading or conversation.';
const withPreferences = (overrides: Partial<UserPreferences>) => {
  mocks.context = { profile: undefined, preferences: { ...defaultPreferences(), ...overrides }, updatePreferences: vi.fn().mockResolvedValue(undefined), notify: vi.fn() } as never;
};
const christianChosen: Partial<UserPreferences> = { traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['christian'] } };

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureDefaults();
  withPreferences({});
});
afterEach(() => { db.close(); });

describe('Christian extras are chosen, never shown by default', () => {
  it('a new install sees no Our Daily Bread card on Today', async () => {
    render(<MemoryRouter><TodayPage /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: odbHeading })).toBeNull();
  });

  it('choosing Christian alone does not turn Our Daily Bread on', async () => {
    withPreferences(christianChosen);
    render(<MemoryRouter><TodayPage /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: odbHeading })).toBeNull();
  });

  it('shows Our Daily Bread on Today once opted in, with no accessibility violations', async () => {
    withPreferences({ ...christianChosen, christianExtras: true });
    const { container } = render(<MemoryRouter><TodayPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: odbHeading })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('keeps the Library Scripture tab hidden until opted in', async () => {
    const { unmount } = render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    let tabs = within(screen.getByRole('tablist', { name: 'Library categories' })).getAllByRole('tab');
    expect(tabs.some((tab) => /Scripture/.test(tab.textContent ?? ''))).toBe(false);
    unmount();

    withPreferences({ ...christianChosen, christianExtras: true });
    const { container } = render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    await waitFor(() => {
      tabs = within(screen.getByRole('tablist', { name: 'Library categories' })).getAllByRole('tab');
      expect(tabs.some((tab) => /Scripture/.test(tab.textContent ?? ''))).toBe(true);
    });
    expect(await axeViolations(container)).toEqual([]);
  });
});
