import { describe, expect, it } from 'vitest';
import { buildMilestones, dateOnlyToTimestamp, elapsedParts, formatElapsed, formatLocalDate, nextMilestone, periodStart } from './time';

describe('time helpers with missing or invalid input', () => {
  it('rejects an invalid local recovery date', () => {
    expect(() => dateOnlyToTimestamp('not-a-date')).toThrow('Choose a valid local recovery date and time.');
  });

  it('returns no elapsed time without a valid start, and never counts below zero', () => {
    expect(elapsedParts(null)).toBeNull();
    expect(elapsedParts('garbage')).toBeNull();
    const start = '2026-11-01T00:00:00.000Z';
    expect(elapsedParts(start, Date.parse(start) - 5000)).toMatchObject({ days: 0, totalSeconds: 0 });
    expect(elapsedParts(start, Date.parse(start) + 90061000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1, totalSeconds: 90061 });
  });

  it('has no milestones for an invalid start and none left after the last one', () => {
    expect(buildMilestones('garbage')).toEqual([]);
    expect(nextMilestone('2026-01-01T00:00:00.000Z', Date.parse('2200-01-01T00:00:00.000Z'))).toBeNull();
  });

  it('formats elapsed time as days or a full duration, with a gentle prompt when no date is set', () => {
    expect(formatElapsed(null)).toBe('Set a recovery date whenever you feel ready');
    const one = { days: 1, hours: 2, minutes: 3, seconds: 4, totalSeconds: 93784 };
    expect(formatElapsed(one, 'days')).toBe('1 day');
    expect(formatElapsed({ ...one, days: 12 }, 'days')).toBe('12 days');
    expect(formatElapsed(one)).toBe('1d 02h 03m 04s');
  });

  it('says a date is not set when it cannot be parsed, and accepts Date values', () => {
    expect(formatLocalDate('nonsense')).toBe('Date not set');
    expect(formatLocalDate(new Date(2026, 0, 15, 12))).toBe(formatLocalDate('2026-01-15'));
  });

  it('starts a rolling period at local midnight', () => {
    const start = periodStart(new Date(2026, 10, 9, 15, 30), 7);
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 10, 3, 0]);
  });
});
