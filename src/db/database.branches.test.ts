import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, StillpointDatabase, db, initializeDatabase } from './database';

const stamp = '2026-10-17T12:00:00.000Z';
const legacyV3Stores = {
  preferences: 'id', recoveryProfiles: 'id', recoveryDateHistory: 'id, recordedAt',
  dailyReflections: 'id, localDate, reflectionId, [localDate+reflectionId]',
  scriptureActivity: 'id, scriptureId, favorite, [scriptureId+favorite]',
  journalEntries: 'id, type, createdAt, updatedAt, *tags', journalDrafts: 'id, updatedAt',
  meditationSessions: 'id, exerciseId, status, completedAt', activeSessions: 'id, status',
  earnedCharms: 'id, charmId, earnedAt', dailyActivity: 'id, localDate', personalGoals: 'id, createdAt',
  personalMilestones: 'id, daysAfterStart, createdAt, achievedAt',
  milestoneRecords: 'id, milestoneId, startAt, reachedAt', fieldGuideNotes: 'id, kind, createdAt, updatedAt',
  resetRecords: 'id, feeling, practice, createdAt',
};

describe('database schema migrations', () => {
  const extraNames: string[] = [];

  afterEach(async () => {
    for (const name of extraNames.splice(0)) await Dexie.delete(name);
    if (!db.isOpen()) await db.open();
  });

  it('opens the shared database through initializeDatabase', async () => {
    db.close();
    expect(db.isOpen()).toBe(false);
    await initializeDatabase();
    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('indexes favorite and non-favorite legacy reflections and scripture with distinct keys', async () => {
    const name = 'StillpointMigrationFavorites';
    extraNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(3).stores(legacyV3Stores);
    await legacy.open();
    await legacy.table('dailyReflections').bulkAdd([
      { id: 'reflection:kept', localDate: '2026-10-17', reflectionId: 'reflection-001', favorite: true, exploredAt: stamp },
      { id: 'reflection:plain', localDate: '2026-10-18', reflectionId: 'reflection-002', favorite: false, exploredAt: stamp },
    ]);
    await legacy.table('scriptureActivity').bulkAdd([
      { id: 'scripture:kept', scriptureId: 'scripture-001', favorite: true, exploredAt: stamp },
      { id: 'scripture:plain', scriptureId: 'scripture-002', favorite: false, exploredAt: stamp },
    ]);
    legacy.close();

    const migrated = new StillpointDatabase(name);
    await migrated.open();
    try {
      expect(migrated.verno).toBe(CURRENT_SCHEMA_VERSION);
      expect((await migrated.dailyReflections.get('reflection:plain'))?.favoriteKey).toBe(0);
      expect((await migrated.dailyReflections.get('reflection:kept'))?.favoriteKey).toBe(1);
      expect(await migrated.dailyReflections.where('favoriteKey').equals(0).primaryKeys()).toEqual(['reflection:plain']);
      expect(await migrated.scriptureActivity.where('favoriteKey').equals(0).primaryKeys()).toEqual(['scripture:plain']);
      expect(await migrated.scriptureActivity.where('favoriteKey').equals(1).primaryKeys()).toEqual(['scripture:kept']);
      expect(await migrated.stepWorkAnswers.count()).toBe(0);
      expect(await migrated.readerProgress.count()).toBe(0);
    } finally {
      migrated.close();
    }
  });
});
