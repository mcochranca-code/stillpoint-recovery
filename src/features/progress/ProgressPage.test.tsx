import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences } from '../../db/repository';
import { localDateKey } from '../../domain/time';

const mocks = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  notify: vi.fn(),
  context: {} as never,
}));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: mocks.useLiveQuery }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));

import { ProgressPage } from './ProgressPage';

describe('ProgressPage activity chart', () => {
  beforeEach(() => {
    mocks.useLiveQuery.mockReset().mockReturnValue(undefined);
    mocks.notify.mockReset();
    mocks.context = {
      profile: undefined,
      preferences: defaultPreferences(),
      notify: mocks.notify,
    } as never;
  });

  it('shows a neutral empty state and keeps period controls when the period has no activity', () => {
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);

    expect(screen.getByText('No recorded activity in this period yet.')).toBeInTheDocument();
    expect(screen.getByText(/There is no score to meet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse a reflection/i })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('group', { name: 'Activity chart period' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /activity chart/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Reflections', { selector: '.activity-legend span' })).not.toBeInTheDocument();
  });

  it('keeps the accessible chart and legend when there is recorded activity', () => {
    const activity = {
      id: `activity:${localDateKey(new Date())}`,
      localDate: localDateKey(new Date()),
      reflectionsCompleted: 1,
      scriptureExplored: 0,
      meditationMinutes: 0,
      journalEntries: 0,
      gratitudeEntries: 0,
    };
    mocks.useLiveQuery.mockReset().mockImplementationOnce(() => [activity]);

    render(<MemoryRouter><ProgressPage /></MemoryRouter>);

    expect(screen.getByRole('img', { name: /Week activity chart/ })).toBeInTheDocument();
    expect(screen.getByText('Reflections', { selector: '.activity-legend span' })).toBeInTheDocument();
    expect(screen.getByText(/Activity measures recorded participation only/)).toBeInTheDocument();
  });
});
