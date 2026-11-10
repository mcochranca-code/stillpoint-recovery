import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { MAX_BACKUP_FILE_BYTES, createBackup, downloadJsonBackup, importBackupText, inspectBackupText } from './backup';
import { defaultPreferences } from './repository';

const at = '2026-10-17T12:00:00.000Z';
const later = '2026-10-18T12:00:00.000Z';
const backup = (tables: Record<string, unknown>, extra: Record<string, unknown> = {}) => JSON.stringify({
  application: 'stillpoint-recovery', schemaVersion: 3, exportedAt: at, tables, ...extra,
});

/** Return one record per override: each copy breaks exactly one field of an otherwise valid record. */
const variants = (valid: Record<string, unknown>, overrides: Record<string, unknown>[]) =>
  overrides.map((override, index) => ({ ...valid, id: `${String(valid.id)}-bad-${index}`, ...override }));

const readBlob = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('backup download', () => {
  it('downloads a dated JSON file and releases the object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:stillpoint-backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    const payload = await createBackup();
    downloadJsonBackup(payload);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await readBlob(blob))).toMatchObject({ application: 'stillpoint-recovery', checksum: payload.checksum });
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toMatch(/^stillpoint-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(clicked[0]?.href).toBe('blob:stillpoint-backup');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stillpoint-backup');
  });
});

describe('backup container validation', () => {
  it('rejects oversized files before parsing them', async () => {
    const huge = ' '.repeat(MAX_BACKUP_FILE_BYTES + 1);
    await expect(inspectBackupText(huge)).rejects.toThrow('15 MB limit');
  });

  it('rejects JSON that is not an object', async () => {
    await expect(importBackupText('null')).rejects.toThrow('not a Stillpoint backup');
    await expect(importBackupText('42')).rejects.toThrow('not a Stillpoint backup');
  });

  it('rejects malformed checksums and non-list sections', async () => {
    await expect(importBackupText(backup({}, { checksum: 'abc' }))).rejects.toThrow('checksum is invalid');
    await expect(importBackupText(backup({}, { checksum: 12 }))).rejects.toThrow('checksum is invalid');
    await expect(importBackupText(backup({ journalEntries: { id: 'x' } }))).rejects.toThrow('journalEntries section must be a list');
  });
});

