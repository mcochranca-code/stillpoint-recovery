import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../tests/axe';
import { defaultPreferences, ensureDefaults } from '../db/repository';

const mocks = vi.hoisted(() => ({ context: {} as never }));
vi.mock('../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../platform/notificationPermissions', () => ({
  getNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
  requestNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
}));
vi.mock('../components/InteractiveMeetingMap', () => ({ default: () => <div role="region" aria-label="Interactive meeting map" /> }));

import Navigation from '../app/Navigation';
import Onboarding from '../app/Onboarding';
import { TodayPage } from '../features/today/TodayPage';
import { RouteFocusManager } from '../app/RouteFocusManager';
import { LoadingScreen } from '../components/LoadingScreen';
import { PageSkeleton } from '../components/PageSkeleton';
import { LibraryPage } from '../features/library/LibraryPage';
import { MeetingsPage } from '../features/meetings/MeetingsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

beforeEach(() => {
  mocks.context = {
    profile: undefined,
    preferences: defaultPreferences(),
    updatePreferences: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn(),
  } as never;
});

describe('axe: key screens have no detectable accessibility violations', () => {
  it('navigation shell', async () => {
    const { container } = render(<MemoryRouter><Navigation /></MemoryRouter>);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('splash and skeleton loading states', async () => {
    const { container } = render(<><LoadingScreen /><div><PageSkeleton /></div></>);
    expect(screen.getByRole('heading', { level: 1, name: 'Stillpoint Recovery' })).toBeInTheDocument();
    expect(screen.getAllByRole('status').map((element) => element.textContent)).toEqual(expect.arrayContaining(['Making a little room for today…', 'Opening your local space…']));
    expect(await axeViolations(container)).toEqual([]);
  });

  it('onboarding', async () => {
    const { container } = render(<MemoryRouter><Onboarding /></MemoryRouter>);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('today, including a meaningful progress ring', async () => {
    const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mocks.context = {
      ...(mocks.context as object),
      profile: { id: 'profile', startAt: start.toISOString(), localStartDate: start.toISOString().slice(0, 10), localStartTime: '00:00' },
    } as never;
    await ensureDefaults();
    const { container } = render(<MemoryRouter><TodayPage /></MemoryRouter>);
    const ring = await screen.findByRole('progressbar', { name: 'Progress toward your next milestone' });
    expect(ring.getAttribute('aria-valuetext')).toMatch(/^\d+% of the way to /);
    expect(screen.getByText(/days?, \d+ hours? and \d+ minutes? in recovery/)).toHaveClass('sr-only');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('settings', async () => {
    const { container } = render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('meeting finder', async () => {
    const { container } = render(<MemoryRouter><MeetingsPage /></MemoryRouter>);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('library with keyboard-operable tabs', async () => {
    const { container } = render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    const tablist = screen.getByRole('tablist', { name: 'Library categories' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0]!.id);

    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(within(tablist).getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(within(tablist).getAllByRole('tab')[1]);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    const last = within(tablist).getAllByRole('tab').at(-1)!;
    expect(last).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(within(tablist).getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');

    expect(await axeViolations(container)).toEqual([]);
  });
});

function Shell() {
  const navigate = useNavigate();
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <nav aria-label="Primary navigation"><button type="button" onClick={() => navigate('/journal')}>Go to journal</button></nav>
    <main id="main-content" tabIndex={-1}>
      <RouteFocusManager />
      <Routes>
        <Route path="/" element={<h1>A little space for today.</h1>} />
        <Route path="/journal" element={<h1>Your journal.</h1>} />
      </Routes>
    </main>
  </>;
}

describe('route changes', () => {
  it('leaves focus alone on first load, then focuses the new heading, announces it and updates the title', async () => {
    render(<MemoryRouter initialEntries={['/']}><Shell /></MemoryRouter>);
    expect(document.title).toBe('Stillpoint Recovery');
    expect(document.activeElement).toBe(document.body);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');

    const trigger = screen.getByRole('button', { name: 'Go to journal' });
    trigger.focus();
    await act(async () => { fireEvent.click(trigger); });

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your journal.' })));
    expect(screen.getByTestId('route-announcer')).toHaveTextContent('Journal page');
    expect(document.title).toBe('Journal · Stillpoint Recovery');
  });
});
