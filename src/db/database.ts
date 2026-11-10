import Dexie, { type Table, type Transaction } from 'dexie';
import type {
  ActiveMeditationSession,
  CommunityCommentCredential,
  DailyActivity,
  DailyReflection,
  EarnedCharm,
  FieldGuideNote,
  JournalDraft,
  JournalEntry,
  MeetingReminder,
  MeditationSession,
  PersonalGoal,
  PersonalMilestone,
  RecoveryDateHistory,
  ReaderProgress,
  RecoveryProfile,
  ResetRecord,
  ScriptureActivity,
  StepWorkAnswer,
  UserPreferences,
} from '../domain/types';
import { normalizeTraditionPreference } from '../domain/traditions';

export const CURRENT_SCHEMA_VERSION = 8;

export interface MilestoneRecord {
  id: string;
  milestoneId: string;
  label: string;
  startAt: string;
  reachedAt: string;
}

/**
 * A record that failed integrity checks and was moved aside, with the person's confirmation,
 * so it no longer breaks the screens that read its store. The original value is kept unchanged
 * so it can still be exported in a backup.
 */
export interface QuarantinedRecord {
  /** `${store}:${originalKey}` so quarantining the same record twice never duplicates it. */
  id: string;
  store: string;
  originalKey: string;
  record: unknown;
  reason: string;
  quarantinedAt: string;
}

const databaseSchema = {
  preferences: 'id',
  recoveryProfiles: 'id',
  recoveryDateHistory: 'id, recordedAt',
  dailyReflections: 'id, localDate, reflectionId, favoriteKey, [localDate+reflectionId]',
  scriptureActivity: 'id, scriptureId, favoriteKey',
  journalEntries: 'id, type, createdAt, updatedAt, *tags',
  journalDrafts: 'id, updatedAt',
  meditationSessions: 'id, exerciseId, status, completedAt',
  activeSessions: 'id, status',
  earnedCharms: 'id, charmId, earnedAt',
  dailyActivity: 'id, localDate',
  personalGoals: 'id, createdAt',
  personalMilestones: 'id, daysAfterStart, createdAt, achievedAt',
  milestoneRecords: 'id, milestoneId, startAt, reachedAt',
  fieldGuideNotes: 'id, kind, createdAt, updatedAt',
  resetRecords: 'id, feeling, practice, createdAt',
};
const reminderDatabaseSchema = { ...databaseSchema, meetingReminders: 'id, meetingId' };
const communityDatabaseSchema = { ...reminderDatabaseSchema, communityCredentials: 'id, readingKey, createdAt' };
// v7: private NA Step Working Guide answers and the reader's resume position (both local-only).
const stepWorkDatabaseSchema = { ...communityDatabaseSchema, stepWorkAnswers: 'id, stepNumber, updatedAt', readerProgress: 'id' };
// v8: a local quarantine for records the person chose to move aside after a data-health check.
const quarantineDatabaseSchema = { ...stepWorkDatabaseSchema, quarantine: 'id, store, quarantinedAt' };

async function stampSingletons(transaction: Transaction, version: number): Promise<void> {
  await Promise.all([
    transaction.table('preferences').toCollection().modify((preferences: UserPreferences) => {
      preferences.schemaVersion = version;
    }),
    transaction.table('recoveryProfiles').toCollection().modify((profile: RecoveryProfile) => {
      profile.schemaVersion = version;
    }),
  ]);
}

