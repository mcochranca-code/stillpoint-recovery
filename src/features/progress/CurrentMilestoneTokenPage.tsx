import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Rotate3D } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { RecoveryMilestoneCanvas } from '../../components/RecoveryMilestoneCanvas';
import { currentRecoveryTokenMilestone, type RecoveryTokenStyle } from '../../domain/recovery-token';
import { elapsedParts, formatLocalDate } from '../../domain/time';
import './current-milestone-token.css';

/** A first-class tab that renders only the user's latest reached time milestone. */
export function CurrentMilestoneTokenPage() {
  const { profile, preferences } = useAppContext();
  const [style, setStyle] = useState<RecoveryTokenStyle>('keytag');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!preferences) return <div className="empty-state" role="status">Loading your local milestone…</div>;

  if (preferences.discreetMode) {
    return (
      <div className="page-stack current-token-page">
        <header className="current-token-intro">
          <p className="eyebrow">A marker for today</p>
          <h1>Current sobriety token</h1>
          <p>Time and milestone details are hidden while discreet mode is on.</p>
          <Link className="button button-secondary" to="/settings">Review discreet mode settings <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
      </div>
    );
  }

  const startAt = profile?.startAt ?? null;
  const duration = elapsedParts(startAt, now);
  const milestone = currentRecoveryTokenMilestone(startAt, now);

  return (
    <div className="page-stack current-token-page">
      <header className="current-token-intro">
        <p className="eyebrow">One day at a time</p>
        <h1>Current sobriety token</h1>
        <p>This view follows the same local counter and fixed milestones as Progress. It shows only the latest milestone already reached as an NA keytag or AA medallion; it does not change your date or award rules.</p>
      </header>

      {!startAt ? (
        <section className="current-token-empty" aria-labelledby="current-token-empty-title">
          <Award size={28} aria-hidden="true" />
          <h2 id="current-token-empty-title">Your token will appear here</h2>
          <p>Choose a recovery date on Today. This tab will then show only the most recent time milestone your counter has reached.</p>
          <Link className="button button-primary" to="/">Open Today <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      ) : !duration ? (
        <section className="current-token-empty" aria-labelledby="current-token-empty-title">
          <Award size={28} aria-hidden="true" />
          <h2 id="current-token-empty-title">A valid recovery date is needed</h2>
          <p>Update the date from Today to see the milestone token that corresponds with your local counter.</p>
          <Link className="button button-primary" to="/">Open Today <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      ) : milestone ? (
        <section className="current-token-card" aria-labelledby="current-token-milestone-title">
          <div className="current-token-details">
            <div className="current-token-counter" aria-label={`${duration.days} days on the local counter`}>
              <strong>{duration.days}</strong><span>{duration.days === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="current-token-milestone-copy">
              <p className="eyebrow">Latest reached marker</p>
              <h2 id="current-token-milestone-title">{milestone.label}</h2>
              <p>Reached {formatLocalDate(milestone.at)}. Switching between the supplied NA and AA designs does not change your counter.</p>
            </div>
          </div>

          <div className="current-token-style-row" role="group" aria-label="Choose AA or NA token design">
            <span>View as</span>
            <button type="button" className={`filter-chip${style === 'keytag' ? ' selected' : ''}`} aria-pressed={style === 'keytag'} onClick={() => setStyle('keytag')}>NA Keytag</button>
            <button type="button" className={`filter-chip${style === 'medallion' ? ' selected' : ''}`} aria-pressed={style === 'medallion'} onClick={() => setStyle('medallion')}>AA Medallion</button>
          </div>

          <RecoveryMilestoneCanvas key={`${milestone.id}-${style}`} milestone={milestone} style={style} reducedMotion={preferences.reducedMotion} />
          <p className="current-token-disclaimer">This is a virtual personal rendering based on the supplied AA and NA designs. It is not an official AA/NA-issued token and does not imply endorsement by either fellowship.</p>
          <p className="current-token-disclosure"><Rotate3D size={15} aria-hidden="true" /> Drag to turn the canvas token, or use its spin/flip/reset controls. Only the token form changes; the milestone timeline remains fixed.</p>
        </section>
      ) : (
        <section className="current-token-empty" aria-labelledby="current-token-empty-title">
          <Award size={28} aria-hidden="true" />
          <div className="current-token-counter current-token-counter--small" aria-label={`${duration.days} days on the local counter`}>
            <strong>{duration.days}</strong><span>{duration.days === 1 ? 'day' : 'days'}</span>
          </div>
          <h2 id="current-token-empty-title">No timed milestone reached yet</h2>
          <p>Your first token appears when the existing counter reaches 24 hours. Until then, this tab leaves the canvas empty rather than previewing an upcoming token.</p>
        </section>
      )}
    </div>
  );
}
