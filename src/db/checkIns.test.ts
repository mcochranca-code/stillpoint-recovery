import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { createBackup } from './backup';
import { DAILY_CHECK_IN_TAG, getTodayCheckIn, saveDailyCheckIn } from './checkIns';
import { ensureDefaults } from './repository';
import { localDateKey } from '../domain/time';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureDefaults();
});

afterEach(() => { db.close(); });

describe('one-tap daily check-in', () => {
  it('saves a private check-in once per day and counts it as activity', async () => {
    const first = await saveDailyCheckIn('steady');
    expect(first.created).toBe(true);
    expect(first.entry).toMatchObject({ type: 'emotional-check-in', mood: 'steady', title: 'Check-in · Steady', tags: [DAILY_CHECK_IN_TAG] });

    const second = await saveDailyCheckIn('hopeful');
    expect(second.created).toBe(false);
    expect(await db.journalEntries.count()).toBe(1);
    expect((await getTodayCheckIn())?.mood).toBe('hopeful');

    const activity = await db.dailyActivity.get(localDateKey(new Date()));
    expect(activity?.journalEntries).toBe(1);
  });

  it('stores up to three paired feeling words in the existing journal tags and updates them in place', async () => {
    const now = new Date();
    const first = await saveDailyCheckIn('sad', now, ['sad', 'melancholy', 'apathetic', 'bored']);
    expect(first.created).toBe(true);
    expect(first.entry.tags).toEqual([DAILY_CHECK_IN_TAG, 'feeling:sad', 'feeling:melancholy', 'feeling:apathetic']);

    const next = await saveDailyCheckIn('anxious', now, ['anxious', 'restless']);
    expect(next.created).toBe(false);
    expect(next.entry.tags).toEqual([DAILY_CHECK_IN_TAG, 'feeling:anxious', 'feeling:restless']);
    expect(await db.journalEntries.count()).toBe(1);
    expect((await getTodayCheckIn(now))?.mood).toBe('anxious');
    const backup = await createBackup();
    expect(backup.tables.journalEntries).toEqual(expect.arrayContaining([expect.objectContaining({ tags: expect.arrayContaining(['feeling:restless']) })]));
  });

  it('starts fresh on a new day without touching earlier check-ins', async () => {
    await saveDailyCheckIn('tired', new Date('2026-11-01T09:00:00'));
    expect(await getTodayCheckIn(new Date('2026-11-02T09:00:00'))).toBeUndefined();
    const next = await saveDailyCheckIn('peaceful', new Date('2026-11-02T09:00:00'));
    expect(next.created).toBe(true);
    expect(await db.journalEntries.count()).toBe(2);
  });

  it('is included in the private backup like any journal entry', async () => {
    await saveDailyCheckIn('grateful');
    const backup = await createBackup();
    expect(backup.tables.journalEntries).toHaveLength(1);
  });
});
