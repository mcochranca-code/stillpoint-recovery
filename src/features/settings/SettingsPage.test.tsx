import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences } from '../../db/repository';

const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  notify: vi.fn(),
  context: {} as never,
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
  requestNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
}));

import { SettingsPage } from './SettingsPage';

describe('SettingsPage content preferences', () => {
  beforeEach(() => {
    mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
    mocks.notify.mockReset();
    mocks.context = {
      preferences: defaultPreferences(),
      updatePreferences: mocks.updatePreferences,
      notify: mocks.notify,
    } as never;
  });

  it('credits the NA Step Working Guides in About, with the permission notice and non-affiliation', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const about = screen.getByRole('region', { name: 'About Stillpoint' });
    expect(about).toHaveTextContent('This is NA Fellowship-approved literature.');
    expect(about).toHaveTextContent('Copyright © 1998, World Service Office, Inc. Reprinted by permission. All rights reserved.');
    expect(about).toHaveTextContent(/not affiliated with, and is not endorsed by, Narcotics Anonymous/);
    expect(about).toHaveTextContent(/excluded from Stillpoint’s MIT license/);
    expect(screen.getByRole('link', { name: 'Open NA Step Working Guides' })).toHaveAttribute('href', '/library/na-step-guides');
  });

  it('keeps Christian extras out of view for a new install that has not chosen Christian', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(screen.queryByLabelText(/Show Christian extras/)).toBeNull();
    expect(screen.queryByLabelText('Content preset')).toBeNull();
    expect(screen.getByText(/can be added if you choose Christian under Daily readings/)).toBeInTheDocument();
  });

  it('keeps Community Notes off by default and saves an explicit opt-in', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const toggle = screen.getByRole('checkbox', { name: /Show Community Notes/ });

    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ communityNotesEnabled: true });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Community Notes are available on this device.'));
  });

  it('offers Christian extras, off by default, once Christian is chosen, and saves the opt-in', async () => {
    mocks.context = {
      ...(mocks.context as object),
      preferences: { ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['christian'] } },
    } as never;
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const toggle = screen.getByLabelText(/Show Christian extras/);

    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/Our Daily Bread reading plans and podcasts/)).toBeInTheDocument();
    fireEvent.click(toggle);

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ christianExtras: true });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Christian extras are on for this device.'));
  });

  it('shows extras as on for an install from before the switch that had the Faith-based preset', () => {
    const legacy: Record<string, unknown> = { ...defaultPreferences(), traditionChoicePending: undefined, traditionPreference: { mode: 'one', traditions: ['christian'] }, contentPreset: 'faith-based' };
    delete legacy.christianExtras;
    mocks.context = { ...(mocks.context as object), preferences: legacy } as never;
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(screen.getByLabelText(/Show Christian extras/)).toBeChecked();
  });

  it('exposes reduced-motion control and persists the selected preference', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const reducedMotion = screen.getByRole('checkbox', { name: /Reduce motion/ });

    fireEvent.click(reducedMotion);

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reducedMotion: true });
  });

  it('exposes and saves the text-size preference', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const slider = screen.getByLabelText(/Text size/);

    expect(slider).toHaveValue('1');
    fireEvent.change(slider, { target: { value: '1.15' } });

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ textScale: 1.15 });
  });

  it('shows a readable selected state for palette previews', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(screen.getByText(/Palette previews; colors adapt to light or dark appearance/)).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText(/browser icon and the app icon used when you next save or install/)).toBeInTheDocument();
    expect(screen.getByText('Ocean Calm')).toBeInTheDocument();
    expect(screen.getByText('Slate')).toBeInTheDocument();
  });
});
