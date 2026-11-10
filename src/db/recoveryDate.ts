import { db } from './database';
import { syncReachedMilestones } from './milestones';
import { safeWrite } from './storageHealth';
import type { RecoveryDateHistory, RecoveryProfile } from '../domain/types';

/**
 * Save a recovery-date change, its optional history entry and the milestones it reaches together.
 * Either all of them are saved or, if any step fails, none are (the transaction rolls back).
 */
export async function saveRecoveryDateChange(profile: RecoveryProfile, history?: RecoveryDateHistory): Promise<void> {
  await safeWrite('recovery-date', [db.recoveryDateHistory, db.recoveryProfiles, db.milestoneRecords], async () => {
    if (history) await db.recoveryDateHistory.add(history);
    await db.recoveryProfiles.put(profile);
    if (profile.startAt) await syncReachedMilestones(profile.startAt);
  }, 'Your date could not be saved, so nothing was changed. Please try again.');
}
