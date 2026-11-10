import { describe, expect, it } from 'vitest';
import { describePracticeDay, practiceWeek, progressPath } from './progress-path';
import { localDateKey } from './time';
import type { DailyActivity } from './types';

const day = 86_400_000;
const activity = (date: Date, values: Partial<DailyActivity>): DailyActivity => ({
  id: `activity:${localDateKey(date)}`, localDate: localDateKey(date), reflectionsCompleted: 0, scriptureExplored: 0, meditationMinutes: 0, journalEntries: 0, gratitudeEntries: 0, ...values,
});

describe('progressPath', () => {
  it('returns nothing without a start date', () => {
    expect(progressPath(null)).toBeNull();
    expect(progressPath(undefined)).toBeNull();
  });

  it('places today between the start date and the next milestone', () => {
    const now = new Date(2026, 10, 9, 12).getTime();
    const start = new Date(now - 97 * day).toISOString();
    const model = progressPath(start, now)!;
    expect(model.daysAlong).toBe(97);
    expect(model.next?.label).toBe('6 months');
    expect(model.todayFraction).toBeGreaterThan(0.4);
    expect(model.todayFraction).toBeLessThan(0.7);
    expect(model.reached.map((point) => point.label)).toEqual(['14 days', '30 days', '60 days', '90 days']);
    for (const point of model.reached) expect(point.fraction).toBeLessThanOrEqual(model.todayFraction);
  });

  it('starts at zero on the first day', () => {
    const now = Date.now();
    const model = progressPath(new Date(now - 60_000).toISOString(), now)!;
    expect(model.todayFraction).toBeLessThan(0.01);
    expect(model.reached).toEqual([]);
    expect(model.next?.label).toBe('24 hours');
  });
});

describe('practiceWeek', () => {
  it('shows presence for the last seven days and never counts streaks', () => {
    const today = new Date(2026, 10, 9, 15);
    const twoDaysAgo = new Date(2026, 10, 7, 9);
    const week = practiceWeek([activity(today, { meditationMinutes: 5 }), activity(twoDaysAgo, { journalEntries: 1, reflectionsCompleted: 1 })], today);
    expect(week).toHaveLength(7);
    expect(week[6]!.isToday).toBe(true);
    expect(week[6]!.practices).toEqual({ meditation: true, journal: false, reflection: false });
    expect(week[4]!.practices).toEqual({ meditation: false, journal: true, reflection: true });
    expect(describePracticeDay(week[4]!)).toMatch(/journal and reflection$/);
    expect(describePracticeDay(week[5]!)).toMatch(/a quiet day, nothing recorded$/);
    for (const entry of week) expect(describePracticeDay(entry)).not.toMatch(/miss|broke|streak/i);
  });

  it('counts scripture as a reflection only when faith content is shown', () => {
    const today = new Date(2026, 10, 9, 15);
    expect(practiceWeek([activity(today, { scriptureExplored: 1 })], today, false)[6]!.practices.reflection).toBe(false);
    expect(practiceWeek([activity(today, { scriptureExplored: 1 })], today, true)[6]!.practices.reflection).toBe(true);
  });
});
