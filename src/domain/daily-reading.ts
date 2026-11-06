import { readingsByTradition } from '../data/readings';
import { DEFAULT_TRADITION, RECOVERY_THEME_LABELS, TRADITION_IDS, normalizeTraditionPreference, traditionInfo } from './traditions';
import type { ReadingEntry, TraditionId, TraditionPreference } from './types';

export interface DailyReadingSelection {
  entry: ReadingEntry;
  tradition: TraditionId;
  /** A short, plain explanation of why this reading appears today. */
  why: string;
}

const mod = (value: number, size: number) => ((value % size) + size) % size;

/** A whole-number day for the local calendar date, so the choice holds steady all day in any time zone. */
export function localDayNumber(date: Date): number {
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return Math.floor(Date.UTC(safe.getFullYear(), safe.getMonth(), safe.getDate()) / 86_400_000);
}

/** Traditions in today's rotation, in a stable order; never empty. */
export function activeTraditions(preference: TraditionPreference | undefined): TraditionId[] {
  const normalized = normalizeTraditionPreference(preference);
  const withContent = (ids: readonly TraditionId[]) => ids.filter((id) => readingsByTradition[id]?.length);
  const chosen = normalized.mode === 'rotate' ? withContent(TRADITION_IDS) : withContent(normalized.traditions);
  if (chosen.length) return chosen;
  return withContent([DEFAULT_TRADITION]).length ? [DEFAULT_TRADITION] : withContent(TRADITION_IDS).slice(0, 1);
}

/**
 * Pick the reading for a local calendar day. The same date and preference always give the same
 * reading. With several traditions, each day moves to the next tradition, and each tradition moves
 * through its own readings in order, so no tradition skips entries.
 */
export function selectDailyReading(date: Date, preference: TraditionPreference | undefined): DailyReadingSelection {
  const day = localDayNumber(date);
  const traditions = activeTraditions(preference);
  const tradition = traditions[mod(day, traditions.length)]!;
  const pool = readingsByTradition[tradition];
  const entry = pool[mod(Math.floor(day / traditions.length), pool.length)]!;
  return { entry, tradition, why: explainSelection(entry, tradition, preference, traditions) };
}

function explainSelection(entry: ReadingEntry, tradition: TraditionId, preference: TraditionPreference | undefined, traditions: TraditionId[]): string {
  const label = traditionInfo(tradition).label;
  const theme = RECOVERY_THEME_LABELS[entry.recoveryTheme].toLowerCase();
  const normalized = normalizeTraditionPreference(preference);
  const requested = normalized.mode === 'rotate' ? TRADITION_IDS : normalized.traditions;
  const fellBack = !requested.includes(tradition);
  if (fellBack) return `Your saved choice had no readings available, so today’s reading comes from ${label}. Its theme is ${theme}. You can change traditions in Settings.`;
  if (normalized.mode === 'rotate') return `You’re rotating through all ${traditions.length} traditions; today is ${label}. It was chosen for the theme of ${theme}.`;
  if (traditions.length > 1) return `You chose ${traditions.length} traditions to take turns; today is ${label}. It was chosen for the theme of ${theme}.`;
  return `From the ${label} readings you chose, on the theme of ${theme}. A new reading comes each day.`;
}
