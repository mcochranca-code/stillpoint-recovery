import { charmDefinitions } from '../data/charms';
import type { CharmDefinition, EarnedCharm, JournalEntry, MeditationSession, ScriptureActivity, UserPreferences } from './types';

export interface ActivitySnapshot {
  preferences: UserPreferences;
  sobrietyDays: number;
  journalEntries: JournalEntry[];
  completedSessions: MeditationSession[];
  scriptureActivity: ScriptureActivity[];
  reflectionCount: number;
  hasIntention: boolean;
  hasReturnedAfterBreak: boolean;
}

/** Return charm IDs whose criteria are met by the supplied local activity snapshot. */
export function eligibleCharms(snapshot: ActivitySnapshot): string[] {
  const gratitudeCount = snapshot.journalEntries.filter((entry) => entry.type === 'gratitude').length;
  const courageous = snapshot.journalEntries.some((entry) => entry.type === 'trigger' && Boolean(entry.copingStrategy?.trim()));
  const rules: Record<string, boolean> = {
    'first-light': snapshot.preferences.onboardingComplete && snapshot.hasIntention,
    'steady-footsteps': snapshot.reflectionCount >= 3,
    'open-heart': snapshot.journalEntries.length >= 5,
    'quiet-mind': snapshot.completedSessions.some((session) => session.status === 'completed'),
    'seven-day-oak': snapshot.sobrietyDays >= 7,
    'grateful-spirit': gratitudeCount >= 7,
    'courageous-step': courageous,
    'faithful-practice': new Set(snapshot.scriptureActivity.map((item) => item.scriptureId)).size >= 7,
    'deep-roots': snapshot.sobrietyDays >= 30,
    'resilient-heart': snapshot.hasReturnedAfterBreak,
    'new-horizon': snapshot.sobrietyDays >= 90,
    'year-of-growth': snapshot.sobrietyDays >= 365,
  };
  return charmDefinitions.filter((charm) => rules[charm.id]).map((charm) => charm.id);
}

/** Summarize current progress toward one charm's criteria for display. */
export function charmProgress(charm: CharmDefinition, snapshot: ActivitySnapshot): { current: number; target: number; label: string } {
  const gratitude = snapshot.journalEntries.filter((entry) => entry.type === 'gratitude').length;
  const scriptureCount = new Set(snapshot.scriptureActivity.map((item) => item.scriptureId)).size;
  const values: Record<string, { current: number; target: number; label: string }> = {
    'first-light': { current: Number(snapshot.preferences.onboardingComplete && snapshot.hasIntention), target: 1, label: 'Complete onboarding and set an intention' },
    'steady-footsteps': { current: snapshot.reflectionCount, target: 3, label: 'Daily reflections' },
    'open-heart': { current: snapshot.journalEntries.length, target: 5, label: 'Journal entries' },
    'quiet-mind': { current: snapshot.completedSessions.length, target: 1, label: 'Completed meditation sessions' },
    'seven-day-oak': { current: snapshot.sobrietyDays, target: 7, label: 'Days since selected recovery date' },
    'grateful-spirit': { current: gratitude, target: 7, label: 'Gratitude entries' },
    'courageous-step': { current: Number(snapshot.journalEntries.some((entry) => entry.type === 'trigger' && entry.copingStrategy?.trim())), target: 1, label: 'Record a challenge and a coping response (optional)' },
    'faithful-practice': { current: scriptureCount, target: 7, label: 'Scripture entries explored' },
    'deep-roots': { current: snapshot.sobrietyDays, target: 30, label: 'Days since selected recovery date' },
    'resilient-heart': { current: Number(snapshot.hasReturnedAfterBreak), target: 1, label: 'Return to a recovery-supportive activity after a break' },
    'new-horizon': { current: snapshot.sobrietyDays, target: 90, label: 'Days since selected recovery date' },
    'year-of-growth': { current: snapshot.sobrietyDays, target: 365, label: 'Days since selected recovery date' },
  };
  return values[charm.id] ?? { current: 0, target: 1, label: charm.criteria };
}

/** Describe a milestone-charm day count in plain words ("7 days", "1 year"). */
export function milestoneCharmLabel(days: number): string {
  if (days > 0 && days % 365 === 0) return days === 365 ? '1 year' : `${days / 365} years`;
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** The first time-based charm not yet reached at `sobrietyDays`, or null when none remain. */
export function nextMilestoneCharm(sobrietyDays: number, definitions: CharmDefinition[] = charmDefinitions): (CharmDefinition & { milestoneDays: number }) | null {
  const upcoming = definitions
    .filter((charm): charm is CharmDefinition & { milestoneDays: number } => typeof charm.milestoneDays === 'number' && charm.milestoneDays > sobrietyDays)
    .sort((a, b) => a.milestoneDays - b.milestoneDays);
  return upcoming[0] ?? null;
}

/** The latest earned charms, newest first, paired with their definitions (unknown IDs are skipped). */
export function recentlyEarnedCharms(earned: EarnedCharm[], limit = 3, definitions: CharmDefinition[] = charmDefinitions): Array<{ award: EarnedCharm; charm: CharmDefinition }> {
  return [...earned]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .flatMap((award) => {
      const charm = definitions.find((item) => item.id === award.charmId);
      return charm ? [{ award, charm }] : [];
    })
    .slice(0, Math.max(0, limit));
}
