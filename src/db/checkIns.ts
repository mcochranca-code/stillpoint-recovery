import { db } from './database';
import { updateDailyActivity } from './repository';
import { localDateKey } from '../domain/time';
import { emotionGroups, getEmotionTerm } from '../data/emotion-vocabulary';
import type { JournalEntry, Mood } from '../domain/types';

/** Tag that marks a one-tap Today check-in inside the private journal. */
export const DAILY_CHECK_IN_TAG = 'daily-check-in';
/** Prefix for user-chosen feeling words, stored with existing backup-compatible journal tags. */
export const DAILY_CHECK_IN_FEELING_PREFIX = 'feeling:';

export const checkInMoods: Array<{ id: Mood; label: string }> = emotionGroups.map(({ id, label }) => ({ id, label }));

const isTodayCheckIn = (entry: JournalEntry, today: string) =>
  entry.type === 'emotional-check-in' && entry.tags.includes(DAILY_CHECK_IN_TAG) && localDateKey(new Date(entry.createdAt)) === today;

/** Find today's check-in, if one was saved. */
export async function getTodayCheckIn(now = new Date()): Promise<JournalEntry | undefined> {
  const today = localDateKey(now);
  const entries = await db.journalEntries.where('type').equals('emotional-check-in').toArray();
  return entries.filter((entry) => isTodayCheckIn(entry, today)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * Save a daily check-in as a private journal entry. Its selected word IDs use the existing
 * tags array, so export, restore, delete-all and older local database schemas keep working.
 * A second save on the same day updates this record rather than adding another one.
 */
export async function saveDailyCheckIn(mood: Mood, now = new Date(), emotionIds: string[] = []): Promise<{ entry: JournalEntry; created: boolean }> {
  const label = checkInMoods.find((item) => item.id === mood)?.label ?? 'Checked in';
  const emotionTags = [...new Set(emotionIds.slice(0, 3).filter((id) => Boolean(getEmotionTerm(id))))]
    .map((id) => `${DAILY_CHECK_IN_FEELING_PREFIX}${id}`);
  const existing = await getTodayCheckIn(now);
  const timestamp = now.toISOString();
  if (existing) {
    const retainedTags = existing.tags.filter((tag) => !tag.startsWith(DAILY_CHECK_IN_FEELING_PREFIX));
    const entry = { ...existing, mood, title: `Check-in · ${label}`, tags: [...new Set([...retainedTags, ...emotionTags])], updatedAt: timestamp };
    await db.journalEntries.put(entry);
    return { entry, created: false };
  }
  const entry: JournalEntry = {
    id: `journal:${crypto.randomUUID()}`, type: 'emotional-check-in', title: `Check-in · ${label}`, body: '',
    createdAt: timestamp, updatedAt: timestamp, mood, tags: [DAILY_CHECK_IN_TAG, ...emotionTags], gratitude: [],
  };
  await db.journalEntries.add(entry);
  await updateDailyActivity({ journalEntries: 1 }, true);
  return { entry, created: true };
}
