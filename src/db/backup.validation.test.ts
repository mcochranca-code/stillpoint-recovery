import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { importBackupText, inspectBackupText } from './backup';
import { defaultPreferences, defaultRecoveryProfile } from './repository';

const at = '2026-10-17T12:00:00.000Z';
const backup = (tables: Record<string, unknown[]>) => JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 7, exportedAt: at, tables });

const validRecords: Record<string, Record<string, unknown>> = {
  preferences: {
    ...defaultPreferences(),
    colorTheme: 'stillpoint',
    meetingReminders: [{ id: 'mr-1', meetingId: 'meeting-1', leadMinutes: 30, createdAt: at, lastNotifiedOccurrenceAt: at }],
    supportResources: ['Clinic'],
    contentPreset: 'faith-neutral',
    traditionPreference: { mode: 'one', traditions: ['reflective'] },
    traditionChoicePending: false,
    christianExtras: false,
    communityNotesEnabled: true,
  },
  recoveryProfiles: { ...defaultRecoveryProfile(), startAt: at, localStartDate: '2026-10-17', localStartTime: '05:00', startTimeZone: 'America/Los_Angeles', focus: 'Rest', intention: 'Stay present', updatedAt: at },
  recoveryDateHistory: { id: 'h-1', previousStartAt: null, nextStartAt: at, recordedAt: at, note: 'New start' },
  dailyReflections: { id: 'r-1', localDate: '2026-10-17', reflectionId: 'daily-01', favorite: true, reflectedAt: at, exploredAt: at },
  scriptureActivity: { id: 's-1', scriptureId: 'psalm-23', favorite: false, exploredAt: at },
  journalEntries: { id: 'j-1', type: 'gratitude', title: 'Thanks', body: 'Body', createdAt: at, updatedAt: at, tags: ['calm'], gratitude: ['sun'], mood: 'grateful', trigger: 'none', copingStrategy: 'walk' },
  journalDrafts: { id: 'active-journal-draft', type: 'trigger', title: 'Draft', body: 'Body', tags: [], gratitude: [], dateTimeLocal: '2026-10-17T05:00', mood: 'steady', trigger: 'noise', copingStrategy: 'breathe', updatedAt: at },
  meditationSessions: { id: 'm-1', exerciseId: 'box', exerciseName: 'Box breathing', plannedMinutes: 5, elapsedSeconds: 300, startedAt: at, completedAt: at, status: 'completed', reflection: 'Calmer' },
  activeSessions: { id: 'a-1', exerciseId: 'box', exerciseName: 'Box breathing', plannedMinutes: 10, elapsedMs: 1000, segmentStartedAt: 5, status: 'paused', createdAt: at },
  earnedCharms: { id: 'c-1', charmId: 'first-light', earnedAt: at, memory: 'Sunrise' },
  dailyActivity: { id: 'd-1', localDate: '2026-10-17', reflectionsCompleted: 1, scriptureExplored: 0, meditationMinutes: 5, journalEntries: 1, gratitudeEntries: 2 },
  personalGoals: { id: 'g-1', title: 'Walks', target: 10, current: 3, unit: 'walks', createdAt: at },
  personalMilestones: { id: 'pm-1', label: '100 days', daysAfterStart: 100, createdAt: at, achievedAt: at },
  milestoneRecords: { id: 'mrec-1', milestoneId: '7-days', label: '7 days', startAt: at, reachedAt: at },
  fieldGuideNotes: { id: 'f-1', kind: 'strategy', title: 'Call a friend', body: 'Text first', createdAt: at, updatedAt: at },
  resetRecords: { id: 'rr-1', feeling: 'tense', practice: 'grounding', nextStep: 'Drink water', createdAt: at, completed: true },
  meetingReminders: { id: 'mrm-1', meetingId: 'meeting-1', leadMinutes: 60, createdAt: at, lastNotifiedOccurrenceAt: at, lastAttemptedOccurrenceAt: at },
  stepWorkAnswers: { id: 's1-q001', questionId: 's1-q001', stepNumber: 1, text: 'My answer', createdAt: at, updatedAt: at },
  readerProgress: { id: 'na-step-guides', chapterId: 'step-3', sectionId: 'intro', textSize: 'large', updatedAt: at },
};

