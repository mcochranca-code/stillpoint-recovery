import { db } from './database';
import type { DailyActivity, RecoveryProfile, UserPreferences } from '../domain/types';
import { localDateKey } from '../domain/time';

export const defaultPreferences = (): UserPreferences => {
  const now = new Date().toISOString();
  return {
    id: 'preferences', schemaVersion: 3, onboardingComplete: false, theme: 'system', colorTheme: 'stillpoint',
    highContrast: false, reducedMotion: false, hideMeditationVisual: false, textScale: 1,
    timeFormat: '12h', counterStyle: 'full', liveCounter: true, reminderEnabled: false,
    reminderTime: '19:00', trustedContacts: [], supportResources: [], discreetMode: false, gardenStyle: 'woodland',
    allowBreathHolds: false, createdAt: now, updatedAt: now,
  };
};

export const defaultRecoveryProfile = (): RecoveryProfile => ({
  id: 'recovery-profile', schemaVersion: 1, startAt: null, localStartDate: null,
  localStartTime: null, startTimeZone: null, focus: '', intention: '', updatedAt: new Date().toISOString(),
});

export async function ensureDefaults(): Promise<void> {
  await db.transaction('rw', db.preferences, db.recoveryProfiles, async () => {
    if (!(await db.preferences.get('preferences'))) await db.preferences.add(defaultPreferences());
    if (!(await db.recoveryProfiles.get('recovery-profile'))) await db.recoveryProfiles.add(defaultRecoveryProfile());
  });
}

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

export async function returnedAfterActivityBreak(): Promise<boolean> {
  const today = localDateKey(new Date());
  const priorDates = await db.dailyActivity.where('localDate').below(today).reverse().limit(1).toArray();
  const previous = priorDates[0]?.localDate;
  if (!previous) return false;
  const gap = (new Date(`${today}T12:00:00`).getTime() - new Date(`${previous}T12:00:00`).getTime()) / 86400000;
  return gap >= 7;
}
