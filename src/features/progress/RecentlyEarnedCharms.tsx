import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CharmMedallion } from '../../components/CharmMedallion';
import { recentlyEarnedCharms } from '../../domain/achievements';
import { formatLocalDate } from '../../domain/time';
import type { EarnedCharm } from '../../domain/types';

/** A short strip of the latest one to three collected charms, each opening the Journey Collection. */
export function RecentlyEarnedCharms({ awards }: { awards: EarnedCharm[] }) {
  const recent = recentlyEarnedCharms(awards, 3);
  if (!recent.length) return null;
  return (
    <section className="card recent-charms" aria-labelledby="recent-charms-heading">
      <div className="card-header">
        <div><p className="eyebrow">The Journey Collection</p><h2 id="recent-charms-heading">Recently earned</h2></div>
        <Link className="inline-link recent-charms__all" to="/charms">See all charms <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <ul className="recent-charms__list">
        {recent.map(({ award, charm }) => (
          <li key={award.id}>
            <Link className="recent-charms__item" to="/charms">
              <CharmMedallion still size="strip" name={charm.name} image={charm.image} />
              <span><strong>{charm.name}</strong><small>Collected {formatLocalDate(award.earnedAt)}</small></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
