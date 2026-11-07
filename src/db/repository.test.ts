import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, db } from './database';
import { defaultPreferences, ensureDefaults, returnedAfterActivityBreak, updateDailyActivity } from './repository';
import { localDateKey } from '../domain/time';
import { effectiveTraditionPreference, hasChosenTradition } from '../domain/traditions';

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
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contentPreset: 'faith-based',
      theme: 'system',
      onboardingComplete: false,
      supportResources: [],
      meetingReminders: [],
    });
    expect(profile).toMatchObject({
      id: 'recovery-profile',
      schemaVersion: CURRENT_SCHEMA_VERSION,
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

  it('backfills existing preference records without a content preset to Faith-based', async () => {
    await ensureDefaults();
    const existing = await db.preferences.get('preferences');
    const legacy = { ...existing! };
    Reflect.deleteProperty(legacy, 'contentPreset');
    await db.preferences.put(legacy);

    await ensureDefaults();

    expect((await db.preferences.get('preferences'))?.contentPreset).toBe('faith-based');
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

    expect((await db.recoveryProfiles.get('recovery-profile'))?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('migrates a version-5 database to v6 without losing data, mapping the content preset to a tradition', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(5).stores({ preferences: 'id', recoveryProfiles: 'id', journalEntries: 'id, type, createdAt, updatedAt, *tags', scriptureActivity: 'id, scriptureId, favoriteKey' });
    await legacy.open();
    const now = new Date().toISOString();
    const v5 = { ...defaultPreferences(), schemaVersion: 5, contentPreset: 'faith-neutral', highContrast: true } as Record<string, unknown>;
    Reflect.deleteProperty(v5, 'traditionPreference');
    Reflect.deleteProperty(v5, 'traditionChoicePending'); // A real v5 record predates the first-run choice.
    await legacy.table('preferences').put(v5);
    await legacy.table('journalEntries').put({ id: 'journal:keep', type: 'free-writing', title: 'Kept', body: 'Still here', createdAt: now, updatedAt: now, tags: [], gratitude: [] });
    await legacy.table('scriptureActivity').put({ id: 'scripture:romans-15-13', scriptureId: 'romans-15-13', favorite: true, favoriteKey: 1, exploredAt: now });
    legacy.close();

    await db.open();
    const preferences = await db.preferences.get('preferences');
    expect(preferences).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, contentPreset: 'faith-neutral', highContrast: true, traditionPreference: { mode: 'one', traditions: ['reflective'] } });
    // Existing installs keep their migrated tradition and count as chosen: no first-run prompt.
    expect(preferences?.traditionChoicePending).toBeUndefined();
    expect(hasChosenTradition(preferences)).toBe(true);
    expect(await db.journalEntries.get('journal:keep')).toMatchObject({ body: 'Still here' });
    expect(await db.scriptureActivity.get('scripture:romans-15-13')).toMatchObject({ favorite: true });
  });

  it('migrates a faith-based version-5 install to Christian readings, counted as already chosen', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(5).stores({ preferences: 'id', recoveryProfiles: 'id' });
    await legacy.open();
    const v5 = { ...defaultPreferences(), schemaVersion: 5, contentPreset: 'faith-based', onboardingComplete: true } as Record<string, unknown>;
    Reflect.deleteProperty(v5, 'traditionPreference');
    Reflect.deleteProperty(v5, 'traditionChoicePending');
    await legacy.table('preferences').put(v5);
    legacy.close();

    await db.open();
    await ensureDefaults();
    const preferences = await db.preferences.get('preferences');
    expect(preferences?.traditionPreference).toEqual({ mode: 'one', traditions: ['christian'] });
    expect(hasChosenTradition(preferences)).toBe(true);
    expect(effectiveTraditionPreference(preferences)).toEqual({ mode: 'one', traditions: ['christian'] });
  });

  it('starts a new install with no tradition chosen and a neutral reading, never Christian by default', async () => {
    await ensureDefaults();
    const preferences = await db.preferences.get('preferences');
    expect(preferences?.traditionChoicePending).toBe(true);
    expect(hasChosenTradition(preferences)).toBe(false);
    expect(effectiveTraditionPreference(preferences)).toEqual({ mode: 'one', traditions: ['reflective'] });
    expect(preferences?.traditionPreference.traditions).not.toContain('christian');
  });

  it('persists a tradition choice and repairs a malformed one on startup', async () => {
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.traditionPreference).toEqual({ mode: 'one', traditions: ['reflective'] });
    const existing = (await db.preferences.get('preferences'))!;
    await db.preferences.put({ ...existing, traditionPreference: { mode: 'several', traditions: ['jain', 'red-road'] } });
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.traditionPreference).toEqual({ mode: 'several', traditions: ['jain', 'red-road'] });
    await db.preferences.put({ ...existing, traditionPreference: { mode: 'several', traditions: ['unknown'] } as never });
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.traditionPreference).toEqual({ mode: 'one', traditions: ['christian'] });
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
