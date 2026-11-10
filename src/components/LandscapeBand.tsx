import { DaypartSky } from './DaypartSky';
import { daypartFor, type Daypart } from '../domain/daypart';
import { landscapeFor } from '../domain/landscape';
import { useAppContext } from '../app/AppContext';

/**
 * A quiet landscape behind a page header, chosen by today's tradition and tinted for the time
 * of day. Purely decorative (aria-hidden, no alt text): the page title and greeting carry the
 * meaning. A scrim fades the art into the canvas before any text begins, so header text keeps
 * WCAG AA contrast (checked in src/styles/contrast.test.ts). Nothing moves.
 */
export function LandscapeBand({ date = new Date(), daypart }: { date?: Date; daypart?: Daypart }) {
  const { preferences } = useAppContext();
  const landscape = landscapeFor(preferences, date);
  const part = daypart ?? daypartFor(date);
  // Three of the landscapes paint their own sun; the sky's sun or moon is added only to the others.
  const showSky = landscape === 'forest-path' || landscape === 'soft-bokeh';
  return (
    <div className={`landscape-band landscape-${landscape} landscape-band-${part}`} data-landscape={landscape} aria-hidden="true">
      <img className="landscape-band__art" src={`/assets/backgrounds/${landscape}.svg`} alt="" decoding="async" />
      <span className="landscape-band__tint" />
      {showSky && <DaypartSky daypart={part} />}
      <span className="landscape-band__scrim" />
    </div>
  );
}
