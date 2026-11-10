import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, StillpointDatabase } from './database';

const NAME = 'StillpointRecoveryMigrationTest';

afterEach(async () => {
  await Dexie.delete(NAME);
});

describe('IndexedDB schema migrations', () => {
  it('upgrades a version-3 install, indexing favorites and filling new preference defaults', async () => {
    const legacy = new Dexie(NAME);
    legacy.version(3).stores({
      preferences: 'id',
      recoveryProfiles: 'id',
      dailyReflections: 'id, localDate, reflectionId, [localDate+reflectionId]',
      scriptureActivity: 'id, scriptureId, favorite, [scriptureId+favorite]',
    });
    await legacy.open();
    await legacy.table('preferences').put({ id: 'preferences', schemaVersion: 3, colorTheme: 'stillpoint', supportResources: [], contentPreset: 'faith-neutral' });
    await legacy.table('recoveryProfiles').put({ id: 'recovery-profile', schemaVersion: 3 });
    await legacy.table('dailyReflections').bulkPut([
      { id: 'r-1', localDate: '2026-11-01', reflectionId: 'daily-01', favorite: true },
      { id: 'r-2', localDate: '2026-11-02', reflectionId: 'daily-02', favorite: false },
    ]);
    await legacy.table('scriptureActivity').bulkPut([
      { id: 's-1', scriptureId: 'psalm-23', favorite: true },
      { id: 's-2', scriptureId: 'romans-15-13' },
    ]);
    legacy.close();

    const upgraded = new StillpointDatabase(NAME);
    await upgraded.open();
    expect(await upgraded.dailyReflections.where('favoriteKey').equals(1).primaryKeys()).toEqual(['r-1']);
    expect(await upgraded.dailyReflections.where('favoriteKey').equals(0).primaryKeys()).toEqual(['r-2']);
    expect(await upgraded.scriptureActivity.where('favoriteKey').equals(0).primaryKeys()).toEqual(['s-2']);
    const preferences = await upgraded.preferences.get('preferences');
    expect(preferences).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, meetingReminders: [], traditionPreference: { mode: 'one', traditions: ['reflective'] } });
    expect((await upgraded.recoveryProfiles.get('recovery-profile'))?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    upgraded.close();
  });

  it('upgrades a version-7 install to v8, adding an empty quarantine table without touching records', async () => {
    const v7 = new Dexie(NAME);
    v7.version(7).stores({
      preferences: 'id', recoveryProfiles: 'id', journalEntries: 'id, type, createdAt, updatedAt, *tags',
      stepWorkAnswers: 'id, stepNumber, updatedAt', readerProgress: 'id',
    });
    await v7.open();
    const at = '2026-11-01T12:00:00.000Z';
    const note = { id: 'journal:keep', type: 'free-writing', title: 'Kept', body: 'Still here', createdAt: at, updatedAt: at, tags: ['calm'], gratitude: [] };
    await v7.table('preferences').put({ id: 'preferences', schemaVersion: 7, highContrast: true });
    await v7.table('recoveryProfiles').put({ id: 'recovery-profile', schemaVersion: 7, startAt: at });
    await v7.table('journalEntries').put(note);
    await v7.table('stepWorkAnswers').put({ id: 's1-q001', questionId: 's1-q001', stepNumber: 1, text: 'Mine', createdAt: at, updatedAt: at });
    v7.close();

    const upgraded = new StillpointDatabase(NAME);
    await upgraded.open();
    try {
      expect(CURRENT_SCHEMA_VERSION).toBe(8);
      expect(upgraded.verno).toBe(8);
      expect(upgraded.tables.map((table) => table.name)).toContain('quarantine');
      expect(await upgraded.quarantine.count()).toBe(0);
      expect(await upgraded.journalEntries.get('journal:keep')).toEqual(note);
      expect(await upgraded.stepWorkAnswers.count()).toBe(1);
      expect(await upgraded.preferences.get('preferences')).toMatchObject({ schemaVersion: 8, highContrast: true });
      expect(await upgraded.recoveryProfiles.get('recovery-profile')).toMatchObject({ schemaVersion: 8, startAt: at });
      await upgraded.quarantine.put({ id: 'journalEntries:x', store: 'journalEntries', originalKey: 'x', record: { id: 'x' }, reason: 'test', quarantinedAt: at });
      expect(await upgraded.quarantine.where('store').equals('journalEntries').count()).toBe(1);
    } finally {
      upgraded.close();
    }
  });
});
