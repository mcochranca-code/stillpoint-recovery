import { MessageCircle } from 'lucide-react';
import { CommunityDiscussion } from '../today/CommunityDiscussion';
import { getDailyReflection } from '../../data/reflections';
import { localDateKey } from '../../domain/time';

/** Render the optional account-free community notes destination for today's original reflection. */
export function CommunityPage() {
  const today = localDateKey(new Date());
  const reflection = getDailyReflection(new Date());

  return (
    <div className="page-stack community-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Optional, shared space</p>
          <h1>Community notes.</h1>
          <p>Offer or read a short, account-free thought about today’s original Stillpoint reflection.</p>
        </div>
        <span className="pill"><MessageCircle size={14} aria-hidden="true" /> Public notes</span>
      </header>
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Today’s original reflection</p>
            <h2>{reflection.title}</h2>
            <p>{reflection.theme} · {today}</p>
          </div>
        </div>
        <CommunityDiscussion date={today} reflectionId={reflection.id} />
      </section>
    </div>
  );
}
