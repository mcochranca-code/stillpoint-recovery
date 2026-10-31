import { reachedMilestones, type Milestone } from './time';

export type RecoveryTokenStyle = 'keytag' | 'medallion';

/** Return the latest already-reached milestone from the same timeline used by Progress. */
export function currentRecoveryTokenMilestone(startAt: string | null | undefined, now = Date.now()): Milestone | null {
  if (!startAt) return null;
  const milestones = reachedMilestones(startAt, now);
  return milestones[milestones.length - 1] ?? null;
}

/** Split an existing milestone label into the number and unit shown on a token face. */
export function milestoneTokenNumber(label: string): { number: string; unit: string } {
  const match = /^(\d+)\s+(hours?|days?|months?|years?)$/i.exec(label.trim());
  if (!match) return { number: '', unit: label.toLocaleUpperCase() };
  const number = match[1] ?? '';
  const unit = match[2] ?? '';
  return { number, unit: unit.toLocaleUpperCase() };
}
