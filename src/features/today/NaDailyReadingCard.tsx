import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, ExternalLink } from 'lucide-react';

export const NA_JUST_FOR_TODAY_URL = 'https://na.org/daily-meditations/';

function useLocalDateLabel(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number | undefined;
    const refreshAtLocalMidnight = () => {
      const current = new Date();
      setNow(current);
      const nextMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      timeoutId = window.setTimeout(refreshAtLocalMidnight, Math.max(1_000, nextMidnight.getTime() - current.getTime() + 50));
    };
    refreshAtLocalMidnight();
    return () => { if (timeoutId !== undefined) window.clearTimeout(timeoutId); };
  }, []);

  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function NaDailyReadingCard() {
  const dateLabel = useLocalDateLabel();

  return (
    <section className="card na-reader-card" aria-labelledby="na-reader-heading">
      <div className="na-reader-copy">
        <p className="eyebrow">A daily reading from Narcotics Anonymous World Services</p>
        <h2 id="na-reader-heading">NA Just for Today</h2>
        <p className="na-reader-date"><CalendarDays size={15} aria-hidden="true" /> Today on this device: {dateLabel}</p>
        <p className="na-reader-description">
          NA World Services pairs each date with a Just for Today meditation. Open the official reader to see its current dated entry in full.
        </p>
        <a
          className="button button-primary na-reader-link"
          href={NA_JUST_FOR_TODAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open today's official Narcotics Anonymous Just for Today reading at NA.org; opens in a new tab"
        >
          <BookOpen size={17} aria-hidden="true" />
          Open today’s NA reading
          <ExternalLink size={15} aria-hidden="true" />
          <span className="sr-only">Opens in a new tab</span>
        </a>
        <p className="na-reader-note">
          NA literature remains at its official source. Stillpoint links to NA.org rather than copying the copyrighted reading; this link does not send your recovery information.
        </p>
      </div>
      <div className="na-reader-stamp" aria-label="365-day daily reader">
        <strong>365</strong>
        <span>days</span>
        <small>one reading<br />each day</small>
      </div>
    </section>
  );
}
