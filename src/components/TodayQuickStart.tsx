import { BookOpen, CalendarDays, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const startingPoints = [
  {
    to: '/meditation',
    title: 'Take a quiet pause',
    detail: 'Breathing and gentle practices',
    icon: Heart,
  },
  {
    to: '/meetings',
    title: 'Find a meeting',
    detail: 'Browse local and online listings',
    icon: CalendarDays,
  },
  {
    to: '/journal',
    title: 'Write a few lines',
    detail: 'Private notes stay on this device',
    icon: BookOpen,
  },
] as const;

/** A compact, optional first step that avoids requiring a recovery date. */
export function TodayQuickStart() {
  return (
    <section className="card today-quick-start" aria-labelledby="today-quick-start-title">
      <div className="today-quick-start__intro">
        <p className="eyebrow">Everything is optional</p>
        <h2 id="today-quick-start-title">What would help right now?</h2>
        <p>Choose a starting point, or explore at your own pace.</p>
      </div>
      <nav className="today-quick-start__links" aria-label="Quick ways to begin">
        {startingPoints.map(({ to, title, detail, icon: Icon }) => (
          <Link className="today-quick-start__link" key={to} to={to}>
            <span className="today-quick-start__icon"><Icon size={18} aria-hidden="true" /></span>
            <span className="today-quick-start__copy">
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
            <ArrowRight className="today-quick-start__arrow" size={16} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
