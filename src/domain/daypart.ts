export type Daypart = 'dawn' | 'day' | 'dusk' | 'night';

/** The part of the local day used to tint the background: dawn 5–9, day 9–17, dusk 17–21, night otherwise. */
export function daypartFor(date: Date): Daypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

export const DAYPART_LABELS: Record<Daypart, string> = {
  dawn: 'Early morning', day: 'Daytime', dusk: 'Evening', night: 'Night',
};
