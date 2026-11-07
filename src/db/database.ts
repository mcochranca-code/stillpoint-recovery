import Dexie, { type Table } from 'dexie';
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
  RecoveryProfile,
  ResetRecord,
  ScriptureActivity,
  UserPreferences,
} from '../domain/types';

export const CURRENT_SCHEMA_VERSION = 5;

export interface MilestoneRecord {
  id: string;
  milestoneId: string;
  label: string;
  startAt: string;
  reachedAt: string;
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
  }
}

/** The application's IndexedDB database, shared by repositories and feature modules. */
export const db = new StillpointDatabase();

/** Open the local database and apply any required schema migrations. */
export async function initializeDatabase(): Promise<void> {
  await db.open();
}
