import { db } from './database';
import { updateDailyActivity } from './repository';
import { localDateKey } from '../domain/time';
import type { JournalEntry, Mood } from '../domain/types';

/** Tag that marks a one-tap Today check-in inside the private journal. */
export const DAILY_CHECK_IN_TAG = 'daily-check-in';

export const checkInMoods: Array<{ id: Mood; label: string }> = [
  { id: 'peaceful', label: 'Peaceful' },
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'steady', label: 'Steady' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'tired', label: 'Tired' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'sad', label: 'Sad' },
  { id: 'angry', label: 'Angry' },
];

const isTodayCheckIn = (entry: JournalEntry, today: string) =>
  entry.type === 'emotional-check-in' && entry.tags.includes(DAILY_CHECK_IN_TAG) && localDateKey(new Date(entry.createdAt)) === today;

/** Find today's check-in, if one was saved. */
export async function getTodayCheckIn(now = new Date()): Promise<JournalEntry | undefined> {
  const today = localDateKey(now);
  const entries = await db.journalEntries.where('type').equals('emotional-check-in').toArray();
  return entries.filter((entry) => isTodayCheckIn(entry, today)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * Save a one-tap check-in as a private journal entry (so it is covered by
 * backup, restore and delete-all without a schema change). A second tap on the
 * same day updates the mood instead of adding another entry.
 */
export async function saveDailyCheckIn(mood: Mood, now = new Date()): Promise<{ entry: JournalEntry; created: boolean }> {
  const label = checkInMoods.find((item) => item.id === mood)?.label ?? 'Checked in';
  const existing = await getTodayCheckIn(now);
  const timestamp = now.toISOString();
  if (existing) {
    const entry = { ...existing, mood, title: `Check-in · ${label}`, updatedAt: timestamp };
    await db.journalEntries.put(entry);
    return { entry, created: false };
  }
  const entry: JournalEntry = {
    id: `journal:${crypto.randomUUID()}`, type: 'emotional-check-in', title: `Check-in · ${label}`, body: '',
    createdAt: timestamp, updatedAt: timestamp, mood, tags: [DAILY_CHECK_IN_TAG], gratitude: [],
  };
  await db.journalEntries.add(entry);
  await updateDailyActivity({ journalEntries: 1 }, true);
  return { entry, created: true };
}
