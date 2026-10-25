import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { ensureDefaults, returnedAfterActivityBreak, updateDailyActivity } from './repository';
import { localDateKey } from '../domain/time';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('local data repositories', () => {
  it('creates default singleton records once and preserves saved values', async () => {
    await ensureDefaults();
    const preferences = await db.preferences.get('preferences');
    const profile = await db.recoveryProfiles.get('recovery-profile');

    expect(preferences).toMatchObject({
      id: 'preferences',
      schemaVersion: 3,
      theme: 'system',
      onboardingComplete: false,
      supportResources: [],
    });
    expect(profile).toMatchObject({
      id: 'recovery-profile',
      schemaVersion: 3,
      startAt: null,
      localStartDate: null,
      intention: '',
      focus: '',
    });

    await db.preferences.put({ ...preferences!, onboardingComplete: true });
    await ensureDefaults();

    expect(await db.preferences.count()).toBe(1);
    expect(await db.recoveryProfiles.count()).toBe(1);
    expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(true);
  });

  it('upgrades legacy recovery-profile records to the current schema version', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(2).stores({ preferences: 'id', recoveryProfiles: 'id' });
    await legacy.open();
    await legacy.table('recoveryProfiles').put({
      id: 'recovery-profile',
      schemaVersion: 1,
      startAt: null,
      localStartDate: null,
      localStartTime: null,
      startTimeZone: null,
      focus: 'alcohol',
      intention: 'Stay present',
      updatedAt: new Date().toISOString(),
    });
    legacy.close();
    await db.open();

    expect((await db.recoveryProfiles.get('recovery-profile'))?.schemaVersion).toBe(3);
  });

  it('increments supplied daily counters and replaces them when requested', async () => {
    const today = localDateKey(new Date());
    await updateDailyActivity({ reflectionsCompleted: 2, journalEntries: 1 }, true);
    await updateDailyActivity({ reflectionsCompleted: 1, scriptureExplored: 3 }, true);

    expect(await db.dailyActivity.get(today)).toMatchObject({
      id: today,
      localDate: today,
      reflectionsCompleted: 3,
      scriptureExplored: 3,
      journalEntries: 1,
      meditationMinutes: 0,
      gratitudeEntries: 0,
    });

    await updateDailyActivity({ reflectionsCompleted: 8 }, false);
    expect(await db.dailyActivity.get(today)).toMatchObject({
      reflectionsCompleted: 8,
      scriptureExplored: 3,
      journalEntries: 1,
    });
  });

  it('detects returning after seven full local calendar days without activity', async () => {
    expect(await returnedAfterActivityBreak()).toBe(false);

    const today = new Date();
    const previous = new Date(today);
    previous.setDate(previous.getDate() - 6);
    const previousKey = localDateKey(previous);
    await db.dailyActivity.add({
      id: previousKey, localDate: previousKey,
      reflectionsCompleted: 0, scriptureExplored: 0, meditationMinutes: 0, journalEntries: 0, gratitudeEntries: 0,
    });
    expect(await returnedAfterActivityBreak()).toBe(false);

    previous.setDate(previous.getDate() - 1);
    await db.dailyActivity.delete(previousKey);
    const breakDate = localDateKey(previous);
    await db.dailyActivity.add({
      id: breakDate, localDate: breakDate,
      reflectionsCompleted: 0, scriptureExplored: 0, meditationMinutes: 0, journalEntries: 0, gratitudeEntries: 0,
    });
    expect(await returnedAfterActivityBreak()).toBe(true);
  });
});
