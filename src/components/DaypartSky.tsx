import type { Daypart } from '../domain/daypart';

const sunPosition: Record<Daypart, { cx: number; cy: number }> = {
  dawn: { cx: 46, cy: 84 }, day: { cx: 150, cy: 34 }, dusk: { cx: 254, cy: 82 }, night: { cx: 236, cy: 38 },
};

/**
 * A quiet, decorative horizon whose sun or moon sits where it would at this time of day.
 * Purely visual (aria-hidden); the date and greeting are given in text.
 */
export function DaypartSky({ daypart }: { daypart: Daypart }) {
  const body = sunPosition[daypart];
  const night = daypart === 'night';
  return (
    <svg className={`daypart-sky daypart-sky-${daypart}`} viewBox="0 0 300 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <path className="sky-arc" d="M30 104 Q150 -8 270 104" />
      {night ? (
        <g className="sky-body">
          <circle cx={body.cx} cy={body.cy} r="11" />
          <circle cx={body.cx + 5} cy={body.cy - 4} r="10" className="sky-moon-shadow" />
          <circle cx="70" cy="30" r="1.4" className="sky-star" /><circle cx="110" cy="18" r="1.1" className="sky-star" /><circle cx="186" cy="26" r="1.3" className="sky-star" />
        </g>
      ) : (
        <g className="sky-body"><circle cx={body.cx} cy={body.cy} r="12" /><circle cx={body.cx} cy={body.cy} r="20" className="sky-glow" /></g>
      )}
      <path className="sky-hill sky-hill-back" d="M0 98 C50 78 90 82 140 92 S240 76 300 90 V120 H0Z" />
      <path className="sky-hill sky-hill-front" d="M0 108 C60 94 120 100 170 106 S260 96 300 104 V120 H0Z" />
    </svg>
  );
}
