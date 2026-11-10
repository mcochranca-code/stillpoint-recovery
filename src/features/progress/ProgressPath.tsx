import { Link } from 'react-router-dom';
import { ArrowRight, Footprints } from 'lucide-react';
import { PRACTICE_LABELS, describePracticeDay, practiceWeek, progressPath, type PracticeKind } from '../../domain/progress-path';
import { formatLocalDate } from '../../domain/time';
import type { DailyActivity } from '../../domain/types';

const KINDS: PracticeKind[] = ['meditation', 'journal', 'reflection'];
const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

interface ProgressPathProps {
  startAt?: string | null;
  localStartDate?: string | null;
  discreet?: boolean;
  /** Daily activity rows covering at least the last seven days. */
  weekActivities: readonly DailyActivity[];
  includeScripture?: boolean;
  totals: { meditationMinutes: number; journalEntries: number; reflections: number };
  now?: number;
}

/**
 * A path from the chosen start date to the next milestone, and a week of practice shown as
 * presence dots. Nothing here can "break": a quiet day is just a quiet day, and changing the
 * start date simply redraws the path. Every visual has a text equivalent.
 */
export function ProgressPath({ startAt, localStartDate, discreet = false, weekActivities, includeScripture = false, totals, now = Date.now() }: ProgressPathProps) {
  const path = progressPath(startAt, now);
  const week = practiceWeek(weekActivities, new Date(now), includeScripture);
  const anyThisWeek = week.some((day) => KINDS.some((kind) => day.practices[kind]));
  const anyEver = totals.meditationMinutes + totals.journalEntries + totals.reflections > 0;

  if (!path && !anyThisWeek && !anyEver) {
    return (
      <section className="card progress-path-card progress-path-empty" aria-labelledby="progress-path-empty-title">
        <svg className="progress-path-empty__art" viewBox="0 0 240 90" aria-hidden="true" focusable="false">
          <path className="trail" d="M10 78 C 60 70, 70 44, 120 46 S 190 24, 230 14" />
          <circle className="trail-start" cx="10" cy="78" r="6" />
          <circle className="trail-dot" cx="120" cy="46" r="3" /><circle className="trail-dot" cx="175" cy="31" r="3" /><circle className="trail-dot" cx="230" cy="14" r="3" />
        </svg>
        <div>
          <p className="eyebrow">Walked at your own pace</p>
          <h2 id="progress-path-empty-title">Your path starts here</h2>
          <p className="muted">Add a start date whenever a counter feels useful, and the path to your next milestone appears here. There is nothing to keep up.</p>
          <Link className="button button-primary" to="/"><Footprints size={16} aria-hidden="true" /> Set a start date</Link>
        </div>
      </section>
    );
  }

  const summary = !path ? 'No start date yet.'
    : discreet ? 'Timeline details are hidden while discreet display is on.'
    : path.next ? `${path.daysAlong} ${path.daysAlong === 1 ? 'day' : 'days'} along, about ${path.next.daysToGo} ${path.next.daysToGo === 1 ? 'day' : 'days'} to ${path.next.label}.`
    : `${path.daysAlong} days along.`;
  const totalsLine = [
    totals.meditationMinutes ? `${totals.meditationMinutes} meditation ${totals.meditationMinutes === 1 ? 'minute' : 'minutes'}` : '',
    totals.journalEntries ? `${totals.journalEntries} journal ${totals.journalEntries === 1 ? 'entry' : 'entries'}` : '',
    totals.reflections ? `${totals.reflections} ${totals.reflections === 1 ? 'reflection' : 'reflections'}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <section className="card progress-path-card" aria-labelledby="progress-path-title">
      <div className="card-header"><div><p className="eyebrow">Walked at your own pace</p><h2 id="progress-path-title">Your path</h2><p>{summary}</p></div></div>
      {path ? <>
        <div
          className={`progress-path${discreet ? ' is-discreet' : ''}${path.todayFraction < 0.18 ? ' is-near-start' : path.todayFraction > 0.82 ? ' is-near-end' : ''}`}
          role="img"
          aria-label={discreet ? 'Your path. Details hidden in discreet mode.' : `Your path from your start date${localStartDate || startAt ? `, ${formatLocalDate(localStartDate ?? startAt!)}` : ''}, to ${path.next ? `the ${path.next.label} milestone on ${formatLocalDate(path.next.at)}` : 'today'}. ${summary}${path.reached.length ? ` Milestones along the way: ${path.reached.map((point) => point.label).join(', ')}.` : ''}`}
          style={{ '--path-today': pct(path.todayFraction) } as React.CSSProperties}
        >
          <span className="progress-path__track" aria-hidden="true" />
          <span className="progress-path__walked" aria-hidden="true" />
          {!discreet && path.reached.map((point) => <span key={point.label} className="progress-path__milestone" style={{ left: pct(point.fraction) }} aria-hidden="true" title={point.label} />)}
          <span className="progress-path__today" aria-hidden="true"><span>{discreet ? 'Today' : `Today · day ${path.daysAlong}`}</span></span>
          <span className="progress-path__goal" aria-hidden="true" />
        </div>
        {!discreet && <div className="progress-path__ends" aria-hidden="true"><span>Start · {formatLocalDate(localStartDate ?? startAt!, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span>{path.next ? `${path.next.label} · ${formatLocalDate(path.next.at, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Every day is a milestone'}</span></div>}
      </> : <p className="fine-print">Add a start date on Today whenever a counter feels useful; your path will appear here.</p>}

      <div className="practice-week-wrap">
        <h3 id="practice-week-title">This week’s practice</h3>
        <ol className="practice-week" aria-labelledby="practice-week-title">
          {week.map((day) => (
            <li key={day.key} className={day.isToday ? 'is-today' : undefined}>
              <span className="sr-only">{describePracticeDay(day)}</span>
              <span className="practice-week__dots" aria-hidden="true">{KINDS.map((kind) => <i key={kind} className={`practice-dot practice-dot--${kind}${day.practices[kind] ? ' is-present' : ''}`} />)}</span>
              <span className="practice-week__day" aria-hidden="true">{day.isToday ? 'Today' : day.shortLabel}</span>
            </li>
          ))}
        </ol>
        <p className="practice-legend" aria-hidden="true">{KINDS.map((kind) => <span key={kind}><i className={`practice-dot practice-dot--${kind} is-present`} /> {PRACTICE_LABELS[kind]}</span>)}</p>
        <p className="fine-print">{anyThisWeek ? 'A dot means you made room for it that day. Quiet days are part of the path too.' : 'Nothing recorded this week, and nothing to keep up. A dot appears on any day you meditate, write or reflect.'}{totalsLine ? ` So far: ${totalsLine}.` : ''}</p>
        {path && <Link to="/" className="inline-link">{discreet ? 'Open Today' : 'Adjust date on Today'} <ArrowRight size={14} aria-hidden="true" /></Link>}
      </div>
    </section>
  );
}
