import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { defaultPreferences, defaultRecoveryProfile } from './repository';
import { awardEligibleCharms, collectActivitySnapshot } from './achievements';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('persisted Journey Collection activity', () => {
  it('builds a snapshot from unique reflected content and completed meditation sessions', async () => {
    await db.preferences.add(defaultPreferences());
    await db.recoveryProfiles.add({ ...defaultRecoveryProfile(), intention: 'Be present' });
    await db.dailyReflections.bulkAdd([
      { id: 'reflection-a-1', localDate: '2026-01-01', reflectionId: 'reflection-a', favorite: false, exploredAt: '2026-01-01T12:00:00Z', reflectedAt: '2026-01-01T12:00:00Z' },
      { id: 'reflection-a-2', localDate: '2026-01-02', reflectionId: 'reflection-a', favorite: false, exploredAt: '2026-01-02T12:00:00Z', reflectedAt: '2026-01-02T12:00:00Z' },
      { id: 'reflection-b', localDate: '2026-01-03', reflectionId: 'reflection-b', favorite: false, exploredAt: '2026-01-03T12:00:00Z' },
    ]);
    await db.meditationSessions.bulkAdd([
      { id: 'done', exerciseId: 'calm', exerciseName: 'Calm', plannedMinutes: 2, elapsedSeconds: 120, startedAt: '2026-01-01T12:00:00Z', completedAt: '2026-01-01T12:02:00Z', status: 'completed' },
      { id: 'ended', exerciseId: 'calm', exerciseName: 'Calm', plannedMinutes: 2, elapsedSeconds: 30, startedAt: '2026-01-02T12:00:00Z', status: 'ended' },
    ]);

    const snapshot = await collectActivitySnapshot(12);
    expect(snapshot.reflectionCount).toBe(1);
    expect(snapshot.completedSessions.map((session) => session.id)).toEqual(['done']);
    expect(snapshot.hasIntention).toBe(true);
  });

  it('rejects charm collection until preferences exist', async () => {
    await expect(collectActivitySnapshot(0)).rejects.toThrow('User preferences are not ready');
  });

  it('writes eligible charms once and leaves earned records intact on subsequent runs', async () => {
    await db.preferences.add({ ...defaultPreferences(), onboardingComplete: true });
    await db.recoveryProfiles.add({ ...defaultRecoveryProfile(), intention: 'Keep showing up' });

    const firstAwards = await awardEligibleCharms(0);
    expect(firstAwards.map((award) => award.charmId)).toContain('first-light');
    expect(await db.earnedCharms.count()).toBe(firstAwards.length);

    expect(await awardEligibleCharms(0)).toEqual([]);
    expect(await db.earnedCharms.count()).toBe(firstAwards.length);
  });
});
