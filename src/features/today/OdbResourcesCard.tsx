import { ArrowUpRight, BookOpen, Headphones } from 'lucide-react';

const readingPlansUrl = 'https://odb.org/page/reading-plans';
const podcastsUrl = 'https://odb.org/podcasts/';

/** Render opt-in links to official Our Daily Bread reading and podcast resources. */
export function OdbResourcesCard() {
  return (
    <section className="card odb-resource-card" aria-labelledby="odb-resources-heading">
      <div className="odb-resource-copy">
        <p className="eyebrow">OPTIONAL · OUR DAILY BREAD MINISTRIES</p>
        <h2 id="odb-resources-heading">Explore an official reading or conversation.</h2>
        <p className="odb-resource-description">
          If a guided Scripture study or a listening practice fits today, open Our Daily Bread’s Reading Plans or the Discover the Word podcast catalogue. Publisher readings stay on the publisher’s site.
        </p>
        <p className="odb-resource-prompt"><strong>An original Stillpoint prompt:</strong> After you read or listen, name one idea in your own words and choose one small, kind step for today.</p>
        <div className="odb-resource-links">
          <a className="button button-secondary odb-resource-link" href={readingPlansUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Official Our Daily Bread Reading Plans (opens in a new tab)">
            <BookOpen size={16} aria-hidden="true" /> Reading Plans <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <a className="button button-secondary odb-resource-link" href={podcastsUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Official Our Daily Bread Discover the Word podcast page (opens in a new tab)">
            <Headphones size={16} aria-hidden="true" /> Discover the Word <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <p className="odb-source-note">
          Sources checked October 22, 2026. Stillpoint does not copy or fetch ODB readings. These links send no recovery profile, sobriety date, journal text, or page referrer from Stillpoint. The publisher may receive standard connection details; its own privacy, cookie, analytics, and terms practices apply.
        </p>
      </div>
      <span className="odb-resource-mark" aria-hidden="true"><BookOpen size={25} /></span>
    </section>
  );
}
