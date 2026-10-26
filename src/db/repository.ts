import { CURRENT_SCHEMA_VERSION, db } from './database';
import type { DailyActivity, RecoveryProfile, UserPreferences } from '../domain/types';
import { localDateKey } from '../domain/time';

/** Create the initial preferences record with privacy-conscious and accessible defaults. */
export const defaultPreferences = (): UserPreferences => {
  const now = new Date().toISOString();
  return {
    id: 'preferences', schemaVersion: CURRENT_SCHEMA_VERSION, onboardingComplete: false, theme: 'system', colorTheme: 'stillpoint',
    highContrast: false, reducedMotion: false, hideMeditationVisual: false, textScale: 1,
    timeFormat: '12h', counterStyle: 'full', liveCounter: true, reminderEnabled: false,
    reminderTime: '19:00', meetingReminders: [], trustedContacts: [], supportResources: [], discreetMode: false, gardenStyle: 'woodland',
    allowBreathHolds: false, createdAt: now, updatedAt: now,
  };
};

/** Create an empty recovery profile without requiring a recovery date. */
export const defaultRecoveryProfile = (): RecoveryProfile => ({
  id: 'recovery-profile', schemaVersion: CURRENT_SCHEMA_VERSION, startAt: null, localStartDate: null,
  localStartTime: null, startTimeZone: null, focus: '', intention: '', updatedAt: new Date().toISOString(),
});

/** Normalize older singleton records to the current schema after startup and before app use. */
export async function ensureDefaults(): Promise<void> {
  await db.transaction('rw', db.preferences, db.recoveryProfiles, async () => {
    const preferences = await db.preferences.get('preferences');
    if (!preferences) {
      await db.preferences.add(defaultPreferences());
    } else if (preferences.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      await db.preferences.put({
        ...preferences,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        supportResources: Array.isArray(preferences.supportResources) ? preferences.supportResources : [],
        meetingReminders: Array.isArray(preferences.meetingReminders) ? preferences.meetingReminders : [],
        colorTheme: preferences.colorTheme ?? 'stillpoint',
        updatedAt: new Date().toISOString(),
      });
    }

    const profile = await db.recoveryProfiles.get('recovery-profile');
    if (!profile) {
      await db.recoveryProfiles.add(defaultRecoveryProfile());
    } else if (profile.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      await db.recoveryProfiles.put({
        ...profile,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Apply activity values to today's local-date record.
 * When `increment` is false, supplied counters replace their current values instead.
 */
export async function updateDailyActivity(
  updates: Partial<Omit<DailyActivity, 'id' | 'localDate'>>,
  increment: boolean,
): Promise<void> {
  const date = localDateKey(new Date());
  const existing = await db.dailyActivity.get(date);
  const next: DailyActivity = {
    id: date, localDate: date,
    reflectionsCompleted: existing?.reflectionsCompleted ?? 0,
    scriptureExplored: existing?.scriptureExplored ?? 0,
    meditationMinutes: existing?.meditationMinutes ?? 0,
    journalEntries: existing?.journalEntries ?? 0,
    gratitudeEntries: existing?.gratitudeEntries ?? 0,
  };
  for (const key of ['reflectionsCompleted', 'scriptureExplored', 'meditationMinutes', 'journalEntries', 'gratitudeEntries'] as const) {
    const value = updates[key];
    if (typeof value === 'number') next[key] = increment ? next[key] + value : value;
  }
  await db.dailyActivity.put(next);
}

/** Report whether the latest activity record is at least seven local calendar days old. */
export async function returnedAfterActivityBreak(): Promise<boolean> {
  const today = localDateKey(new Date());
  const priorDates = await db.dailyActivity.where('localDate').below(today).reverse().limit(1).toArray();
  const previous = priorDates[0]?.localDate;
  if (!previous) return false;
  const gap = (new Date(`${today}T12:00:00`).getTime() - new Date(`${previous}T12:00:00`).getTime()) / 86400000;
  return gap >= 7;
}
