import { buildMilestones, localDateKey } from './time';
import type { DailyActivity } from './types';

/**
 * Gentle progress models for the Progress page. They describe presence, never absence: there is
 * no streak, no count of missed days and no "broken" state, because beginning again is part of
 * recovery (README: "No streak pressure").
 */

export interface PathPoint { label: string; fraction: number }
export interface ProgressPathModel {
  /** 0–1 along the stretch from the start date to the next milestone. */
  todayFraction: number;
  daysAlong: number;
  next: { label: string; at: Date; daysToGo: number } | null;
  /** Milestones already reached, placed on the same 0–1 stretch (at most the latest four). */
  reached: PathPoint[];
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function progressPath(startAt: string | null | undefined, now = Date.now()): ProgressPathModel | null {
  if (!startAt) return null;
  const start = new Date(startAt).getTime();
  if (Number.isNaN(start) || start > now) return null;
  const milestones = buildMilestones(startAt);
  const next = milestones.find((milestone) => milestone.at.getTime() > now) ?? null;
  const daysAlong = Math.floor((now - start) / 86_400_000);
  if (!next) return { todayFraction: 1, daysAlong, next: null, reached: [] };
  const span = next.at.getTime() - start;
  const reached = milestones
    .filter((milestone) => milestone.at.getTime() <= now)
    .slice(-4)
    .map((milestone) => ({ label: milestone.label, fraction: clamp((milestone.at.getTime() - start) / span) }));
  return {
    todayFraction: clamp((now - start) / span),
    daysAlong,
    next: { label: next.label, at: next.at, daysToGo: Math.max(0, Math.ceil((next.at.getTime() - now) / 86_400_000)) },
    reached,
  };
}

export type PracticeKind = 'meditation' | 'journal' | 'reflection';
export const PRACTICE_LABELS: Record<PracticeKind, string> = { meditation: 'Meditation', journal: 'Journal', reflection: 'Reflection' };
export interface PracticeDay { key: string; shortLabel: string; longLabel: string; isToday: boolean; practices: Record<PracticeKind, boolean> }

/** The last seven local days, oldest first, with which practices appear on each. */
export function practiceWeek(activities: readonly DailyActivity[], today = new Date(), includeScripture = false): PracticeDay[] {
  const byDate = new Map<string, DailyActivity[]>();
  for (const activity of activities) byDate.set(activity.localDate, [...(byDate.get(activity.localDate) ?? []), activity]);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index), 12);
    const key = localDateKey(date);
    const rows = byDate.get(key) ?? [];
    const sum = (pick: (row: DailyActivity) => number) => rows.reduce((total, row) => total + (pick(row) || 0), 0);
    return {
      key,
      shortLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
      longLabel: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
      isToday: index === 6,
      practices: {
        meditation: sum((row) => row.meditationMinutes) > 0,
        journal: sum((row) => row.journalEntries + row.gratitudeEntries) > 0,
        reflection: sum((row) => row.reflectionsCompleted + (includeScripture ? row.scriptureExplored : 0)) > 0,
      },
    };
  });
}

/** A plain-language description of one day, for screen readers. Never says "missed". */
export function describePracticeDay(day: PracticeDay): string {
  const present = (Object.keys(PRACTICE_LABELS) as PracticeKind[]).filter((kind) => day.practices[kind]).map((kind) => PRACTICE_LABELS[kind].toLowerCase());
  const when = day.isToday ? `Today, ${day.longLabel}` : day.longLabel;
  if (!present.length) return `${when}: a quiet day, nothing recorded`;
  const list = present.length > 1 ? `${present.slice(0, -1).join(', ')} and ${present.at(-1)}` : present[0];
  return `${when}: ${list}`;
}
