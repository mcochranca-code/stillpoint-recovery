import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { syncReachedMilestones } from './milestones';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('reached milestone persistence', () => {
  it('persists reached milestones once per recovery start instant', async () => {
    const startAt = '2020-01-01T00:00:00.000Z';
    const firstSync = await syncReachedMilestones(startAt);

    expect(firstSync.length).toBeGreaterThan(0);
    expect(firstSync.map((record) => record.id)).toContain(`${startAt}:24-hours`);
    expect(firstSync.map((record) => record.id)).toContain(`${startAt}:calendar-12-months`);
    expect(await db.milestoneRecords.count()).toBe(firstSync.length);

    expect(await syncReachedMilestones(startAt)).toEqual([]);
    expect(await db.milestoneRecords.count()).toBe(firstSync.length);
  });

  it('keeps milestone history separate when a recovery start date changes', async () => {
    const firstStart = '2020-01-01T00:00:00.000Z';
    const secondStart = '2021-01-01T00:00:00.000Z';

    await syncReachedMilestones(firstStart);
    await syncReachedMilestones(secondStart);

    expect(await db.milestoneRecords.where('startAt').equals(firstStart).count()).toBeGreaterThan(0);
    expect(await db.milestoneRecords.where('startAt').equals(secondStart).count()).toBeGreaterThan(0);
  });
});
