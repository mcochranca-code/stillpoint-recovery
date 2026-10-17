import { db } from './database';
import { eligibleCharms, type ActivitySnapshot } from '../domain/achievements';
import { charmDefinitions } from '../data/charms';
import type { EarnedCharm } from '../domain/types';

export async function collectActivitySnapshot(daysSober: number, hasReturnedAfterBreak = false): Promise<ActivitySnapshot> {
  const [preferences, profile, journalEntries, sessions, scriptureActivity, dailyReflections] = await Promise.all([
    db.preferences.get('preferences'), db.recoveryProfiles.get('recovery-profile'),
    db.journalEntries.toArray(), db.meditationSessions.toArray(), db.scriptureActivity.toArray(), db.dailyReflections.toArray(),
  ]);
  if (!preferences) throw new Error('User preferences are not ready.');
  const reflectionCount = new Set(dailyReflections.filter((entry) => entry.reflectedAt).map((entry) => entry.reflectionId)).size;
  return {
    preferences, sobrietyDays: daysSober, journalEntries,
    completedSessions: sessions.filter((item) => item.status === 'completed'), scriptureActivity,
    reflectionCount, hasIntention: Boolean(profile?.intention?.trim()), hasReturnedAfterBreak,
  };
}

export async function awardEligibleCharms(daysSober: number, hasReturnedAfterBreak = false): Promise<EarnedCharm[]> {
  const snapshot = await collectActivitySnapshot(daysSober, hasReturnedAfterBreak);
  const ids = eligibleCharms(snapshot);
  const newAwards: EarnedCharm[] = [];
  await db.transaction('rw', db.earnedCharms, async () => {
    for (const charmId of ids) {
      const id = `charm:${charmId}`;
      if (await db.earnedCharms.get(id)) continue;
      const award: EarnedCharm = { id, charmId, earnedAt: new Date().toISOString() };
      await db.earnedCharms.add(award);
      newAwards.push(award);
    }
  });
  return newAwards;
}

export function charmDefinition(charmId: string) {
  return charmDefinitions.find((charm) => charm.id === charmId);
}
