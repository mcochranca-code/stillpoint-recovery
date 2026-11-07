import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { clearAllLocalData, createBackup, importBackupText, inspectBackupText } from './backup';
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
const legacyV3Stores = {
  ...legacyV2Stores,
  personalMilestones: 'id, daysAfterStart, createdAt, achievedAt',
};
const legacyV4Stores = {
  ...legacyV3Stores,
  dailyReflections: 'id, localDate, reflectionId, favoriteKey, [localDate+reflectionId]',
  scriptureActivity: 'id, scriptureId, favoriteKey',
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

  it('previews restore counts without writing, then reports the same merge result', async () => {
    await db.journalEntries.add(validJournalEntry('journal:local'));
    const payload = backup(5, {
      preferences: [{ ...defaultPreferences(), onboardingComplete: false }],
      journalEntries: [
        validJournalEntry('journal:incoming'),
        validJournalEntry('journal:local'),
        validJournalEntry('journal:local', 'duplicate in file'),
        { id: 'journal:invalid', body: 'missing required fields' },
      ],
    });

    const preview = await inspectBackupText(payload);

    expect(preview).toMatchObject({ recordsInFile: 5, readyToImport: 2, skippedDuplicates: 2, skippedInvalid: 1 });
    expect(preview.stores.find((store) => store.store === 'preferences')).toMatchObject({ behavior: 'replace singleton', readyToImport: 1 });
    expect(await db.journalEntries.count()).toBe(1);
    expect(await db.preferences.count()).toBe(0);

    const result = await importBackupText(payload);
    expect(result).toEqual({ imported: 2, skippedDuplicates: 2, skippedInvalid: 1 });
    expect(await db.journalEntries.count()).toBe(2);
    expect(await db.preferences.get('preferences')).toMatchObject({ onboardingComplete: false, schemaVersion: 5 });
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
    expect(await db.preferences.get('preferences')).toMatchObject({ colorTheme: 'stillpoint', contentPreset: 'faith-based', supportResources: [], meetingReminders: [], schemaVersion: 5 });
  });

  it('exports and restores the selected Faith-neutral preset', async () => {
    await db.preferences.put({ ...defaultPreferences(), contentPreset: 'faith-neutral' });
    const exported = await createBackup();
    expect(exported.checksum).toMatch(/^[a-f0-9]{64}$/);
    const text = JSON.stringify(exported);
    expect(text).toContain('"contentPreset":"faith-neutral"');

    await db.preferences.put({ ...defaultPreferences(), contentPreset: 'faith-based' });
    await importBackupText(text);

    expect((await db.preferences.get('preferences'))?.contentPreset).toBe('faith-neutral');
  });

  it('backs up meeting reminders but never exports community deletion credentials', async () => {
    const reminder = {
      id: 'reminder:one', meetingId: 'meeting:one', leadMinutes: 30 as const, createdAt: exportDate,
      lastAttemptedOccurrenceAt: exportDate,
    };
    await db.meetingReminders.add(reminder);
    await db.communityCredentials.add({
      id: 'community:one', readingKey: 'reading-key', text: 'Public note', createdAt: exportDate,
      deletionToken: 'delete-key',
    });

    const exported = await createBackup();
    expect(exported.tables.meetingReminders).toEqual([reminder]);
    expect(exported.tables).not.toHaveProperty('communityCredentials');

    await db.meetingReminders.clear();
    const result = await importBackupText(JSON.stringify(exported));
    expect(result.imported).toBe(1);
    expect(await db.meetingReminders.get('reminder:one')).toMatchObject(reminder);
    expect(await db.communityCredentials.get('community:one')).toBeDefined();
  });

  it('rejects a modified checksummed backup without changing local data', async () => {
    await db.journalEntries.add(validJournalEntry('journal:local'));
    const exported = await createBackup();
    const tampered = JSON.stringify({
      ...exported,
      tables: { ...exported.tables, journalEntries: [validJournalEntry('journal:tampered', 'changed')] },
    });

    await expect(importBackupText(tampered)).rejects.toThrow('checksum does not match');
    expect(await db.journalEntries.toArray()).toMatchObject([{ id: 'journal:local' }]);
  });

  it('rejects backups without a valid export timestamp before writing', async () => {
    const invalidTimestamp = JSON.stringify({
      application: 'stillpoint-recovery', schemaVersion: 5, exportedAt: 'not-a-date',
      tables: { journalEntries: [validJournalEntry('journal:must-not-import')] },
    });

    await expect(importBackupText(invalidTimestamp)).rejects.toThrow('not supported');
    expect(await db.journalEntries.count()).toBe(0);
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
    await db.communityCredentials.add({
      id: 'community:private', readingKey: 'reading-key', text: 'Public note', createdAt: exportDate,
      deletionToken: 'delete-key',
    });

    await clearAllLocalData();

    expect(await db.preferences.count()).toBe(0);
    expect(await db.recoveryProfiles.count()).toBe(0);
    expect(await db.journalEntries.count()).toBe(0);
    expect(await db.communityCredentials.count()).toBe(0);
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

  it.each([
    { version: 1, stores: legacyV2Stores },
    { version: 3, stores: legacyV3Stores },
    { version: 4, stores: legacyV4Stores },
  ])('migrates a real IndexedDB v$version installation through each remaining version', async ({ version, stores }) => {
    db.close();
    await db.delete();
    const legacy = new Dexie('StillpointRecovery');
    legacy.version(version).stores(stores);
    await legacy.open();
    await legacy.table('preferences').add({
      id: 'preferences', schemaVersion: version, onboardingComplete: true, theme: 'dark', colorTheme: 'obsidian',
      highContrast: false, reducedMotion: false, hideMeditationVisual: false, textScale: 1, timeFormat: '12h',
      counterStyle: 'full', liveCounter: true, reminderEnabled: false, reminderTime: '19:00', trustedContacts: [],
      supportResources: [], discreetMode: false, gardenStyle: 'woodland', allowBreathHolds: false,
      createdAt: exportDate, updatedAt: exportDate,
    });
    await legacy.table('recoveryProfiles').add({
      id: 'recovery-profile', schemaVersion: version, startAt: null, localStartDate: null, localStartTime: null,
      startTimeZone: null, focus: '', intention: '', updatedAt: exportDate,
    });
    legacy.close();

    await db.open();

    expect(await db.preferences.get('preferences')).toMatchObject({
      schemaVersion: 5, meetingReminders: [], supportResources: [],
    });
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ schemaVersion: 5 });
    expect(await db.personalMilestones.count()).toBe(0);
    expect(await db.meetingReminders.count()).toBe(0);
    expect(await db.communityCredentials.count()).toBe(0);
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
