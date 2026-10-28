import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { buildMilestones } from '../domain/time';
import { RecoveryMilestoneTokens } from './RecoveryMilestoneTokens';

const startAt = '2026-01-01T00:00:00.000Z';
const now = Date.parse('2026-02-02T00:00:00.000Z');

describe('RecoveryMilestoneTokens', () => {
  it('renders the app’s existing date-based milestones without changing the timeline', () => {
    const expectedMilestones = buildMilestones(startAt);
    render(<RecoveryMilestoneTokens startAt={startAt} now={now} />);

    expect(screen.getByRole('heading', { name: 'Keytags & medallions' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Show back of .* keytag$/ })).toHaveLength(expectedMilestones.length);
    expect(screen.getAllByText('24 hours')).toHaveLength(2);
    expect(screen.getAllByText('30 days')).toHaveLength(2);
    expect(screen.getAllByText('1 year')).toHaveLength(2);
    expect(screen.getByText(/artwork does not change milestone dates, thresholds, or award rules/i)).toBeInTheDocument();
  });

  it('lets a person turn each existing milestone token and switch between keytag and medallion views', () => {
    render(<RecoveryMilestoneTokens startAt={startAt} now={now} />);

    const keytag = screen.getByRole('button', { name: 'Show back of 24 hours keytag' });
    expect(keytag).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(keytag);
    expect(screen.getByRole('button', { name: 'Show front of 24 hours keytag' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Medallions' }));
    expect(screen.getByRole('button', { name: 'Show front of 24 hours medallion' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show front of 24 hours medallion' }));
    expect(screen.getByRole('button', { name: 'Show back of 24 hours medallion' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the token collection previewable before a recovery date is set', () => {
    render(<RecoveryMilestoneTokens startAt={null} now={now} />);
    expect(screen.getByText('Preview collection')).toBeInTheDocument();
    expect(screen.getByText(/Choose a recovery date on Today/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Show back of .* keytag$/ })).toHaveLength(buildMilestones('2020-01-01T00:00:00.000Z').length);
    expect(screen.getByRole('button', { name: /Reached \(0\)/ })).toBeDisabled();
  });

  it('hides token labels and dates in discreet mode', () => {
    render(<RecoveryMilestoneTokens startAt={startAt} now={now} discreetMode />);
    expect(screen.getByText('Token and time details are hidden while discreet mode is on.')).toBeInTheDocument();
    expect(screen.queryByText('24 hours')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show .* keytag/ })).not.toBeInTheDocument();
  });
});
