import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppContext } from '../../app/AppContext';
import { CurrentMilestoneTokenPage } from './CurrentMilestoneTokenPage';

vi.mock('../../app/AppContext', () => ({ useAppContext: vi.fn() }));
vi.mock('../../components/RecoveryMilestoneCanvas', () => ({
  RecoveryMilestoneCanvas: ({ milestone, style }: { milestone: { label: string }; style: string }) => (
    <div data-testid="milestone-canvas" data-style={style}>{milestone.label}</div>
  ),
}));

function configureContext(startAt: string | null, discreetMode = false) {
  vi.mocked(useAppContext).mockReturnValue({
    preferences: { discreetMode, reducedMotion: false },
    profile: startAt ? { startAt } : undefined,
    ready: true,
    storageError: null,
    updatePreferences: async () => {},
    updateProfile: async () => {},
    notify: () => {},
  } as unknown as ReturnType<typeof useAppContext>);
}

function renderPage() {
  return render(<MemoryRouter><CurrentMilestoneTokenPage /></MemoryRouter>);
}

describe('CurrentMilestoneTokenPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows only the latest reached standard milestone for the local day counter', () => {
    const startAt = new Date(Date.now() - 45 * 86_400_000).toISOString();
    configureContext(startAt);
    renderPage();

    expect(screen.getByRole('heading', { name: '30 days' })).toBeInTheDocument();
    expect(screen.getByLabelText(/45 days on the local counter/i)).toBeInTheDocument();
    expect(screen.getByTestId('milestone-canvas')).toHaveTextContent('30 days');
    expect(screen.getByText(/not an official AA\/NA-issued token/i)).toBeInTheDocument();
    expect(screen.queryByText('60 days')).not.toBeInTheDocument();
    expect(screen.queryByText('6 months')).not.toBeInTheDocument();
  });

  it('switches the current milestone between keytag and medallion without changing the threshold', () => {
    const startAt = new Date(Date.now() - 45 * 86_400_000).toISOString();
    configureContext(startAt);
    renderPage();

    expect(screen.getByRole('button', { name: 'NA Keytag' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'AA Medallion' }));
    expect(screen.getByRole('button', { name: 'AA Medallion' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('milestone-canvas')).toHaveAttribute('data-style', 'medallion');
    expect(screen.getByTestId('milestone-canvas')).toHaveTextContent('30 days');
  });

  it('does not preview future tokens before the first existing threshold', () => {
    const startAt = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    configureContext(startAt);
    renderPage();

    expect(screen.getByRole('heading', { name: 'No timed milestone reached yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('milestone-canvas')).not.toBeInTheDocument();
  });

  it('provides a local setup state when the user has not chosen a recovery date', () => {
    configureContext(null);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Your token will appear here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Today' })).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('milestone-canvas')).not.toBeInTheDocument();
  });

  it('hides the counter, current milestone and renderer in discreet mode', () => {
    configureContext('2026-01-01T00:00:00.000Z', true);
    renderPage();

    expect(screen.getByText(/hidden while discreet mode is on/i)).toBeInTheDocument();
    expect(screen.queryByTestId('milestone-canvas')).not.toBeInTheDocument();
    expect(screen.queryByText('24 hours')).not.toBeInTheDocument();
  });
});
