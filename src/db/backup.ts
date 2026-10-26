import { CURRENT_SCHEMA_VERSION, db } from './database';
import type { BackupPayload, JournalType } from '../domain/types';

const STORE_NAMES = [
  'preferences', 'recoveryProfiles', 'recoveryDateHistory', 'dailyReflections', 'scriptureActivity',
  'journalEntries', 'journalDrafts', 'meditationSessions', 'activeSessions', 'earnedCharms',
  'dailyActivity', 'personalGoals', 'personalMilestones', 'milestoneRecords', 'fieldGuideNotes', 'resetRecords',
] as const;
const SINGLETON_STORES = new Set<string>(['preferences', 'recoveryProfiles']);
export const MAX_BACKUP_FILE_BYTES = 15_000_000;
const COLOR_THEMES = new Set(['stillpoint', 'catppuccin', 'monokai', 'obsidian', 'lucide']);
const THEME_MODES = new Set(['light', 'dark', 'system']);
const GARDEN_STYLES = new Set(['woodland', 'desert-bloom']);
const JOURNAL_TYPES = new Set<JournalType>([
  'daily-reflection', 'gratitude', 'emotional-check-in', 'milestone', 'trigger',
  'prayer', 'free-writing', 'meditation', 'victory',
]);
const MOODS = new Set(['peaceful', 'hopeful', 'steady', 'anxious', 'sad', 'angry', 'tired', 'grateful']);
const GUIDE_KINDS = new Set(['strategy', 'trigger', 'reflection', 'prayer', 'note']);

/** Export every supported local table as a versioned JSON-ready payload. */
export async function createBackup(): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {};
  for (const name of STORE_NAMES) tables[name] = await db.table(name).toArray();
  return { application: 'stillpoint-recovery', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables };
}

/** Trigger a browser download for a previously created local-data backup. */
export function downloadJsonBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `stillpoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}

export interface BackupStorePreview {
  store: typeof STORE_NAMES[number];
  recordsInFile: number;
  readyToImport: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  behavior: 'replace singleton' | 'merge records';
}

export interface BackupPreview {
  schemaVersion: number;
  recordsInFile: number;
  readyToImport: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  stores: BackupStorePreview[];
}

function isString(value: unknown, max = 50000): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isNonEmptyString(value: unknown, max = 500): value is string {
  return isString(value, max) && value.trim().length > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && !Number.isNaN(Date.parse(value));
}

function isOptionalDate(value: unknown): boolean {
  return value === undefined || isDate(value);
}

function isLocalDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`));
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 500 && value.every((item) => isString(item, 4000));
}

function isMeetingReminderArray(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 500 && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const reminder = item as Record<string, unknown>;
    return isNonEmptyString(reminder.id, 240) && isNonEmptyString(reminder.meetingId, 240)
      && [15, 30, 60].includes(Number(reminder.leadMinutes)) && isDate(reminder.createdAt)
      && isOptionalDate(reminder.lastNotifiedOccurrenceAt);
  });
}

