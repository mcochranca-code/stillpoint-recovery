import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, ExternalLink, Share2 } from 'lucide-react';
import { buildNaSharePayload, shareOrCopy } from '../../domain/sharing';

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
  const [shareStatus, setShareStatus] = useState('');

  async function shareOfficialLink() {
    const result = await shareOrCopy(buildNaSharePayload(NA_JUST_FOR_TODAY_URL));
    if (result === 'shared') setShareStatus('The official NA reader link was handed to your selected share destination. No reading text was shared by the app.');
    else if (result === 'copied') setShareStatus('The official NA reader link was copied. No reading text was copied.');
    else if (result === 'cancelled') setShareStatus('Share canceled. Nothing was sent.');
    else setShareStatus('Sharing is unavailable in this browser. Open the official reading link above.');
  }

  return (
    <section className="card na-reader-card" aria-labelledby="na-reader-heading">
      <div className="na-reader-copy">
        <p className="eyebrow">A daily reading from Narcotics Anonymous World Services</p>
        <h2 id="na-reader-heading">NA Just for Today</h2>
        <p className="na-reader-date"><CalendarDays size={15} aria-hidden="true" /> Today on this device: {dateLabel}</p>
        <p className="na-reader-description">
          Open NA World Services’ official reader to see its current dated entry in full. Its publication date can differ from this device’s date near timezone boundaries.
        </p>
        <div className="na-reader-actions">
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
          <button className="button button-secondary na-reader-share" type="button" onClick={() => void shareOfficialLink()}>
            <Share2 size={16} aria-hidden="true" /> Share official link
          </button>
        </div>
        <p className="na-reader-share-status" role="status">{shareStatus}</p>
        <p className="na-reader-note">
          NA literature remains at its official source. Sharing includes the NAWS title and URL only; it does not copy the copyrighted reading or send your recovery information.
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