describe('backup record validation across stores', () => {
  it('accepts fully populated records and skips each malformed variant', async () => {
    const reminder = { id: 'rem-1', meetingId: 'meeting-1', leadMinutes: 30, createdAt: at, lastNotifiedOccurrenceAt: later };
    const preferences = {
      ...defaultPreferences(), schemaVersion: 3, timeFormat: '24h', counterStyle: 'days',
      meetingReminders: [reminder, { ...reminder, id: 'rem-2', lastNotifiedOccurrenceAt: undefined }],
      supportResources: ['Sponsor line'],
    };
    const profile = {
      id: 'recovery-profile', schemaVersion: 3, startAt: at, localStartDate: '2026-10-17', localStartTime: '05:00',
      startTimeZone: 'America/Los_Angeles', focus: 'One day at a time', intention: 'Stay present', updatedAt: at,
    };
    const history = { id: 'hist-1', previousStartAt: at, nextStartAt: later, recordedAt: later, note: 'Fresh start' };
    const journal = {
      id: 'journal-1', type: 'trigger', title: 'Hard evening', body: 'Wrote it out.', createdAt: at, updatedAt: at,
      tags: ['evening'], gratitude: ['a call'], mood: 'anxious', trigger: 'Payday', copingStrategy: 'Called my sponsor',
    };
    const draft = {
      id: 'active-journal-draft', type: 'gratitude', title: 'Draft', body: 'In progress', tags: [], gratitude: ['sunrise'],
      dateTimeLocal: '2026-10-17T08:00', mood: 'hopeful', trigger: 'none', copingStrategy: 'walk', updatedAt: at,
    };
    const session = {
      id: 'session-1', exerciseId: 'box', exerciseName: 'Box breathing', plannedMinutes: 5, elapsedSeconds: 300,
      startedAt: at, completedAt: later, status: 'ended', reflection: 'Calmer',
    };
    const active = {
      id: 'active-1', exerciseId: 'box', exerciseName: 'Box breathing', plannedMinutes: 10, elapsedMs: 1000,
      segmentStartedAt: 1_700_000_000_000, status: 'paused', createdAt: at,
    };
    const charm = { id: 'charm-1', charmId: 'first-week', earnedAt: at, memory: 'Made it' };
    const goal = { id: 'goal-1', title: 'Meetings', target: 30, current: 4, unit: 'meetings', createdAt: at };
    const record = { id: 'record-1', milestoneId: '24-hours', label: '24 hours', startAt: at, reachedAt: later };
    const note = { id: 'note-1', kind: 'strategy', title: 'HALT', body: 'Hungry, angry, lonely, tired', createdAt: at, updatedAt: at };
    const reset = { id: 'reset-1', feeling: 'restless', practice: 'Walk', nextStep: 'Text a friend', createdAt: at, completed: true };
    const stepAnswer = { id: 's4-q012', questionId: 's4-q012', stepNumber: 4, text: 'Honest answer', createdAt: at, updatedAt: at };
    const reader = { id: 'na-step-guides', chapterId: 'step-4', sectionId: 'intro', textSize: 'large', updatedAt: at };

    const text = backup({
      preferences: [
        preferences,
        { ...preferences, meetingReminders: [null] },
        { ...preferences, meetingReminders: ['reminder'] },
        { ...preferences, meetingReminders: [[]] },
        { ...preferences, meetingReminders: [{ ...reminder, id: '' }] },
        { ...preferences, meetingReminders: [{ ...reminder, meetingId: '' }] },
        { ...preferences, meetingReminders: [{ ...reminder, leadMinutes: 45 }] },
        { ...preferences, meetingReminders: [{ ...reminder, createdAt: 'nope' }] },
        { ...preferences, meetingReminders: [{ ...reminder, lastNotifiedOccurrenceAt: 'nope' }] },
        { ...preferences, timeFormat: 'military' },
      ],
      recoveryProfiles: [
        profile,
        { ...profile, startAt: 'nope' },
        { ...profile, localStartDate: '17/10/2026' },
        { ...profile, localStartTime: '25:00' },
        { ...profile, startTimeZone: 7 },
      ],
      recoveryDateHistory: [
        history,
        { ...history, id: 'hist-2', previousStartAt: null, nextStartAt: null, note: undefined },
        ...variants(history, [
          { previousStartAt: 'nope' }, { nextStartAt: 'nope' }, { recordedAt: 'nope' }, { note: 5 },
        ]),
      ],
      journalEntries: [
        journal,
        ...variants(journal, [{ mood: 'elated' }, { mood: 3 }, { trigger: 9 }, { copingStrategy: 9 }]),
      ],
      journalDrafts: [
        draft,
        ...variants(draft, [
          { type: 'unknown' }, { type: 4 }, { title: 'x'.repeat(121) }, { body: 1 }, { tags: 'a' }, { gratitude: [3] },
          { dateTimeLocal: 'not a date' }, { dateTimeLocal: 12 }, { mood: 'elated' }, { mood: 1 },
          { trigger: 1 }, { copingStrategy: 1 }, { updatedAt: 'nope' },
        ]).map((row) => ({ ...row, id: 'active-journal-draft' })),
        { ...draft, id: 'another-draft' },
      ],
      meditationSessions: [
        session,
        { ...session, id: 'session-2', status: 'completed', completedAt: undefined, reflection: undefined },
        ...variants(session, [
          { exerciseId: '' }, { exerciseName: ' ' }, { plannedMinutes: 3 }, { elapsedSeconds: -5 }, { startedAt: 'x' },
          { completedAt: 'x' }, { status: 'paused' }, { reflection: 4 },
        ]),
      ],
      activeSessions: [
        active,
        { ...active, id: 'active-2', status: 'running', segmentStartedAt: undefined },
        ...variants(active, [{ segmentStartedAt: -1 }, { status: 'done' }, { createdAt: 'nope' }]),
      ],
      earnedCharms: [
        charm,
        { ...charm, id: 'charm-2', memory: undefined },
        ...variants(charm, [{ charmId: '' }, { earnedAt: 'x' }, { memory: 5 }]),
      ],
      personalGoals: [
        goal,
        ...variants(goal, [{ title: '' }, { target: 0 }, { current: 31 }, { unit: '' }, { createdAt: 'x' }]),
      ],
      milestoneRecords: [
        record,
        ...variants(record, [{ milestoneId: '' }, { label: '' }, { startAt: 'x' }, { reachedAt: 'x' }]),
      ],
      fieldGuideNotes: [
        note,
        ...variants(note, [{ kind: 'poem' }, { kind: 1 }, { title: '' }, { body: 3 }, { createdAt: 'x' }, { updatedAt: 'x' }]),
      ],
      resetRecords: [
        reset,
        ...variants(reset, [{ feeling: 3 }, { practice: '' }, { nextStep: 4 }, { createdAt: 'x' }, { completed: 'yes' }]),
      ],
      stepWorkAnswers: [
        stepAnswer,
        { ...stepAnswer, id: 's13-q001', questionId: 's13-q001', stepNumber: 13 },
        { ...stepAnswer, id: 'missing-question', questionId: 7 },
      ],
      readerProgress: [reader],
      dailyReflections: [
        { id: 'reflection-plain', localDate: '2026-10-17', reflectionId: 'r-1', favorite: false, exploredAt: at },
        null,
        ['not', 'a', 'record'],
        { id: '   ', localDate: '2026-10-17', reflectionId: 'r-2', favorite: false, exploredAt: at },
      ],
    });

    const preview = await inspectBackupText(text);
    const byStore = Object.fromEntries(preview.stores.map((store) => [store.store, store]));
    expect(byStore.preferences).toMatchObject({ recordsInFile: 10, readyToImport: 1, skippedInvalid: 9, behavior: 'replace singleton' });
    expect(byStore.recoveryProfiles).toMatchObject({ readyToImport: 1, skippedInvalid: 4 });
    expect(byStore.recoveryDateHistory).toMatchObject({ readyToImport: 2, skippedInvalid: 4, behavior: 'merge records' });
    expect(byStore.journalEntries).toMatchObject({ readyToImport: 1, skippedInvalid: 4 });
    expect(byStore.journalDrafts).toMatchObject({ readyToImport: 1, skippedInvalid: 14 });
    expect(byStore.meditationSessions).toMatchObject({ readyToImport: 2, skippedInvalid: 8 });
    expect(byStore.activeSessions).toMatchObject({ readyToImport: 2, skippedInvalid: 3 });
    expect(byStore.earnedCharms).toMatchObject({ readyToImport: 2, skippedInvalid: 3 });
    expect(byStore.personalGoals).toMatchObject({ readyToImport: 1, skippedInvalid: 5 });
    expect(byStore.milestoneRecords).toMatchObject({ readyToImport: 1, skippedInvalid: 4 });
    expect(byStore.fieldGuideNotes).toMatchObject({ readyToImport: 1, skippedInvalid: 6 });
    expect(byStore.resetRecords).toMatchObject({ readyToImport: 1, skippedInvalid: 5 });
    expect(byStore.stepWorkAnswers).toMatchObject({ readyToImport: 1, skippedInvalid: 2 });
    expect(byStore.readerProgress).toMatchObject({ readyToImport: 1, skippedInvalid: 0 });
    expect(byStore.dailyReflections).toMatchObject({ readyToImport: 1, skippedInvalid: 3 });
    expect(await db.journalEntries.count()).toBe(0);

    const result = await importBackupText(text);
    expect(result.imported).toBe(preview.readyToImport);
    expect(result.skippedInvalid).toBe(preview.skippedInvalid);

    const savedPreferences = await db.preferences.get('preferences');
    expect(savedPreferences?.timeFormat).toBe('24h');
    expect(savedPreferences?.supportResources).toEqual(['Sponsor line']);
    expect(savedPreferences?.meetingReminders).toHaveLength(2);
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ startTimeZone: 'America/Los_Angeles', localStartTime: '05:00' });
    expect((await db.dailyReflections.get('reflection-plain'))?.favoriteKey).toBe(0);
    expect(await db.stepWorkAnswers.get('s4-q012')).toMatchObject({ stepNumber: 4, text: 'Honest answer' });
    expect(await db.readerProgress.get('na-step-guides')).toMatchObject({ chapterId: 'step-4', textSize: 'large' });
    expect(await db.activeSessions.count()).toBe(2);
    expect(await db.recoveryDateHistory.count()).toBe(2);
  });

  it('normalizes invalid optional preference values when restoring', async () => {
    const preferences = { ...defaultPreferences(), schemaVersion: 3 } as Record<string, unknown>;
    delete preferences.colorTheme;
    delete preferences.supportResources;
    delete preferences.meetingReminders;
    delete preferences.contentPreset;
    const result = await importBackupText(backup({ preferences: [preferences] }));
    expect(result.imported).toBe(1);
    expect(await db.preferences.get('preferences')).toMatchObject({ colorTheme: 'stillpoint', supportResources: [], meetingReminders: [] });
  });
});
