import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, db } from './database';
import { clearAllLocalData, createBackup, importBackupText, inspectBackupText } from './backup';
import { getReaderProgress, saveReaderProgress, saveStepAnswer } from './stepWork';
import { defaultPreferences } from './repository';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('private step-work answers', () => {
  it('saves, updates (keeping the first-written time) and removes a blank answer', async () => {
    await saveStepAnswer('s1-q001', 1, 'It means a disease, not a moral failing.');
    const first = await db.stepWorkAnswers.get('s1-q001');
    expect(first).toMatchObject({ id: 's1-q001', questionId: 's1-q001', stepNumber: 1, text: 'It means a disease, not a moral failing.' });

    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveStepAnswer('s1-q001', 1, 'Updated thought.');
    const second = await db.stepWorkAnswers.get('s1-q001');
    expect(second?.text).toBe('Updated thought.');
    expect(second?.createdAt).toBe(first?.createdAt);
    expect(Date.parse(second!.updatedAt)).toBeGreaterThanOrEqual(Date.parse(first!.updatedAt));

    await saveStepAnswer('s1-q001', 1, '   ');
    expect(await db.stepWorkAnswers.get('s1-q001')).toBeUndefined();
  });

  it('remembers the reader position and text size, resetting the section when the chapter changes', async () => {
    expect(await getReaderProgress()).toBeUndefined();
    await saveReaderProgress({ chapterId: 'step-4', sectionId: 'step-4-resentments' });
    await saveReaderProgress({ textSize: 'large' });
    expect(await getReaderProgress()).toMatchObject({ id: 'na-step-guides', chapterId: 'step-4', sectionId: 'step-4-resentments', textSize: 'large' });
    await saveReaderProgress({ chapterId: 'step-5' });
    const moved = await getReaderProgress();
    expect(moved).toMatchObject({ chapterId: 'step-5', textSize: 'large' });
    expect(moved?.sectionId).toBeUndefined();
  });
});

describe('step work in backup, restore and delete-all', () => {
  it('includes answers and reader progress in the backup and restores them on another device', async () => {
    await saveStepAnswer('s4-q012', 4, 'A private answer.');
    await saveReaderProgress({ chapterId: 'step-4', sectionId: 'step-4-fear', textSize: 'larger' });
    const backup = await createBackup();
    expect(backup.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(backup.tables.stepWorkAnswers).toEqual([expect.objectContaining({ id: 's4-q012', text: 'A private answer.' })]);
    expect(backup.tables.readerProgress).toEqual([expect.objectContaining({ chapterId: 'step-4', sectionId: 'step-4-fear', textSize: 'larger' })]);

    await clearAllLocalData();
    expect(await db.stepWorkAnswers.count()).toBe(0);
    const text = JSON.stringify(backup);
    const preview = await inspectBackupText(text);
    expect(preview.stores.find((store) => store.store === 'stepWorkAnswers')).toMatchObject({ recordsInFile: 1, readyToImport: 1 });
    const result = await importBackupText(text);
    expect(result.skippedInvalid).toBe(0);
    expect(await db.stepWorkAnswers.get('s4-q012')).toMatchObject({ text: 'A private answer.', stepNumber: 4 });
    expect(await getReaderProgress()).toMatchObject({ chapterId: 'step-4', textSize: 'larger' });
  });

  it('keeps a newer local answer instead of overwriting it, and rejects malformed answers', async () => {
    await saveStepAnswer('s2-q001', 2, 'Local answer.');
    const now = new Date().toISOString();
    const payload = JSON.stringify({
      application: 'stillpoint-recovery', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: now,
      tables: {
        stepWorkAnswers: [
          { id: 's2-q001', questionId: 's2-q001', stepNumber: 2, text: 'From file.', createdAt: now, updatedAt: now },
          { id: 's3-q002', questionId: 's3-q002', stepNumber: 3, text: 'New from file.', createdAt: now, updatedAt: now },
          { id: 's13-q001', questionId: 's13-q001', stepNumber: 13, text: 'No such step.', createdAt: now, updatedAt: now },
          { id: 's3-q003', questionId: 's3-q003', stepNumber: 4, text: 'Step mismatch.', createdAt: now, updatedAt: now },
          { id: 's3-q004', questionId: 's3-q004', stepNumber: 3, text: 7, createdAt: now, updatedAt: now },
        ],
        readerProgress: [{ id: 'na-step-guides', chapterId: 'step-99', textSize: 'huge', updatedAt: now }],
      },
    });
    const result = await importBackupText(payload);
    expect(result).toEqual({ imported: 1, skippedDuplicates: 1, skippedInvalid: 4 });
    expect((await db.stepWorkAnswers.get('s2-q001'))?.text).toBe('Local answer.');
    expect((await db.stepWorkAnswers.get('s3-q002'))?.text).toBe('New from file.');
    expect(await getReaderProgress()).toBeUndefined();
  });

  it('still restores older backups that predate step work', async () => {
    const payload = JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 6, exportedAt: new Date().toISOString(), tables: { preferences: [{ ...defaultPreferences(), schemaVersion: 6 }] } });
    expect((await importBackupText(payload)).imported).toBe(1);
    expect(await db.stepWorkAnswers.count()).toBe(0);
  });

  it('delete all removes step-work answers and the reader position', async () => {
    await saveStepAnswer('s9-q001', 9, 'Something private.');
    await saveReaderProgress({ chapterId: 'step-9' });
    await clearAllLocalData();
    expect(await db.stepWorkAnswers.count()).toBe(0);
    expect(await db.readerProgress.count()).toBe(0);
  });
});

describe('schema migration to v7', () => {
  it('upgrades a version-6 database without losing data and adds empty step-work tables', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(6).stores({ preferences: 'id', recoveryProfiles: 'id', journalEntries: 'id, type, createdAt, updatedAt, *tags', communityCredentials: 'id, readingKey, createdAt' });
    await legacy.open();
    const now = new Date().toISOString();
    await legacy.table('preferences').put({ ...defaultPreferences(), schemaVersion: 6, highContrast: true });
    await legacy.table('journalEntries').put({ id: 'journal:keep', type: 'free-writing', title: 'Kept', body: 'Still here', createdAt: now, updatedAt: now, tags: [], gratitude: [] });
    legacy.close();

    await db.open();
    // v7 introduced the step-work tables; later versions (v8 quarantine) must keep them intact.
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(7);
    expect(await db.preferences.get('preferences')).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, highContrast: true });
    expect(await db.journalEntries.get('journal:keep')).toMatchObject({ body: 'Still here' });
    expect(await db.stepWorkAnswers.count()).toBe(0);
    expect(await db.readerProgress.count()).toBe(0);
    await saveStepAnswer('s1-q002', 1, 'Works after upgrade.');
    expect(await db.stepWorkAnswers.where('stepNumber').equals(1).count()).toBe(1);
  });
});
