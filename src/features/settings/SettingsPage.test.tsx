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

  it('exposes reduced-motion control and persists the selected preference', () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const reducedMotion = screen.getByRole('checkbox', { name: /Reduce motion/ });

    fireEvent.click(reducedMotion);

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reducedMotion: true });
  });
});
