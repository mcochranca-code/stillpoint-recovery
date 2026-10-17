import { describe, expect, it } from 'vitest';
import { buildMilestones, dateOnlyToTimestamp, elapsedParts, formatLocalDate, localDateKey, nextMilestone, reachedMilestones } from './time';

describe('local calendar and sobriety time calculations', () => {
  it('creates a stable local calendar date key', () => {
    const date = new Date(2026, 9, 17, 23, 59, 59);
    expect(localDateKey(date)).toBe('2026-10-17');
  });

  it('interprets date-only input as the selected local date and time', () => {
    const value = dateOnlyToTimestamp('2026-10-17', '13:45');
    const parsed = new Date(value);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(17);
    expect(parsed.getHours()).toBe(13);
    expect(parsed.getMinutes()).toBe(45);
  });

  it('keeps date-only formatting stable by interpreting it at local midday', () => {
    const localNoon = new Date(2026, 1, 1, 12);
    expect(formatLocalDate('2026-02-01')).toBe(formatLocalDate(localNoon));
  });

  it('derives elapsed duration from timestamps and clamps future dates to zero', () => {
    const start = new Date(2026, 5, 1, 8, 30).getTime();
    expect(elapsedParts(new Date(start).toISOString(), start + 2 * 86_400_000 + 3_661_000)).toEqual({
      days: 2, hours: 1, minutes: 1, seconds: 1, totalSeconds: 176_461,
    });
    expect(elapsedParts(new Date(start + 1000).toISOString(), start)).toMatchObject({
      days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0,
    });
    expect(elapsedParts(null, start)).toBeNull();
  });

  it('includes early and calendar milestones in chronological order', () => {
    const start = new Date(2024, 0, 31, 10, 15);
    const milestones = buildMilestones(start.toISOString());
    expect(milestones[0]?.id).toBe('24-hours');
    expect(milestones[1]?.id).toBe('3-days');
    const sixMonths = milestones.find((milestone) => milestone.id === 'calendar-6-months');
    expect(sixMonths?.at.getFullYear()).toBe(2024);
    expect(sixMonths?.at.getMonth()).toBe(6);
    expect(sixMonths?.at.getDate()).toBe(31);
    expect(milestones.every((milestone, index) => index === 0 || milestones[index - 1]!.at <= milestone.at)).toBe(true);
  });

  it('selects the next milestone strictly after now and reports reached milestones inclusively', () => {
    const start = new Date(2026, 0, 1, 12).toISOString();
    const dayOne = new Date(start).getTime() + 86_400_000;
    expect(nextMilestone(start, dayOne - 1)?.id).toBe('24-hours');
    expect(nextMilestone(start, dayOne)?.id).toBe('3-days');
    expect(reachedMilestones(start, dayOne).map((milestone) => milestone.id)).toContain('24-hours');
    expect(nextMilestone(null, dayOne)).toBeNull();
  });
});
