import { db, type MilestoneRecord } from './database';
import { reachedMilestones } from '../domain/time';

/** Persist newly reached milestones for a recovery-date instant and return only records created now. */
export async function syncReachedMilestones(startAt: string): Promise<MilestoneRecord[]> {
  const reached = reachedMilestones(startAt);
  const created: MilestoneRecord[] = [];
  await db.transaction('rw', db.milestoneRecords, async () => {
    for (const milestone of reached) {
      const id = `${startAt}:${milestone.id}`;
      if (await db.milestoneRecords.get(id)) continue;
      const record: MilestoneRecord = {
        id,
        milestoneId: milestone.id,
        label: milestone.label,
        startAt,
        reachedAt: milestone.at.toISOString(),
      };
      await db.milestoneRecords.add(record);
      created.push(record);
    }
  });
  return created;
}