export class StillpointDatabase extends Dexie {
  preferences!: Table<UserPreferences, string>;
  recoveryProfiles!: Table<RecoveryProfile, string>;
  recoveryDateHistory!: Table<RecoveryDateHistory, string>;
  dailyReflections!: Table<DailyReflection, string>;
  scriptureActivity!: Table<ScriptureActivity, string>;
  journalEntries!: Table<JournalEntry, string>;
  journalDrafts!: Table<JournalDraft, string>;
  meditationSessions!: Table<MeditationSession, string>;
  activeSessions!: Table<ActiveMeditationSession, string>;
  earnedCharms!: Table<EarnedCharm, string>;
  dailyActivity!: Table<DailyActivity, string>;
  personalGoals!: Table<PersonalGoal, string>;
  personalMilestones!: Table<PersonalMilestone, string>;
  milestoneRecords!: Table<MilestoneRecord, string>;
  fieldGuideNotes!: Table<FieldGuideNote, string>;
  resetRecords!: Table<ResetRecord, string>;
  meetingReminders!: Table<MeetingReminder, string>;
  communityCredentials!: Table<CommunityCommentCredential, string>;
  stepWorkAnswers!: Table<StepWorkAnswer, string>;
  readerProgress!: Table<ReaderProgress, string>;
  quarantine!: Table<QuarantinedRecord, string>;

  constructor(name = 'StillpointRecovery') {
    super(name);
    this.version(1).stores(databaseSchema);
    this.version(2).stores(databaseSchema).upgrade(async (transaction) => {
      await transaction.table('preferences').toCollection().modify((preferences: UserPreferences) => {
        preferences.colorTheme ??= 'stillpoint';
        preferences.schemaVersion = 2;
      });
    });
    this.version(3).stores(databaseSchema).upgrade(async (transaction) => {
      await transaction.table('preferences').toCollection().modify((preferences: UserPreferences) => {
        preferences.supportResources ??= [];
        preferences.schemaVersion = 3;
      });
      await transaction.table('recoveryProfiles').toCollection().modify((profile: RecoveryProfile) => {
        profile.schemaVersion = 3;
      });
    });
    this.version(4).stores(databaseSchema).upgrade(async (transaction) => {
      await Promise.all([
        transaction.table('dailyReflections').toCollection().modify((entry: DailyReflection) => {
          entry.favoriteKey = entry.favorite ? 1 : 0;
        }),
        transaction.table('scriptureActivity').toCollection().modify((entry: ScriptureActivity) => {
          entry.favoriteKey = entry.favorite ? 1 : 0;
        }),
      ]);
    });
    this.version(5).stores(communityDatabaseSchema).upgrade(async (transaction) => {
      await Promise.all([
        transaction.table('preferences').toCollection().modify((preferences: UserPreferences) => {
          preferences.meetingReminders ??= [];
          preferences.schemaVersion = 5;
        }),
        transaction.table('recoveryProfiles').toCollection().modify((profile: RecoveryProfile) => {
          profile.schemaVersion = 5;
        }),
      ]);
    });
    // v6: daily readings can come from several traditions. Existing installs keep what they saw
    // before: faith-based → Christian readings, faith-neutral → the reflective (non-religious) set.
    this.version(6).stores(communityDatabaseSchema).upgrade(async (transaction) => {
      await Promise.all([
        transaction.table('preferences').toCollection().modify((preferences: UserPreferences) => {
          preferences.traditionPreference = normalizeTraditionPreference(preferences.traditionPreference, preferences.contentPreset);
          preferences.schemaVersion = 6;
        }),
        transaction.table('recoveryProfiles').toCollection().modify((profile: RecoveryProfile) => {
          profile.schemaVersion = 6;
        }),
      ]);
    });
    // v7: adds two empty local tables (step-work answers, reader position). Existing records are untouched
    // apart from the schema stamp on the two singleton records.
    this.version(7).stores(stepWorkDatabaseSchema).upgrade(async (transaction) => {
      await stampSingletons(transaction, 7);
    });
    // v8: adds an empty quarantine table. No existing record is moved, rewritten or removed by this migration.
    this.version(8).stores(quarantineDatabaseSchema).upgrade(async (transaction) => {
      await stampSingletons(transaction, CURRENT_SCHEMA_VERSION);
    });
  }
}

/** The application's IndexedDB database, shared by repositories and feature modules. */
export const db = new StillpointDatabase();

/** Open the local database and apply any required schema migrations. */
export async function initializeDatabase(): Promise<void> {
  await db.open();
}
