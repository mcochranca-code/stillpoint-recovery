import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { clearAllLocalData, importBackupText } from './backup';
import { defaultPreferences, defaultRecoveryProfile } from './repository';
import type { JournalEntry } from '../domain/types';

const exportDate = '2026-10-17T12:00:00.000Z';
const validJournalEntry = (id: string, body = 'A private note.'): JournalEntry => ({
  id, type: 'free-writing', title: 'A note', body, createdAt: exportDate, updatedAt: exportDate,
  tags: [], gratitude: [],
});
const backup = (schemaVersion: number, tables: Record<string, unknown>) => JSON.stringify({
  application: 'stillpoint-recovery', schemaVersion, exportedAt: exportDate, tables,
});

const legacyV2Stores = {
  preferences: 'id', recoveryProfiles: 'id', recoveryDateHistory: 'id, recordedAt',
  dailyReflections: 'id, localDate, reflectionId, [localDate+reflectionId]',
  scriptureActivity: 'id, scriptureId, favorite, [scriptureId+favorite]',
  journalEntries: 'id, type, createdAt, updatedAt, *tags', journalDrafts: 'id, updatedAt',
  meditationSessions: 'id, exerciseId, status, completedAt', activeSessions: 'id, status',
  earnedCharms: 'id, charmId, earnedAt', dailyActivity: 'id, localDate', personalGoals: 'id, createdAt',
  milestoneRecords: 'id, milestoneId, startAt, reachedAt', fieldGuideNotes: 'id, kind, createdAt, updatedAt',
  resetRecords: 'id, feeling, practice, createdAt',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('local JSON backup restore', () => {
  it('imports unique records once and skips duplicate IDs within a file and existing storage', async () => {
    const payload = backup(1, { journalEntries: [validJournalEntry('journal:1'), validJournalEntry('journal:1', 'duplicate')] });
    const first = await importBackupText(payload);
    expect(first).toEqual({ imported: 1, skippedDuplicates: 1, skippedInvalid: 0 });
    expect((await db.journalEntries.toArray()).map((entry) => entry.body)).toEqual(['A private note.']);

    const repeated = await importBackupText(payload);
    expect(repeated).toEqual({ imported: 0, skippedDuplicates: 2, skippedInvalid: 0 });
    expect(await db.journalEntries.count()).toBe(1);
  });

  it('normalizes a legacy preference record to the default palette and current schema', async () => {
    const legacy = {
      id: 'preferences', schemaVersion: 1, onboardingComplete: false, theme: 'system', highContrast: false,
      reducedMotion: false, hideMeditationVisual: false, textScale: 1, timeFormat: '12h', counterStyle: 'full',
      liveCounter: true, reminderEnabled: false, reminderTime: '19:00', trustedContacts: [], discreetMode: false,
      gardenStyle: 'woodland', allowBreathHolds: false, createdAt: exportDate, updatedAt: exportDate,
    };
    const result = await importBackupText(backup(1, { preferences: [legacy] }));
    expect(result.imported).toBe(1);
    expect(await db.preferences.get('preferences')).toMatchObject({ colorTheme: 'stillpoint', supportResources: [], schemaVersion: 3 });
  });

  it('replaces singleton preferences and profile while merging records from a backup', async () => {
    await db.preferences.add({ ...defaultPreferences(), onboardingComplete: true });
    await db.recoveryProfiles.add({ ...defaultRecoveryProfile(), intention: 'Current intention' });

    const importedPreferences = { ...defaultPreferences(), onboardingComplete: false };
    const importedProfile = { ...defaultRecoveryProfile(), intention: 'Backed-up intention' };
    const result = await importBackupText(backup(3, {
      preferences: [importedPreferences],
      recoveryProfiles: [importedProfile],
      journalEntries: [validJournalEntry('journal:restored')],
    }));

    expect(result.imported).toBe(3);
    expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(false);
    expect((await db.recoveryProfiles.get('recovery-profile'))?.intention).toBe('Backed-up intention');
    expect(await db.journalEntries.get('journal:restored')).toBeDefined();
  });

  it('rolls back earlier inserts when a later backup section is malformed', async () => {
    await expect(importBackupText(backup(3, {
      journalEntries: [validJournalEntry('journal:must-rollback')],
      personalMilestones: null,
    }))).rejects.toThrow('must be a list');

    expect(await db.journalEntries.count()).toBe(0);
  });

  it('clears all persisted records through the local-data deletion operation', async () => {
    await db.preferences.add(defaultPreferences());
    await db.recoveryProfiles.add(defaultRecoveryProfile());
    await db.journalEntries.add(validJournalEntry('journal:private'));

    await clearAllLocalData();

    expect(await db.preferences.count()).toBe(0);
    expect(await db.recoveryProfiles.count()).toBe(0);
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('migrates a real IndexedDB v2 installation and creates the custom-milestone table', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(2).stores(legacyV2Stores);
    await legacy.open();
    await legacy.table('preferences').add({
      id: 'preferences', schemaVersion: 2, onboardingComplete: true, theme: 'dark', colorTheme: 'obsidian',
      highContrast: false, reducedMotion: false, hideMeditationVisual: false, textScale: 1, timeFormat: '12h',
      counterStyle: 'full', liveCounter: true, reminderEnabled: false, reminderTime: '19:00', trustedContacts: [],
      discreetMode: false, gardenStyle: 'woodland', allowBreathHolds: false, createdAt: exportDate, updatedAt: exportDate,
    });
    await legacy.table('dailyReflections').add({
      id: 'reflection:legacy', localDate: '2026-10-17', reflectionId: 'reflection-001',
      favorite: true, exploredAt: exportDate,
    });
    await legacy.table('scriptureActivity').add({
      id: 'scripture:legacy', scriptureId: 'scripture-001', favorite: true, exploredAt: exportDate,
    });
    legacy.close();

    await db.open();
    expect(await db.preferences.get('preferences')).toMatchObject({ colorTheme: 'obsidian', supportResources: [], schemaVersion: 5, meetingReminders: [] });
    expect(await db.personalMilestones.count()).toBe(0);
    expect(await db.dailyReflections.where('favoriteKey').equals(1).count()).toBe(1);
    expect(await db.scriptureActivity.where('favoriteKey').equals(1).count()).toBe(1);
  });

  it('restores indexed favorite keys from legacy backup records', async () => {
    const result = await importBackupText(backup(3, {
      dailyReflections: [{ id: 'reflection:restored', localDate: '2026-10-17', reflectionId: 'reflection-001', favorite: true, exploredAt: exportDate }],
      scriptureActivity: [{ id: 'scripture:restored', scriptureId: 'scripture-001', favorite: true, exploredAt: exportDate }],
    }));

    expect(result.imported).toBe(2);
    expect(await db.dailyReflections.where('favoriteKey').equals(1).count()).toBe(1);
    expect(await db.scriptureActivity.where('favoriteKey').equals(1).count()).toBe(1);
  });

  it('validates each imported store and rejects malformed sessions, activity counts and custom milestone targets', async () => {
    const result = await importBackupText(backup(3, {
      activeSessions: [{ id: 'active:bad', exerciseId: 'breathing', exerciseName: 'Breathing', plannedMinutes: 3, elapsedMs: -1, status: 'running', createdAt: exportDate }],
      dailyActivity: [{ id: '2026-10-17', localDate: '2026-10-17', reflectionsCompleted: 'many', scriptureExplored: 0, meditationMinutes: 0, journalEntries: 0, gratitudeEntries: 0 }],
      personalMilestones: [
        { id: 'milestone:one', label: 'A small marker', daysAfterStart: 30, createdAt: exportDate },
        { id: 'milestone:one', label: 'Duplicate marker', daysAfterStart: 60, createdAt: exportDate },
        { id: 'milestone:bad', label: 'Invalid marker', daysAfterStart: 0, createdAt: exportDate },
      ],
    }));
    expect(result).toEqual({ imported: 1, skippedDuplicates: 1, skippedInvalid: 3 });
    expect(await db.personalMilestones.toArray()).toMatchObject([{ label: 'A small marker', daysAfterStart: 30 }]);
    expect(await db.activeSessions.count()).toBe(0);
    expect(await db.dailyActivity.count()).toBe(0);
  });

  it('skips invalid records and rejects malformed or unsupported backup containers', async () => {
    const result = await importBackupText(backup(3, { journalEntries: [{ id: 'invalid', body: 'missing title and tags' }] }));
    expect(result).toEqual({ imported: 0, skippedDuplicates: 0, skippedInvalid: 1 });
    await expect(importBackupText('{')).rejects.toThrow('valid JSON');
    await expect(importBackupText(backup(99, {}))).rejects.toThrow('not supported');
  });
});
