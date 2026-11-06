import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Settings2 } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { TraditionMotif } from '../../components/TraditionMotif';
import { db } from '../../db/database';
import { awardEligibleCharms } from '../../db/achievements';
import { returnedAfterActivityBreak, updateDailyActivity } from '../../db/repository';
import { selectDailyReading } from '../../domain/daily-reading';
import { RECOVERY_THEME_LABELS, traditionInfo } from '../../domain/traditions';

interface DailyReadingCardProps {
  date: Date;
  daysInRecovery: number;
}

const KIND_LABEL = { verbatim: 'Reading', paraphrase: 'Paraphrase', original: 'Original reflection' } as const;

/** Today's reading from the tradition(s) the person chose, with its source, translation and license shown openly. */
export function DailyReadingCard({ date, daysInRecovery }: DailyReadingCardProps) {
  const { preferences, notify } = useAppContext();
  const { entry, tradition, why } = selectDailyReading(date, preferences?.traditionPreference);
  const info = traditionInfo(tradition);
  const activityId = `scripture:${entry.id}`;
  const activity = useLiveQuery(() => db.scriptureActivity.get(activityId), [activityId]);
  const discreet = preferences?.discreetMode ?? false;

  async function record(favorite: boolean) {
    const existing = await db.scriptureActivity.get(activityId);
    await db.scriptureActivity.put({
      id: activityId, scriptureId: entry.id,
      favorite: favorite ? !existing?.favorite : (existing?.favorite ?? false),
      exploredAt: existing?.exploredAt ?? new Date().toISOString(),
    });
    if (!existing) await updateDailyActivity({ scriptureExplored: 1 }, true);
    await awardEligibleCharms(daysInRecovery, await returnedAfterActivityBreak());
    notify(favorite ? (existing?.favorite ? 'Removed from saved readings.' : 'Saved with your readings.') : 'Reading noted for your journey.');
  }

  const headingId = 'daily-reading-heading';
  return (
    <section className={`card daily-reading-card tradition-${tradition}`} aria-labelledby={headingId}>
      <div className="card-header">
        <div className="daily-reading-title">
          <TraditionMotif tradition={tradition} className="daily-reading-motif" />
          <div><p className="eyebrow tradition-eyebrow">{info.label} · {KIND_LABEL[entry.kind]}</p><h2 id={headingId}>A READING FOR THE JOURNEY</h2></div>
        </div>
        <button className="icon-button" aria-label={activity?.favorite ? 'Remove reading from saved items' : 'Save reading'} onClick={() => void record(true)}><Heart size={18} fill={activity?.favorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      </div>
      <span className="pill tradition-pill">{RECOVERY_THEME_LABELS[entry.recoveryTheme]}</span>
      {entry.kind === 'verbatim'
        ? <blockquote className="reading-text"><p>“{entry.text}”</p></blockquote>
        : <p className="reading-text reading-text-original">{entry.text}</p>}
      <p className="reading-citation"><strong>{entry.citation}</strong><span aria-hidden="true"> · </span><span className="reading-credit">{entry.translation}</span></p>
      {entry.context && <p className="reading-context">{entry.context}</p>}
      {entry.inspiredBy && <p className="reading-inspired">Inspired by the teachings of {entry.inspiredBy}. These are not their words.</p>}
      {entry.furtherReading?.length ? <p className="reading-further"><span>Further reading:</span> {entry.furtherReading.map((title, index) => <span key={title}><cite>{title}</cite>{index < entry.furtherReading!.length - 1 ? ', ' : ''}</span>)}</p> : null}
      <div className="principle-callout reading-prompt"><span>TO CARRY WITH YOU</span><strong>{entry.reflectionPrompt}</strong></div>
      {entry.closing && <p className="contemplation"><em>{entry.closing}</em></p>}
      <p className="reading-why"><span>Why this reading</span>{discreet ? 'Chosen for today from the readings you selected.' : why}</p>
      {info.note && <p className="tradition-note" role="note">{info.note}</p>}
      <details className="reading-license"><summary>Source &amp; license</summary><p>{entry.source}. {entry.licenseNote}</p></details>
      <div className="action-row">
        <button className="button button-secondary" onClick={() => void record(false)}><BookOpen size={16} aria-hidden="true" /> {activity ? 'Revisit this reading' : 'Mark as explored'}</button>
        <Link className="button button-quiet" to="/settings#daily-readings"><Settings2 size={16} aria-hidden="true" /> Change tradition</Link>
      </div>
      <p className="fine-print">Faith and reflection are a source of encouragement for some. They are not a measure of worth or a replacement for professional or peer support.</p>
    </section>
  );
}
