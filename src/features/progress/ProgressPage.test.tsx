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

describe('ProgressPage gentle path', () => {
  beforeEach(() => {
    mocks.useLiveQuery.mockReset().mockReturnValue(undefined);
    mocks.context = { profile: undefined, preferences: defaultPreferences(), notify: mocks.notify } as never;
  });

  it('opens with “Your path starts here” and one action instead of zero tiles', () => {
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Your path starts here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Set a start date/ })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('region', { name: 'Recovery and wellness summary' })).not.toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });

  it('draws a path with a text equivalent and a week of presence dots once a date is set', () => {
    const startAt = new Date(Date.now() - 97 * 86_400_000).toISOString();
    mocks.context = { profile: { startAt, localStartDate: localDateKey(new Date(startAt)) }, preferences: defaultPreferences(), notify: mocks.notify } as never;
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);
    expect(screen.getByRole('img', { name: /Your path from your start date.*to the 6 months milestone/ })).toBeInTheDocument();
    expect(screen.getByText(/97 days along/, { selector: '.card-header p' })).toBeInTheDocument();
    const week = screen.getByRole('list', { name: 'This week’s practice' });
    expect(week.querySelectorAll('li')).toHaveLength(7);
    expect(week.textContent).toMatch(/a quiet day, nothing recorded/);
    expect(week.textContent).not.toMatch(/miss|broke/i);
  });
});
