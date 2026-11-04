import { fireEvent, render, screen } from '@testing-library/react';
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

describe('SettingsPage content preset', () => {
  beforeEach(() => {
    mocks.updatePreferences.mockReset().mockResolvedValue(undefined);
    mocks.notify.mockReset();
    mocks.context = {
      preferences: defaultPreferences(),
      updatePreferences: mocks.updatePreferences,
      notify: mocks.notify,
    } as never;
  });

  it('offers a local Faith-neutral preset and saves the selection', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const selector = screen.getByLabelText('Content preset');

    expect(selector).toHaveValue('faith-based');
    expect(screen.getByText(/Our Daily Bread and Scripture for the Journey/)).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'faith-neutral' } });

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ contentPreset: 'faith-neutral' });
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

    expect(screen.getByText('Palette previews; colors adapt to light or dark appearance.')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });
});
