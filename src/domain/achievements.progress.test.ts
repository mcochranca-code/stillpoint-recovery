import { describe, expect, it } from 'vitest';
import { charmDefinitions } from '../data/charms';
import { defaultPreferences } from '../db/repository';
import { charmProgress, type ActivitySnapshot } from './achievements';
import type { CharmDefinition, JournalEntry } from './types';

const entry = (id: string, type: JournalEntry['type'], copingStrategy?: string): JournalEntry => ({
  id, type, title: id, body: 'A private test entry.', createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z', tags: [], gratitude: [], copingStrategy,
});

function snapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    preferences: defaultPreferences(), sobrietyDays: 0, journalEntries: [], completedSessions: [],
    scriptureActivity: [], reflectionCount: 0, hasIntention: false, hasReturnedAfterBreak: false, ...overrides,
  };
}

const charm = (id: string): CharmDefinition => {
  const found = charmDefinitions.find((item) => item.id === id);
  if (!found) throw new Error(`missing charm ${id}`);
  return found;
};

describe('charmProgress', () => {
  it('reports a target and label for every defined charm', () => {
    for (const definition of charmDefinitions) {
      const progress = charmProgress(definition, snapshot());
      expect(progress.target).toBeGreaterThan(0);
      expect(progress.label.length).toBeGreaterThan(0);
      expect(progress.current).toBe(0);
    }
  });

  it('counts sobriety days toward each day-based milestone with its own target', () => {
    const state = snapshot({ sobrietyDays: 45 });
    expect(charmProgress(charm('seven-day-oak'), state)).toMatchObject({ current: 45, target: 7 });
    expect(charmProgress(charm('deep-roots'), state)).toMatchObject({ current: 45, target: 30 });
    expect(charmProgress(charm('new-horizon'), state)).toMatchObject({ current: 45, target: 90 });
    expect(charmProgress(charm('year-of-growth'), state)).toMatchObject({ current: 45, target: 365, label: 'Days since selected recovery date' });
  });

  it('counts gratitude entries, distinct scripture, reflections, and journal entries', () => {
    const state = snapshot({
      journalEntries: [entry('a', 'gratitude'), entry('b', 'gratitude'), entry('c', 'free-writing')],
      scriptureActivity: [{ scriptureId: 's1' }, { scriptureId: 's1' }, { scriptureId: 's2' }] as ActivitySnapshot['scriptureActivity'],
      reflectionCount: 2,
    });
    expect(charmProgress(charm('grateful-spirit'), state)).toMatchObject({ current: 2, target: 7 });
    expect(charmProgress(charm('faithful-practice'), state)).toMatchObject({ current: 2, target: 7 });
    expect(charmProgress(charm('steady-footsteps'), state)).toMatchObject({ current: 2, target: 3 });
    expect(charmProgress(charm('open-heart'), state)).toMatchObject({ current: 3, target: 5 });
  });

  it('treats one-time charms as complete only when all conditions hold', () => {
    const onboarded = { ...defaultPreferences(), onboardingComplete: true };
    expect(charmProgress(charm('first-light'), snapshot({ preferences: onboarded })).current).toBe(0);
    expect(charmProgress(charm('first-light'), snapshot({ preferences: onboarded, hasIntention: true })).current).toBe(1);
    expect(charmProgress(charm('courageous-step'), snapshot({ journalEntries: [entry('t', 'trigger', '   ')] })).current).toBe(0);
    expect(charmProgress(charm('courageous-step'), snapshot({ journalEntries: [entry('t', 'trigger', 'Called my sponsor')] })).current).toBe(1);
    expect(charmProgress(charm('resilient-heart'), snapshot({ hasReturnedAfterBreak: true })).current).toBe(1);
    expect(charmProgress(charm('quiet-mind'), snapshot({ completedSessions: [{ id: 's' }] as ActivitySnapshot['completedSessions'] })).current).toBe(1);
  });

  it('falls back to the charm criteria for an unknown charm', () => {
    const unknown = { ...charm('first-light'), id: 'future-charm', criteria: 'Something new' };
    expect(charmProgress(unknown, snapshot())).toEqual({ current: 0, target: 1, label: 'Something new' });
  });
});
