import { describe, expect, it } from 'vitest';
import {
  buildMilestones,
  dateOnlyToTimestamp,
  elapsedParts,
  formatElapsed,
  formatLocalDate,
  nextMilestone,
  periodStart,
  reachedMilestones,
} from './time';

describe('time helpers: invalid input and formatting branches', () => {
  it('rejects an invalid local date or time', () => {
    expect(() => dateOnlyToTimestamp('not-a-date')).toThrow('Choose a valid local recovery date and time.');
    expect(() => dateOnlyToTimestamp('2026-10-17', '99:99')).toThrow(/valid local recovery date/);
  });

  it('defaults the time to local midnight', () => {
    const parsed = new Date(dateOnlyToTimestamp('2026-03-05'));
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getDate()).toBe(5);
  });

  it('returns null elapsed parts for empty or unparseable starts', () => {
    expect(elapsedParts(undefined)).toBeNull();
    expect(elapsedParts('')).toBeNull();
    expect(elapsedParts('garbage')).toBeNull();
  });

  it('builds no milestones for an invalid start and reports none reached', () => {
    expect(buildMilestones('garbage')).toEqual([]);
    expect(reachedMilestones('garbage', Date.now())).toEqual([]);
    expect(nextMilestone('garbage', Date.now())).toBeNull();
    expect(nextMilestone(null)).toBeNull();
  });

  it('returns null when every milestone is already in the past', () => {
    const start = new Date(2000, 0, 1).toISOString();
    const farFuture = new Date(2200, 0, 1).getTime();
    expect(nextMilestone(start, farFuture)).toBeNull();
    expect(reachedMilestones(start, farFuture).length).toBe(buildMilestones(start).length);
  });

  it('formats elapsed time as days or full duration', () => {
    expect(formatElapsed(null)).toBe('Set a recovery date whenever you feel ready');
    const one = { days: 1, hours: 2, minutes: 3, seconds: 4, totalSeconds: 93_784 };
    const many = { days: 12, hours: 0, minutes: 5, seconds: 9, totalSeconds: 1_037_109 };
    expect(formatElapsed(one, 'days')).toBe('1 day');
    expect(formatElapsed(many, 'days')).toBe('12 days');
    expect(formatElapsed(one)).toBe('1d 02h 03m 04s');
    expect(formatElapsed(many, 'full')).toBe('12d 00h 05m 09s');
  });

  it('formats Date objects and reports unset dates', () => {
    expect(formatLocalDate('nonsense')).toBe('Date not set');
    expect(formatLocalDate(new Date(Number.NaN))).toBe('Date not set');
    const date = new Date(2026, 6, 4, 9);
    expect(formatLocalDate(date, { year: 'numeric' })).toBe(date.toLocaleDateString(undefined, { year: 'numeric' }));
  });

  it('computes rolling period starts at local midnight', () => {
    const now = new Date(2026, 10, 9, 15, 42, 7);
    const week = periodStart(now, 7);
    expect([week.getFullYear(), week.getMonth(), week.getDate(), week.getHours(), week.getMinutes()]).toEqual([2026, 10, 3, 0, 0]);
    const month = periodStart(now, 30);
    expect([month.getMonth(), month.getDate()]).toEqual([9, 11]);
    const year = periodStart(now, 365);
    expect([year.getFullYear(), year.getMonth(), year.getDate()]).toEqual([2025, 10, 10]);
    expect(now.getHours()).toBe(15);
  });
});
