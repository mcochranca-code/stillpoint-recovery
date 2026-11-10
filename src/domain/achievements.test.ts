import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../db/repository';
import type { ActivitySnapshot } from './achievements';
import type { JournalEntry } from './types';
import { eligibleCharms } from './achievements';

const journalEntry = (id: string, type: JournalEntry['type'], copingStrategy?: string): JournalEntry => ({
  id, type, title: id, body: 'A private test entry.', createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z', tags: [], gratitude: [], copingStrategy,
});

function snapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    preferences: defaultPreferences(), sobrietyDays: 0, journalEntries: [], completedSessions: [],
    scriptureActivity: [], reflectionCount: 0, hasIntention: false, hasReturnedAfterBreak: false, ...overrides,
  };
}

describe('compassionate Journey Collection eligibility', () => {
  it('requires completed setup and a personal intention for First Light', () => {
    expect(eligibleCharms(snapshot({ preferences: { ...defaultPreferences(), onboardingComplete: true }, hasIntention: false }))).not.toContain('first-light');
    expect(eligibleCharms(snapshot({ preferences: { ...defaultPreferences(), onboardingComplete: true }, hasIntention: true }))).toContain('first-light');
  });

  it('awards engagement charms from supportive actions without a sobriety-day threshold', () => {
    const result = eligibleCharms(snapshot({
      reflectionCount: 3,
      journalEntries: Array.from({ length: 5 }, (_, index) => journalEntry(`journal-${index}`, 'free-writing')),
      completedSessions: [{ id: 'session-1', exerciseId: 'calm-breathing', exerciseName: 'Calm Breathing', plannedMinutes: 2, elapsedSeconds: 120, startedAt: '2026-01-01T12:00:00.000Z', completedAt: '2026-01-01T12:02:00.000Z', status: 'completed' }],
    }));
    expect(result).toEqual(expect.arrayContaining(['steady-footsteps', 'open-heart', 'quiet-mind']));
    expect(result).not.toContain('seven-day-oak');
  });

  it('awards sobriety charms only at their intended 7, 30, 90, and 365-day thresholds', () => {
    expect(eligibleCharms(snapshot({ sobrietyDays: 6 }))).not.toContain('seven-day-oak');
    expect(eligibleCharms(snapshot({ sobrietyDays: 7 }))).toContain('seven-day-oak');
    expect(eligibleCharms(snapshot({ sobrietyDays: 30 }))).toContain('deep-roots');
    expect(eligibleCharms(snapshot({ sobrietyDays: 90 }))).toContain('new-horizon');
    expect(eligibleCharms(snapshot({ sobrietyDays: 365 }))).toContain('year-of-growth');
  });

  it('recognizes a return after a break without requiring a sobriety streak', () => {
    expect(eligibleCharms(snapshot({ sobrietyDays: 0, hasReturnedAfterBreak: true }))).toContain('resilient-heart');
  });

  it('requires a recorded coping response for the voluntary Courageous Step', () => {
    expect(eligibleCharms(snapshot({ journalEntries: [journalEntry('trigger-only', 'trigger')] }))).not.toContain('courageous-step');
    expect(eligibleCharms(snapshot({ journalEntries: [journalEntry('trigger-with-coping', 'trigger', 'Call a friend.')] }))).toContain('courageous-step');
  });
});

describe('milestone charm helpers', () => {
  it('finds the next time-based charm and words its day count', async () => {
    const { nextMilestoneCharm, milestoneCharmLabel } = await import('./achievements');
    expect(nextMilestoneCharm(0)?.id).toBe('seven-day-oak');
    expect(nextMilestoneCharm(7)?.id).toBe('deep-roots');
    expect(nextMilestoneCharm(100)?.id).toBe('year-of-growth');
    expect(nextMilestoneCharm(365)).toBeNull();
    expect(milestoneCharmLabel(30)).toBe('30 days');
    expect(milestoneCharmLabel(365)).toBe('1 year');
  });

  it('returns at most the requested number of earned charms, newest first', async () => {
    const { recentlyEarnedCharms } = await import('./achievements');
    const earned = [
      { id: '1', charmId: 'quiet-mind', earnedAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', charmId: 'open-heart', earnedAt: '2026-03-01T00:00:00.000Z' },
      { id: '3', charmId: 'unknown', earnedAt: '2026-04-01T00:00:00.000Z' },
    ];
    expect(recentlyEarnedCharms(earned, 1).map((item) => item.charm.id)).toEqual(['open-heart']);
    expect(recentlyEarnedCharms(earned).map((item) => item.charm.id)).toEqual(['open-heart', 'quiet-mind']);
  });
});
