import Dexie, { type Table } from 'dexie';
import type {
  ActiveMeditationSession,
  DailyActivity,
  DailyReflection,
  EarnedCharm,
  FieldGuideNote,
  JournalDraft,
  JournalEntry,
  MeditationSession,
  PersonalGoal,
  PersonalMilestone,
  RecoveryDateHistory,
  RecoveryProfile,
  ResetRecord,
  ScriptureActivity,
  UserPreferences,
} from '../domain/types';

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
  dailyReflections: 'id, localDate, reflectionId, [localDate+reflectionId]',
  scriptureActivity: 'id, scriptureId, favorite, [scriptureId+favorite]',
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

  constructor() {
    super('StillpointRecovery');
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
    });
  }
}

export const db = new StillpointDatabase();

export async function initializeDatabase(): Promise<void> {
  await db.open();
}