function isCount(value: unknown, min = 0, max = 1_000_000): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function validRecord(name: string, value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.id, 240)) return false;

  switch (name) {
    case 'preferences':
      return row.id === 'preferences' && isCount(row.schemaVersion, 1, 5) && typeof row.onboardingComplete === 'boolean'
        && typeof row.theme === 'string' && THEME_MODES.has(row.theme)
        && (row.colorTheme === undefined || (typeof row.colorTheme === 'string' && COLOR_THEMES.has(row.colorTheme)))
        && typeof row.highContrast === 'boolean' && typeof row.reducedMotion === 'boolean'
        && typeof row.hideMeditationVisual === 'boolean' && isCount(row.textScale, 0.5, 2)
        && (row.timeFormat === '12h' || row.timeFormat === '24h') && (row.counterStyle === 'days' || row.counterStyle === 'full')
        && typeof row.liveCounter === 'boolean' && typeof row.reminderEnabled === 'boolean' && isTime(row.reminderTime)
        && (row.meetingReminders === undefined || isMeetingReminderArray(row.meetingReminders))
        && isStringArray(row.trustedContacts) && (row.supportResources === undefined || isStringArray(row.supportResources))
        && typeof row.discreetMode === 'boolean' && typeof row.gardenStyle === 'string' && GARDEN_STYLES.has(row.gardenStyle)
        && typeof row.allowBreathHolds === 'boolean' && isDate(row.createdAt) && isDate(row.updatedAt);
    case 'recoveryProfiles':
      return row.id === 'recovery-profile' && isCount(row.schemaVersion, 1, 5)
        && (row.startAt === null || isDate(row.startAt))
        && (row.localStartDate === null || isLocalDate(row.localStartDate))
        && (row.localStartTime === null || isTime(row.localStartTime))
        && (row.startTimeZone === null || isString(row.startTimeZone, 120))
        && isString(row.focus, 240) && isString(row.intention, 1000) && isDate(row.updatedAt);
    case 'recoveryDateHistory':
      return (row.previousStartAt === null || isDate(row.previousStartAt))
        && (row.nextStartAt === null || isDate(row.nextStartAt)) && isDate(row.recordedAt)
        && (row.note === undefined || isString(row.note, 1000));
    case 'dailyReflections':
      return isLocalDate(row.localDate) && isNonEmptyString(row.reflectionId, 200)
        && typeof row.favorite === 'boolean' && isOptionalDate(row.reflectedAt) && isDate(row.exploredAt);
    case 'scriptureActivity':
      return isNonEmptyString(row.scriptureId, 200) && typeof row.favorite === 'boolean' && isDate(row.exploredAt);
    case 'journalEntries':
      return typeof row.type === 'string' && JOURNAL_TYPES.has(row.type as JournalType)
        && isString(row.title, 120) && isString(row.body) && isDate(row.createdAt) && isDate(row.updatedAt)
        && isStringArray(row.tags) && isStringArray(row.gratitude)
        && (row.mood === undefined || (typeof row.mood === 'string' && MOODS.has(row.mood)))
        && (row.trigger === undefined || isString(row.trigger, 12000))
        && (row.copingStrategy === undefined || isString(row.copingStrategy, 12000));
    case 'journalDrafts':
      return row.id === 'active-journal-draft' && typeof row.type === 'string' && JOURNAL_TYPES.has(row.type as JournalType)
        && isString(row.title, 120) && isString(row.body) && isStringArray(row.tags) && isStringArray(row.gratitude)
        && (row.dateTimeLocal === undefined || (typeof row.dateTimeLocal === 'string' && !Number.isNaN(Date.parse(row.dateTimeLocal))))
        && (row.mood === undefined || (typeof row.mood === 'string' && MOODS.has(row.mood)))
        && (row.trigger === undefined || isString(row.trigger, 12000))
        && (row.copingStrategy === undefined || isString(row.copingStrategy, 12000)) && isDate(row.updatedAt);
    case 'meditationSessions':
      return isNonEmptyString(row.exerciseId, 200) && isNonEmptyString(row.exerciseName, 200)
        && [2, 5, 10, 20].includes(Number(row.plannedMinutes)) && isCount(row.elapsedSeconds)
        && isDate(row.startedAt) && isOptionalDate(row.completedAt)
        && (row.status === 'completed' || row.status === 'ended')
        && (row.reflection === undefined || isString(row.reflection, 12000));
    case 'activeSessions':
      return isNonEmptyString(row.exerciseId, 200) && isNonEmptyString(row.exerciseName, 200)
        && [2, 5, 10, 20].includes(Number(row.plannedMinutes)) && isCount(row.elapsedMs, 0, 1_200_000)
        && (row.segmentStartedAt === undefined || isCount(row.segmentStartedAt, 0, Number.MAX_SAFE_INTEGER))
        && (row.status === 'running' || row.status === 'paused') && isDate(row.createdAt);
    case 'earnedCharms':
      return isNonEmptyString(row.charmId, 200) && isDate(row.earnedAt)
        && (row.memory === undefined || isString(row.memory, 1000));
    case 'dailyActivity':
      return isLocalDate(row.localDate) && ['reflectionsCompleted', 'scriptureExplored', 'meditationMinutes', 'journalEntries', 'gratitudeEntries'].every((key) => isCount(row[key]));
    case 'personalGoals':
      return isNonEmptyString(row.title, 120) && isCount(row.target, 1, 1000) && isCount(row.current, 0, Number(row.target))
        && isNonEmptyString(row.unit, 80) && isDate(row.createdAt);
    case 'personalMilestones':
      return isNonEmptyString(row.label, 120) && Number.isInteger(row.daysAfterStart) && isCount(row.daysAfterStart, 1, 100000)
        && isDate(row.createdAt) && isOptionalDate(row.achievedAt);
    case 'milestoneRecords':
      return isNonEmptyString(row.milestoneId, 200) && isNonEmptyString(row.label, 160)
        && isDate(row.startAt) && isDate(row.reachedAt);
    case 'fieldGuideNotes':
      return typeof row.kind === 'string' && GUIDE_KINDS.has(row.kind) && isNonEmptyString(row.title, 120)
        && isString(row.body, 12000) && isDate(row.createdAt) && isDate(row.updatedAt);
    case 'resetRecords':
      return isString(row.feeling, 120) && isNonEmptyString(row.practice, 200)
        && isString(row.nextStep, 1000) && isDate(row.createdAt) && typeof row.completed === 'boolean';
    default:
      return false;
  }
}

interface ParsedBackup {
  schemaVersion: number;
  tables: Record<string, unknown[]>;
}