const invalidChanges: Record<string, Array<Record<string, unknown>>> = {
  preferences: [
    { id: 'other' }, { schemaVersion: 99 }, { onboardingComplete: 'yes' }, { theme: 'neon' }, { colorTheme: 'unknown-palette' },
    { highContrast: 1 }, { reducedMotion: null }, { hideMeditationVisual: 'no' }, { textScale: 5 }, { timeFormat: '36h' },
    { counterStyle: 'weeks' }, { liveCounter: 'yes' }, { reminderEnabled: 0 }, { reminderTime: '25:00' },
    { meetingReminders: [{ id: 'x', meetingId: 'y', leadMinutes: 45, createdAt: at }] }, { meetingReminders: [null] },
    { meetingReminders: [{ id: '', meetingId: 'y', leadMinutes: 15, createdAt: at }] },
    { meetingReminders: [{ id: 'x', meetingId: 'y', leadMinutes: 15, createdAt: at, lastNotifiedOccurrenceAt: 'later' }] },
    { trustedContacts: 'Sam' }, { supportResources: [7] }, { contentPreset: 'pagan' }, { traditionPreference: { mode: 'every' } },
    { traditionChoicePending: 'later' }, { christianExtras: 'on' }, { communityNotesEnabled: 'on' }, { discreetMode: 'on' },
    { gardenStyle: 'jungle' }, { allowBreathHolds: 'on' }, { createdAt: 'yesterday' }, { updatedAt: 42 },
  ],
  recoveryProfiles: [
    { id: 'profile' }, { schemaVersion: 0 }, { startAt: 'soon' }, { localStartDate: '17/10/2026' }, { localStartTime: '5pm' },
    { startTimeZone: 5 }, { focus: 7 }, { intention: null }, { updatedAt: 'never' },
  ],
  recoveryDateHistory: [{ previousStartAt: 'then' }, { nextStartAt: 'now' }, { recordedAt: null }, { note: 9 }],
  dailyReflections: [{ localDate: 'today' }, { reflectionId: ' ' }, { favorite: 'yes' }, { reflectedAt: 'soon' }, { exploredAt: null }],
  scriptureActivity: [{ scriptureId: '' }, { favorite: 1 }, { exploredAt: 'x' }],
  journalEntries: [
    { type: 'poem' }, { title: 'x'.repeat(121) }, { body: 5 }, { createdAt: 'x' }, { updatedAt: 'x' }, { tags: 'calm' },
    { gratitude: [1] }, { mood: 'ecstatic' }, { trigger: 5 }, { copingStrategy: 5 },
  ],
  journalDrafts: [
    { id: 'draft-2' }, { type: 'poem' }, { title: 5 }, { body: null }, { tags: null }, { gratitude: null },
    { dateTimeLocal: 'whenever' }, { mood: 'ecstatic' }, { trigger: 1 }, { copingStrategy: 1 }, { updatedAt: 'x' },
  ],
  meditationSessions: [
    { exerciseId: '' }, { exerciseName: '' }, { plannedMinutes: 7 }, { elapsedSeconds: -1 }, { startedAt: 'x' },
    { completedAt: 'x' }, { status: 'running' }, { reflection: 5 },
  ],
  activeSessions: [
    { exerciseId: '' }, { exerciseName: '' }, { plannedMinutes: 3 }, { elapsedMs: 2_000_000 }, { segmentStartedAt: -1 },
    { status: 'completed' }, { createdAt: 'x' },
  ],
  earnedCharms: [{ charmId: '' }, { earnedAt: 'x' }, { memory: 5 }],
  dailyActivity: [{ localDate: 'x' }, { meditationMinutes: -5 }],
  personalGoals: [{ title: '' }, { target: 0 }, { current: 11 }, { unit: '' }, { createdAt: 'x' }],
  personalMilestones: [{ label: '' }, { daysAfterStart: 1.5 }, { daysAfterStart: 0 }, { createdAt: 'x' }, { achievedAt: 'x' }],
  milestoneRecords: [{ milestoneId: '' }, { label: '' }, { startAt: 'x' }, { reachedAt: 'x' }],
  fieldGuideNotes: [{ kind: 'secret' }, { title: '' }, { body: 5 }, { createdAt: 'x' }, { updatedAt: 'x' }],
  resetRecords: [{ feeling: 5 }, { practice: '' }, { nextStep: 5 }, { createdAt: 'x' }, { completed: 'yes' }],
  meetingReminders: [{ meetingId: '' }, { leadMinutes: 5 }, { createdAt: 'x' }, { lastNotifiedOccurrenceAt: 'x' }, { lastAttemptedOccurrenceAt: 'x' }],
  stepWorkAnswers: [
    { questionId: 's13-q001', id: 's13-q001' }, { questionId: 5 }, { id: 's1-q002' }, { stepNumber: 2 }, { text: 5 },
    { createdAt: 'x' }, { updatedAt: 'x' },
  ],
  readerProgress: [{ id: 'other-book' }, { chapterId: 'step-13' }, { chapterId: 4 }, { sectionId: '' }, { textSize: 'huge' }, { textSize: 3 }, { updatedAt: 'x' }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('backup record validation', () => {
  it('accepts a complete, valid record for every supported table', async () => {
    const tables = Object.fromEntries(Object.entries(validRecords).map(([name, record]) => [name, [record]]));
    const preview = await inspectBackupText(backup(tables));
    expect(preview.skippedInvalid).toBe(0);
    expect(preview.readyToImport).toBe(Object.keys(validRecords).length);
  });

  for (const [name, changes] of Object.entries(invalidChanges)) {
    it(`rejects each malformed field in ${name} records`, async () => {
      const records = changes.map((change) => ({ ...validRecords[name], ...change }));
      const preview = await inspectBackupText(backup({ [name]: [...records, [], null, { id: '' }] }));
      const store = preview.stores.find((item) => item.store === name);
      expect(store).toMatchObject({ recordsInFile: records.length + 3, readyToImport: 0, skippedInvalid: records.length + 3 });
    });
  }

  it('restores favorites with their index key and repairs unsupported optional preference values', async () => {
    const preferences = { ...validRecords.preferences, colorTheme: undefined, supportResources: undefined, meetingReminders: undefined, contentPreset: undefined };
    const result = await importBackupText(backup({
      preferences: [preferences],
      dailyReflections: [validRecords.dailyReflections, { ...validRecords.dailyReflections, id: 'r-2', favorite: false }],
    }));
    expect(result).toEqual({ imported: 3, skippedDuplicates: 0, skippedInvalid: 0 });
    expect(await db.dailyReflections.where('favoriteKey').equals(0).primaryKeys()).toEqual(['r-2']);
    expect(await db.preferences.get('preferences')).toMatchObject({ colorTheme: 'stillpoint', supportResources: [], meetingReminders: [], contentPreset: 'faith-based' });
  });

  it('rejects backup containers that are not Stillpoint backups', async () => {
    await expect(inspectBackupText('null')).rejects.toThrow('This file is not a Stillpoint backup.');
    await expect(inspectBackupText(JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 1.5, exportedAt: at, tables: {} })))
      .rejects.toThrow('The backup format is not supported by this version of Stillpoint.');
    await expect(inspectBackupText(JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 7, exportedAt: at, tables: [] })))
      .rejects.toThrow('The backup format is not supported by this version of Stillpoint.');
    await expect(inspectBackupText(JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 7, exportedAt: at, tables: {}, checksum: 'abc' })))
      .rejects.toThrow('The backup checksum is invalid. Select an unmodified Stillpoint backup.');
    await expect(inspectBackupText(JSON.stringify({ application: 'stillpoint-recovery', schemaVersion: 7, exportedAt: at, tables: { journalEntries: {} } })))
      .rejects.toThrow('The journalEntries section must be a list.');
    await expect(inspectBackupText('x'.repeat(15_000_001))).rejects.toThrow('This backup is larger than the supported 15 MB limit.');
  });
});
