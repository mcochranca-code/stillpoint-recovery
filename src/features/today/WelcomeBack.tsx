import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Wind, X } from 'lucide-react';
import { welcomeBackGap } from '../../domain/engagement';
import { localDateKey } from '../../domain/time';
import { readLocalSignal, writeLocalSignal } from '../../platform/localSignals';

/**
 * A warm note after a few days away. It reads the previous on-device visit date
 * once, then records today's visit. No streak, no "you missed", no catching up.
 */
export function WelcomeBack({ onCheckIn }: { onCheckIn: () => void }) {
  const [gap] = useState(() => welcomeBackGap(readLocalSignal('lastVisitDate'), localDateKey(new Date()), readLocalSignal('welcomeBackDismissedOn')));
  const [open, setOpen] = useState(gap !== null);

  useEffect(() => { writeLocalSignal('lastVisitDate', localDateKey(new Date())); }, []);

  if (!open || gap === null) return null;
  const dismiss = () => { writeLocalSignal('welcomeBackDismissedOn', localDateKey(new Date())); setOpen(false); };

  return (
    <section className="card welcome-back" aria-labelledby="welcome-back-title">
      <span className="welcome-back__icon" aria-hidden="true"><Sun size={20} /></span>
      <div className="welcome-back__copy">
        <p className="eyebrow">Welcome back</p>
        <h2 id="welcome-back-title">It’s good to see you.</h2>
        <p className="muted">Everything you saved is still here. There’s nothing to catch up on—today can simply start where you are.</p>
        <div className="action-row">
          <button type="button" className="button button-primary button-small" onClick={() => { dismiss(); onCheckIn(); }}>Check in for today</button>
          <Link to="/reset" className="button button-secondary button-small"><Wind size={14} aria-hidden="true" /> Take a moment first</Link>
        </div>
      </div>
      <button type="button" className="icon-button welcome-back__close" aria-label="Dismiss welcome back note" onClick={dismiss}><X size={16} aria-hidden="true" /></button>
    </section>
  );
}