function parseBackupText(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_FILE_BYTES) throw new Error('This backup is larger than the supported 15 MB limit.');
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!payload || typeof payload !== 'object') throw new Error('This file is not a Stillpoint backup.');
  const candidate = payload as Partial<BackupPayload>;
  if (candidate.application !== 'stillpoint-recovery' || typeof candidate.schemaVersion !== 'number'
    || !Number.isInteger(candidate.schemaVersion) || candidate.schemaVersion < 1
    || candidate.schemaVersion > CURRENT_SCHEMA_VERSION || !candidate.tables
    || typeof candidate.tables !== 'object' || Array.isArray(candidate.tables)) {
    throw new Error('The backup format is not supported by this version of Stillpoint.');
  }
  const tables = candidate.tables as Record<string, unknown[]>;
  for (const name of STORE_NAMES) {
    if (tables[name] !== undefined && !Array.isArray(tables[name])) {
      throw new Error(`The ${name} section must be a list.`);
    }
  }
  return { schemaVersion: candidate.schemaVersion, tables };
}

/** Validate a selected backup and count what would be restored without changing local data. */
export async function inspectBackupText(text: string): Promise<BackupPreview> {
  const candidate = parseBackupText(text);
  const stores: BackupStorePreview[] = [];

  for (const name of STORE_NAMES) {
    const values = candidate.tables[name];
    if (values === undefined) continue;
    const singleton = SINGLETON_STORES.has(name);
    const existingIds = singleton
      ? new Set<string>()
      : new Set((await db.table(name).toCollection().primaryKeys()).map(String));
    const seen = new Set<string>();
    let readyToImport = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;

    for (const raw of values) {
      if (!validRecord(name, raw)) { skippedInvalid += 1; continue; }
      const recordId = raw.id as string;
      if (seen.has(recordId)) { skippedDuplicates += 1; continue; }
      seen.add(recordId);
      if (!singleton && existingIds.has(recordId)) skippedDuplicates += 1;
      else readyToImport += 1;
    }

    stores.push({
      store: name,
      recordsInFile: values.length,
      readyToImport,
      skippedDuplicates,
      skippedInvalid,
      behavior: singleton ? 'replace singleton' : 'merge records',
    });
  }

  return {
    schemaVersion: candidate.schemaVersion,
    recordsInFile: stores.reduce((sum, store) => sum + store.recordsInFile, 0),
    readyToImport: stores.reduce((sum, store) => sum + store.readyToImport, 0),
    skippedDuplicates: stores.reduce((sum, store) => sum + store.skippedDuplicates, 0),
    skippedInvalid: stores.reduce((sum, store) => sum + store.skippedInvalid, 0),
    stores,
  };
}

/**
 * Validate and merge a versioned backup in one IndexedDB transaction.
 * Preferences and the recovery profile are restored as singleton records; other records are added only when their IDs are new.
 */
export async function importBackupText(text: string): Promise<ImportResult> {
  const candidate = parseBackupText(text);
  const result: ImportResult = { imported: 0, skippedDuplicates: 0, skippedInvalid: 0 };
  await db.transaction('rw', STORE_NAMES.map((name) => db.table(name)), async () => {
    for (const name of STORE_NAMES) {
      const values = candidate.tables[name];
      if (values === undefined) continue;
      const seen = new Set<string>();
      const table = db.table(name);
      for (const raw of values) {
        if (!validRecord(name, raw)) { result.skippedInvalid += 1; continue; }
        const recordId = raw.id as string;
        if (seen.has(recordId)) { result.skippedDuplicates += 1; continue; }
        seen.add(recordId);
        if (name === 'preferences') {
          // These singleton records represent current settings, while history and activity tables remain additive.
          await table.put({
            ...raw,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            colorTheme: typeof raw.colorTheme === 'string' && COLOR_THEMES.has(raw.colorTheme) ? raw.colorTheme : 'stillpoint',
            supportResources: isStringArray(raw.supportResources) ? raw.supportResources : [],
            meetingReminders: isMeetingReminderArray(raw.meetingReminders) ? raw.meetingReminders : [],
          });
          result.imported += 1;
          continue;
        }
        if (name === 'recoveryProfiles') {
          await table.put({ ...raw, schemaVersion: CURRENT_SCHEMA_VERSION });
          result.imported += 1;
          continue;
        }
        if (await table.get(recordId)) { result.skippedDuplicates += 1; continue; }
        await table.add(
          name === 'dailyReflections' || name === 'scriptureActivity'
            ? { ...raw, favoriteKey: raw.favorite ? 1 : 0 }
            : raw,
        );
        result.imported += 1;
      }
    }
  });
  return result;
}

/** Permanently remove every Stillpoint table from the current browser profile. */
export async function clearAllLocalData(): Promise<void> {
  await db.transaction('rw', STORE_NAMES.map((name) => db.table(name)), async () => {
    for (const name of STORE_NAMES) await db.table(name).clear();
  });
}
