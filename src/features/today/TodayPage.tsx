import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bookmark, BookOpen, CalendarDays, Check, Clock3, EyeOff, Heart, Leaf, Settings2, Volume2, Wind } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { useDialogFocus } from '../../app/useDialogFocus';
import { AmbientAudioPlayer } from '../../components/AmbientAudioPlayer';
import { CharmMedallion } from '../../components/CharmMedallion';
import { NaDailyReadingCard } from './NaDailyReadingCard';
import { OdbResourcesCard } from './OdbResourcesCard';
import { CURRENT_SCHEMA_VERSION, db } from '../../db/database';
import { awardEligibleCharms } from '../../db/achievements';
import { syncReachedMilestones } from '../../db/milestones';
import { returnedAfterActivityBreak, updateDailyActivity } from '../../db/repository';
import { scriptureEntries } from '../../data/scripture';
import { charmDefinitions } from '../../data/charms';
import { getDailyReflection } from '../../data/reflections';
import { createReflectionJournalEntry } from '../../domain/journal';
import { dateOnlyToTimestamp, elapsedParts, formatLocalDate, localDateKey, nextMilestone } from '../../domain/time';

function dayNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/** Render today's reflection, optional recovery counter, and next-step resources. */
export function TodayPage() {
  const { profile, preferences, notify, updatePreferences } = useAppContext();
  const [now, setNow] = useState(() => Date.now());
  const [dateDialog, setDateDialog] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('00:00');
  const [keepHistory, setKeepHistory] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [comebackOpen, setComebackOpen] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const dateDialogFocusRef = useDialogFocus<HTMLElement>(dateDialog, () => setDateDialog(false));
  const comebackFocusRef = useDialogFocus<HTMLElement>(comebackOpen, () => setComebackOpen(false));
  const navigate = useNavigate();
  const today = localDateKey(new Date(now));
  const reflection = getDailyReflection(new Date(now));
  const scripture = scriptureEntries[dayNumber(new Date(now)) % scriptureEntries.length] ?? scriptureEntries[0]!;
  const reflectionActivity = useLiveQuery(() => db.dailyReflections.get(`reflection:${today}:${reflection.id}`), [today, reflection.id]);
  const scriptureActivity = useLiveQuery(() => db.scriptureActivity.get(`scripture:${scripture.id}`), [scripture.id]);
  const recentCharms = useLiveQuery(() => db.earnedCharms.orderBy('earnedAt').reverse().limit(3).toArray(), []);
  const recentHistory = useLiveQuery(() => db.recoveryDateHistory.orderBy('recordedAt').reverse().limit(4).toArray(), []);
  const parts = elapsedParts(profile?.startAt, now);
  const next = nextMilestone(profile?.startAt ?? null, now);
  const milestones = useMemo(() => profile?.startAt ? (awaitMilestones(profile.startAt)) : [], [profile?.startAt]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!profile?.startAt) return;
    let timer: number | undefined;
    let alive = true;
    const synchronize = async () => {
      const newRecords = await syncReachedMilestones(profile.startAt!);
      const synchronizationTime = Date.now();
      const fresh = newRecords.filter((record) => synchronizationTime - new Date(record.reachedAt).getTime() < 10 * 60 * 1000);
      if (fresh.length) notify(`A milestone reached: ${fresh[fresh.length - 1]?.label}. Take a moment to recognize what this day means to you.`);
      const duration = elapsedParts(profile.startAt);
      const awards = await awardEligibleCharms(duration?.days ?? 0);
      if (awards.length) notify(`A Journey Collection charm is now yours: ${awards.map((award) => award.charmId.replaceAll('-', ' ')).join(', ')}.`);
    };
    const scheduleNextMilestone = () => {
      const upcoming = nextMilestone(profile.startAt!, Date.now());
      if (!upcoming) return;
      timer = window.setTimeout(() => {
        void synchronize();
        if (alive) scheduleNextMilestone();
      }, Math.max(1000, upcoming.at.getTime() - Date.now() + 1000));
    };
    const onVisibilityChange = () => {
      if (!document.hidden) void synchronize();
    };
    void synchronize();
    scheduleNextMilestone();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      alive = false;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [profile?.startAt, notify]);

  const previous = milestones.filter((item) => item.at.getTime() <= now).at(-1);
  const progress = next ? Math.max(0, Math.min(100, Math.round(((now - (previous?.at.getTime() ?? new Date(profile?.startAt ?? now).getTime())) / (next.at.getTime() - (previous?.at.getTime() ?? new Date(profile?.startAt ?? now).getTime()))) * 100))) : 100;
  const nextLabel = next ? `Next milestone · ${next.label}` : 'Every day is a milestone';
  const nextIn = next ? Math.max(0, next.at.getTime() - now) : 0;
  const nextHours = Math.floor(nextIn / 3600000);
  const nextDays = Math.floor(nextHours / 24);
  const nextRemainder = nextHours % 24;

  async function saveRecoveryDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDate) { notify('Choose a date, or close this window and continue without one.'); return; }
    if (editDate > localDateKey(new Date())) { notify('Choose today or an earlier date. You can adjust your date whenever you need.'); return; }
    setSavingDate(true);
    try {
      const nextStart = dateOnlyToTimestamp(editDate, editTime || '00:00');
      const previousStart = profile?.startAt ?? null;
      if (keepHistory && previousStart) {
        await db.recoveryDateHistory.add({
          id: `date-change:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          previousStartAt: previousStart, nextStartAt: nextStart, recordedAt: new Date().toISOString(),
        });
      }
      await db.recoveryProfiles.put({
        id: 'recovery-profile', schemaVersion: CURRENT_SCHEMA_VERSION, startAt: nextStart,
        localStartDate: editDate, localStartTime: editTime || '00:00',
        startTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        focus: profile?.focus ?? '', intention: profile?.intention ?? '', updatedAt: new Date().toISOString(),
      });
      const duration = elapsedParts(nextStart);
      const awards = await awardEligibleCharms(duration?.days ?? 0);
      await syncReachedMilestones(nextStart);
      setDateDialog(false);
      if (previousStart && previousStart !== nextStart) setComebackOpen(true);
      notify(awards.length ? 'Your date is updated. The Journey Collection and your saved history remain yours.' : 'Your recovery date is updated. Your saved entries, sessions and charms remain yours.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The date could not be saved. Please try again.');
    } finally { setSavingDate(false); }
  }

  async function reflectToday() {
    const id = `reflection:${today}:${reflection.id}`;
    const existing = await db.dailyReflections.get(id);
    const favorite = existing?.favorite ?? false;
    await db.dailyReflections.put({ id, localDate: today, reflectionId: reflection.id, reflectedAt: existing?.reflectedAt ?? new Date().toISOString(), favorite, favoriteKey: favorite ? 1 : 0, exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    if (!existing?.reflectedAt) await updateDailyActivity({ reflectionsCompleted: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0, await returnedAfterActivityBreak());
    notify('Reflection marked for today. You can return to it whenever you like.');
  }

  async function saveReflectionToJournal() {
    const entry = createReflectionJournalEntry(reflection);
    await db.journalEntries.add(entry);
    await updateDailyActivity({ journalEntries: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0, await returnedAfterActivityBreak());
    notify('Saved to your private journal on this device.');
  }

  async function toggleReflectionFavorite() {
    const id = `reflection:${today}:${reflection.id}`;
    const existing = await db.dailyReflections.get(id);
    const favorite = !existing?.favorite;
    await db.dailyReflections.put({ id, localDate: today, reflectionId: reflection.id, favorite, favoriteKey: favorite ? 1 : 0, reflectedAt: existing?.reflectedAt, exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    notify(existing?.favorite ? 'Removed from saved reflections.' : 'Saved with your reflections.');
  }

  async function exploreScripture(favorite = false) {
    const id = `scripture:${scripture.id}`;
    const existing = await db.scriptureActivity.get(id);
    const isFavorite = favorite ? !existing?.favorite : (existing?.favorite ?? false);
    await db.scriptureActivity.put({ id, scriptureId: scripture.id, favorite: isFavorite, favoriteKey: isFavorite ? 1 : 0, exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    if (!existing) await updateDailyActivity({ scriptureExplored: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0, await returnedAfterActivityBreak());
    notify(favorite ? (existing?.favorite ? 'Removed from scripture favorites.' : 'Saved to scripture favorites.') : 'Scripture reflection noted for your journey.');
  }

  function speakReflection() {
    if (!('speechSynthesis' in window)) { notify('Text-to-speech is not available in this browser.'); return; }
    if (spoken) { window.speechSynthesis.cancel(); setSpoken(false); return; }
    const utterance = new SpeechSynthesisUtterance(`${reflection.title}. ${reflection.reading}. ${reflection.practice}`);
    utterance.onend = () => setSpoken(false);
    window.speechSynthesis.speak(utterance);
    setSpoken(true);
  }

  const discreet = preferences?.discreetMode ?? false;
  function openNextSupport(path: string) { setComebackOpen(false); navigate(path); }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div><p className="eyebrow">{discreet ? 'A private space' : new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>A little space for today.</h1><p>There’s no perfect way through—only the next kind step.</p></div>
        <div className="today-header-actions">{discreet && <button className="button button-secondary" onClick={() => void updatePreferences({ discreetMode: false })}><EyeOff size={15} /> Show private details</button>}<Link to="/reset" className="button button-secondary"><Wind size={16} /> I need a moment</Link><Link to="/settings" className="icon-button" aria-label="Open settings"><Settings2 size={18} /></Link></div>
      </header>

      <section className="card sobriety-card sobriety-hero" aria-labelledby="sobriety-heading">
        <div className="sobriety-copy">
          <p className="eyebrow">{discreet ? 'Your private space' : 'Your recovery, your pace'}</p>
          <h2 id="sobriety-heading" className={discreet ? 'sensitive-heading' : ''}>{discreet ? 'Private timer' : parts ? 'Time you have chosen for yourself' : 'A date, if and when it helps'}</h2>
          <RecoveryDuration
            startAt={profile?.startAt}
            localStartDate={profile?.localStartDate}
            discreet={discreet}
            liveCounter={Boolean(preferences?.liveCounter)}
            counterStyle={preferences?.counterStyle ?? 'full'}
          />
          <button className="button button-secondary" onClick={() => { setEditDate(profile?.localStartDate ?? localDateKey(new Date())); setEditTime(profile?.localStartTime ?? '00:00'); setDateDialog(true); }}><CalendarDays size={16} /> {discreet ? 'Review private date' : parts ? 'Adjust recovery date' : 'Set a recovery date'}</button>
        </div>
        <div className="sobriety-progress" aria-label={discreet ? 'Recovery timer and milestone details are hidden' : next ? `${progress}% progress toward ${next.label}` : 'Milestone overview'}>
          {discreet ? <div className="progress-ring"><span><EyeOff size={20} /><small>hidden</small></span></div> : <>
          <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{parts ? `${progress}%` : '—'}</strong><small>to milestone</small></span>
          </div>
          <div className="milestone-copy"><strong>{parts ? nextLabel : 'Your next step is enough'}</strong><small>{parts && next ? (nextDays ? `About ${nextDays}d ${nextRemainder}h to go` : `About ${nextHours}h to go`) : 'Set a date whenever it feels right'}</small></div>
          </>}
        </div>
      </section>

      <section className="card today-charms-card" aria-labelledby="today-charms-heading">
        <div className="today-charms-copy">
          <p className="eyebrow">The Journey Collection</p>
          <h2 id="today-charms-heading">Small signs of care, collected along the way.</h2>
          <p>Virtual 3D charms mark recovery-supportive moments. Tap, click, or keyboard-activate a medallion to spin it; your collection stays on this device.</p>
          <Link to="/charms" className="button button-secondary">Explore and spin the charms <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className="today-charms-preview" aria-label="Preview of Journey Collection charms">
          {(recentCharms?.length ? recentCharms.map((award) => charmDefinitions.find((item) => item.id === award.charmId)).filter((item): item is (typeof charmDefinitions)[number] => Boolean(item)) : charmDefinitions.slice(0, 3)).map((charm) => {
            const collected = Boolean(recentCharms?.some((award) => award.charmId === charm.id));
            return <div className="today-charm" key={charm.id}><CharmMedallion name={charm.name} image={charm.image} locked={!collected} /><strong>{charm.name}</strong><small>{collected ? 'Collected' : 'A moment to work toward'}</small></div>;
          })}
        </div>
      </section>

      <NaDailyReadingCard />
      <OdbResourcesCard />

      <div className="today-grid">
        <section className="card reflection-card" aria-labelledby="reflection-heading">
          <div className="card-header"><div><p className="eyebrow">An original daily recovery reflection</p><h2 id="reflection-heading">TODAY’S STILLPOINT REFLECTION</h2></div><button className="icon-button" aria-label={reflectionActivity?.favorite ? 'Remove reflection from saved items' : 'Save reflection'} onClick={() => void toggleReflectionFavorite()}><Bookmark size={18} fill={reflectionActivity?.favorite ? 'currentColor' : 'none'} /></button></div>
          <div className="reflection-art" aria-hidden="true"><img src="/assets/backgrounds/sunrise-hills.svg" alt="" /><span>{reflection.theme}</span></div>
          <h3 className="reflection-title">{reflection.title}</h3>
          <p id="original-reflection-reading" aria-hidden={!reflectionExpanded} className={`reflection-reading${reflectionExpanded ? '' : ' is-collapsed'}`}>{reflection.reading}</p>
          <button className="text-button reflection-expand" aria-expanded={reflectionExpanded} aria-controls="original-reflection-reading" onClick={() => setReflectionExpanded((expanded) => !expanded)}>{reflectionExpanded ? 'Show less' : 'Read full original reflection'}</button>
          <div className="principle-callout"><span>ONE PRINCIPLE</span><strong>{reflection.principle}</strong></div>
          <div className="reflection-details"><p><strong>For today</strong>{reflection.practice}</p><p><strong>A question to carry</strong>{reflection.question}</p></div>
          <div className="action-row">
            <button className="button button-primary" onClick={() => void reflectToday()}>{reflectionActivity?.reflectedAt ? <><Check size={16} /> Reflected today</> : 'Mark as reflected'}</button>
            <button className="button button-secondary" onClick={() => void saveReflectionToJournal()}><BookOpen size={16} /> Save to journal</button>
            <button className="icon-button" onClick={speakReflection} aria-label={spoken ? 'Stop reading reflection aloud' : 'Read reflection aloud'} title="Read aloud"><Volume2 size={17} className={spoken ? 'icon-on' : ''} /></button>
          </div>
          <details className="reflection-ambient-details"><summary><Volume2 size={15} aria-hidden="true" /> Optional ambient soundscape</summary><AmbientAudioPlayer context="reflection" /></details>
          <p className="content-integrity">Original reflection inspired by the one-day-at-a-time principle; not affiliated with a recovery fellowship.</p>
        </section>

        <section className="card scripture-card" aria-labelledby="scripture-heading">
          <div className="card-header"><div><p className="eyebrow">Optional encouragement for the journey</p><h2 id="scripture-heading">SCRIPTURE FOR THE JOURNEY</h2></div><button className="icon-button" aria-label={scriptureActivity?.favorite ? 'Remove scripture from favorites' : 'Save scripture'} onClick={() => void exploreScripture(true)}><Heart size={18} fill={scriptureActivity?.favorite ? 'currentColor' : 'none'} /></button></div>
          <span className="pill pill-sage">{scripture.principle}</span>
          <blockquote className="scripture-verse">“{scripture.verse}”</blockquote>
          <p className="scripture-ref">{scripture.reference} <span>·</span> {scripture.translation}</p>
          <p className="scripture-explanation">{scripture.explanation}</p>
          <div className="principle-callout"><span>A SMALL PRACTICE</span><strong>{scripture.application}</strong></div>
          {scripture.contemplation && <p className="contemplation"><em>{scripture.contemplation}</em></p>}
          <p className="fine-print">Faith is a source of encouragement for some. It is not a measure of worth or a replacement for professional or peer support.</p>
          <button className="button button-secondary" onClick={() => void exploreScripture(false)}><BookOpen size={16} /> {scriptureActivity ? 'Revisit this passage' : 'Mark as explored'}</button>
        </section>
      </div>

      <section className="quick-actions" aria-label="Quick actions">
        <Link className="quick-action" to="/reset"><span className="quick-icon"><Wind size={20} /></span><span><strong>I need a moment</strong><small>A short pause and a choice for what’s next</small></span><ArrowRight size={17} /></Link>
        <Link className="quick-action" to="/journal"><span className="quick-icon"><BookOpen size={20} /></span><span><strong>Write a few lines</strong><small>Your journal stays on this device</small></span><ArrowRight size={17} /></Link>
        <Link className="quick-action" to="/meditation"><span className="quick-icon"><Heart size={20} /></span><span><strong>Take a quiet pause</strong><small>Gentle breathing and grounding</small></span><ArrowRight size={17} /></Link>
        <Link className="quick-action" to="/garden"><span className="quick-icon"><Leaf size={20} /></span><span><strong>Visit your garden</strong><small>Growth without a streak</small></span><ArrowRight size={17} /></Link>
        <Link className="quick-action" to="/progress"><span className="quick-icon"><Clock3 size={20} /></span><span><strong>Notice your journey</strong><small>See activities and milestones</small></span><ArrowRight size={17} /></Link>
      </section>

      <AnimatePresence>{dateDialog && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setDateDialog(false); }}>
        <motion.section ref={dateDialogFocusRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="date-dialog-title" className="dialog-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header"><div><p className="eyebrow">A private choice</p><h2 id="date-dialog-title">Recovery date</h2></div><button className="icon-button" onClick={() => setDateDialog(false)} aria-label="Close date editor">×</button></div>
          <p className="fine-print">Change the date to reflect your path as you understand it today. Nothing else is erased—your journals, sessions and charms remain saved.</p>
          <form onSubmit={(event) => void saveRecoveryDate(event)}>
            <label className="field-label" htmlFor="adjust-date">Start date</label><input id="adjust-date" type="date" max={localDateKey(new Date())} required value={editDate} onChange={(event) => setEditDate(event.target.value)} />
            <label className="field-label" htmlFor="adjust-time">Optional start time</label><input id="adjust-time" type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} />
            <label className="toggle-row history-toggle"><span><strong>Keep a local date-change record</strong><small>Off by default; saved only if you choose it</small></span><input type="checkbox" checked={keepHistory} onChange={(event) => setKeepHistory(event.target.checked)} /></label>
            <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={() => setDateDialog(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={savingDate}>{savingDate ? 'Saving…' : 'Save date'}</button></div>
          </form>
        </motion.section>
      </motion.div>}</AnimatePresence>

      <AnimatePresence>{comebackOpen && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section ref={comebackFocusRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="comeback-title" className="dialog-card comeback-dialog" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="card-header"><div><p className="eyebrow">A new moment, with your history intact</p><h2 id="comeback-title">What support would feel helpful now?</h2></div><button className="icon-button" onClick={() => setComebackOpen(false)} aria-label="Close support choices">×</button></div><p className="muted">Changing a date does not erase your journals, sessions, or collected charms. There is no broken streak here—just choices for the next manageable step.</p><div className="comeback-choices"><button className="button button-secondary" onClick={() => openNextSupport('/reset')}><Wind size={16} /> Take a moment</button><button className="button button-secondary" onClick={() => openNextSupport('/journal')}><BookOpen size={16} /> Write a few lines</button><button className="button button-secondary" onClick={() => openNextSupport('/field-guide')}><Heart size={16} /> Review trusted support</button><button className="button button-quiet" onClick={() => setComebackOpen(false)}>Skip for now</button></div></motion.section></motion.div>}</AnimatePresence>

      {!!recentHistory?.length && <section className="sr-only" aria-label="Recent recorded recovery-date changes">{recentHistory.map((entry) => <p key={entry.id}>{formatLocalDate(entry.recordedAt)} date change recorded locally</p>)}</section>}
    </div>
  );
}

function RecoveryDuration({
  startAt,
  localStartDate,
  discreet,
  liveCounter,
  counterStyle,
}: {
  startAt: string | null | undefined;
  localStartDate: string | null | undefined;
  discreet: boolean;
  liveCounter: boolean;
  counterStyle: 'days' | 'full';
}) {
  const [now, setNow] = useState(() => Date.now());
  const parts = elapsedParts(startAt, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), liveCounter ? 1000 : 60000);
    return () => window.clearInterval(timer);
  }, [liveCounter]);

  if (discreet) return <p className="timer-caption">Recovery details are hidden from this view. You can reveal them only when you choose.</p>;
  if (!parts) return <><div className="counter-placeholder"><strong>—</strong><span>days in recovery</span></div><p className="timer-caption">Your dashboard is ready without a date. Add one later, if a counter feels useful.</p></>;

  return <>
    <div className="sobriety-duration" aria-label={`${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes${liveCounter ? `, ${parts.seconds} seconds` : ''} elapsed`}>
      <span className="counter-primary sensitive-exact"><strong className="counter-days">{parts.days}</strong><span className="counter-days-label">{parts.days === 1 ? 'day' : 'days'} in recovery</span></span>
      {counterStyle !== 'days' && <span className="counter-subunits sensitive-exact" aria-hidden="true"><span><strong>{String(parts.hours).padStart(2, '0')}</strong><small>hours</small></span><span><strong>{String(parts.minutes).padStart(2, '0')}</strong><small>minutes</small></span>{liveCounter && <span><strong className="seconds-value">{String(parts.seconds).padStart(2, '0')}</strong><small>seconds</small></span>}</span>}
    </div>
    <p className="timer-caption">Since {formatLocalDate(localStartDate ?? startAt ?? '')}. A measure of time—not a measure of your worth.</p>
  </>;
}

function awaitMilestones(startAt: string) {
  const start = new Date(startAt);
  const result = [] as Array<{ id: string; label: string; at: Date }>;
  for (const month of [6, 9, 12, 18, 24, ...Array.from({ length: 50 }, (_, index) => 36 + index * 12)]) {
    const at = new Date(start);
    const day = at.getDate();
    at.setDate(1); at.setMonth(at.getMonth() + month);
    at.setDate(Math.min(day, new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate()));
    result.push({ id: `calendar-${month}`, label: month === 12 ? '1 year' : month % 12 === 0 ? `${month / 12} years` : `${month} months`, at });
  }
  return result;
}
