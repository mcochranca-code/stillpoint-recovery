import { describe, expect, it } from 'vitest';
import { buildMilestones, reachedMilestones } from './time';
import { currentRecoveryTokenMilestone, milestoneTokenNumber } from './recovery-token';

const startAt = '2026-01-01T00:00:00.000Z';

describe('currentRecoveryTokenMilestone', () => {
  it('returns only the latest reached milestone from the established fixed timeline', () => {
    const now = Date.parse('2026-02-05T00:00:00.000Z');
    const reached = reachedMilestones(startAt, now);
    const current = currentRecoveryTokenMilestone(startAt, now);

    expect(current?.id).toBe('30-days');
    expect(current?.label).toBe('30 days');
    expect(current?.id).toBe(reached[reached.length - 1]?.id);
    expect(current?.id).not.toBe('60-days');
    expect(buildMilestones(startAt).map((item) => item.id)).toContain('60-days');
  });

  it('shows no token before the first 24-hour milestone or when there is no valid start date', () => {
    expect(currentRecoveryTokenMilestone(startAt, Date.parse('2026-01-01T23:59:59.000Z'))).toBeNull();
    expect(currentRecoveryTokenMilestone(null, Date.parse('2026-02-05T00:00:00.000Z'))).toBeNull();
    expect(currentRecoveryTokenMilestone('not-a-date', Date.parse('2026-02-05T00:00:00.000Z'))).toBeNull();
  });

  it('activates a token exactly when the existing 24-hour threshold is reached', () => {
    const current = currentRecoveryTokenMilestone(startAt, Date.parse('2026-01-02T00:00:00.000Z'));
    expect(current?.id).toBe('24-hours');
  });
});

describe('milestoneTokenNumber', () => {
  it.each([
    ['24 hours', { number: '24', unit: 'HOURS' }],
    ['30 days', { number: '30', unit: 'DAYS' }],
    ['6 months', { number: '6', unit: 'MONTHS' }],
    ['1 year', { number: '1', unit: 'YEAR' }],
    ['12 years', { number: '12', unit: 'YEARS' }],
  ])('formats %s without changing its milestone label', (label, expected) => {
    expect(milestoneTokenNumber(label)).toEqual(expected);
  });
});
