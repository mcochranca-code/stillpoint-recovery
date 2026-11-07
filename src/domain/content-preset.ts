import type { ContentPreset, UserPreferences } from './types';
import { effectiveTraditionPreference, hasChosenTradition } from './traditions';

export const DEFAULT_CONTENT_PRESET: ContentPreset = 'faith-based';

export function isContentPreset(value: unknown): value is ContentPreset {
  return value === 'faith-based' || value === 'faith-neutral';
}

export function shouldShowFaithContent(preset: ContentPreset | undefined): boolean {
  return (preset ?? DEFAULT_CONTENT_PRESET) === 'faith-based';
}

type ChristianExtrasPreferences = Pick<UserPreferences, 'contentPreset' | 'traditionPreference' | 'traditionChoicePending' | 'christianExtras'>;

/** True when Christian is one of the traditions the person has chosen (never while the choice is still pending). */
export function hasChosenChristianTradition(preferences: Partial<ChristianExtrasPreferences> | undefined | null): boolean {
  if (!preferences || !hasChosenTradition(preferences)) return false;
  return effectiveTraditionPreference(preferences).traditions.includes('christian');
}

/**
 * Whether the Christian-only extras (Our Daily Bread links on Today, the Scripture tab in Library,
 * and Scripture labels in saved readings and progress) are shown.
 *
 * They are opt-in: they appear only when the person has chosen Christian among their traditions
 * AND turned "Christian extras" on. New installs save `christianExtras: false`, so nothing shows
 * until the person chooses it. Installs from before the switch existed have no `christianExtras`
 * value; they keep what they saw before (the Faith-based preset with the Christian tradition)
 * until they change the switch.
 */
export function shouldShowChristianExtras(preferences: Partial<ChristianExtrasPreferences> | undefined | null): boolean {
  if (!preferences || !hasChosenChristianTradition(preferences)) return false;
  if (typeof preferences.christianExtras === 'boolean') return preferences.christianExtras;
  return (preferences.contentPreset ?? DEFAULT_CONTENT_PRESET) === 'faith-based';
}
