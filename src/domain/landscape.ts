import { TRADITION_IDS, effectiveTraditionPreference, hasChosenTradition, normalizeTraditionPreference } from './traditions';
import type { ContentPreset, TraditionId, TraditionPreference } from './types';

/**
 * The page-header landscapes. Each is one of the existing, original background illustrations in
 * public/assets/backgrounds/ (provenance: docs/copyright/landscape-art.md). Landscapes only — no
 * religious symbols, and nothing for the Red Road beyond a plain path through trees.
 */
export type LandscapeId = 'sunrise-hills' | 'still-lake' | 'forest-path' | 'ocean-dusk' | 'soft-bokeh';

/**
 * One landscape per tradition, echoing the motif already drawn for it in TraditionMotif:
 * morning light over hills, still water, a leaf among trees, the declining day over water,
 * a dew-drop's still surface, a road through the trees. Spiritual-but-not-religious, and anyone
 * who has not chosen yet, get the soft, placeless light.
 */
export const TRADITION_LANDSCAPES: Record<TraditionId, LandscapeId> = {
  christian: 'sunrise-hills',
  buddhist: 'still-lake',
  hindu: 'forest-path',
  muslim: 'ocean-dusk',
  jain: 'still-lake',
  'red-road': 'forest-path',
  reflective: 'soft-bokeh',
};
export const FALLBACK_LANDSCAPE: LandscapeId = 'soft-bokeh';

const mod = (value: number, size: number) => ((value % size) + size) % size;
/** Same local-day arithmetic as the daily reading, so the header follows today's reading. */
const localDay = (date: Date) => {
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return Math.floor(Date.UTC(safe.getFullYear(), safe.getMonth(), safe.getDate()) / 86_400_000);
};

type LandscapePreferences = { traditionPreference?: TraditionPreference; traditionChoicePending?: boolean; contentPreset?: ContentPreset } | undefined | null;

/** The tradition whose landscape shows today, or null before the person has chosen one. */
export function landscapeTradition(preferences: LandscapePreferences, date: Date): TraditionId | null {
  if (!preferences || !hasChosenTradition(preferences)) return null;
  const preference = normalizeTraditionPreference(effectiveTraditionPreference(preferences), preferences.contentPreset);
  const traditions = preference.mode === 'rotate' ? [...TRADITION_IDS] : preference.traditions;
  if (!traditions.length) return null;
  return traditions[mod(localDay(date), traditions.length)] ?? null;
}

export function landscapeFor(preferences: LandscapePreferences, date: Date): LandscapeId {
  const tradition = landscapeTradition(preferences, date);
  return tradition ? TRADITION_LANDSCAPES[tradition] : FALLBACK_LANDSCAPE;
}
