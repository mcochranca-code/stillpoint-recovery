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
});
