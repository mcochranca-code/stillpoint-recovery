import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CalendarDays, CircleCheck, Plus, Share2, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../app/AppContext';
import { CharmGallery } from '../../components/CharmGallery';
import { MilestoneShareDialog, type MilestoneShareTarget } from '../../components/MilestoneShareDialog';
import { db } from '../../db/database';
import { elapsedParts, formatLocalDate, localDateKey, nextMilestone, periodStart } from '../../domain/time';
import type { DailyActivity, PersonalGoal, PersonalMilestone } from '../../domain/types';

const filters = [{ days: 7 as const, label: 'Week' }, { days: 30 as const, label: 'Month' }, { days: 365 as const, label: 'Year' }];
const EMPTY_ACTIVITIES: DailyActivity[] = [];
const EMPTY_PERSONAL_MILESTONES: PersonalMilestone[] = [];

/** Render activity history, personal goals, milestones, and earned charms. */
export function ProgressPage() {
  const { profile, preferences, notify } = useAppContext();
  const [period, setPeriod] = useState<7 | 30 | 365>(7);
  const [showCollection, setShowCollection] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('3');
  const [goalUnit, setGoalUnit] = useState('quiet pauses');
  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [milestoneDays, setMilestoneDays] = useState('30');
  const [shareTarget, setShareTarget] = useState<MilestoneShareTarget | null>(null);
  const [now, setNow] = useState(Date.now());
  const periodBegin = periodStart(new Date(now), period);
  const activitySince = localDateKey(periodBegin);
  const activities = useLiveQuery(() => db.dailyActivity.where('localDate').aboveOrEqual(activitySince).toArray(), [activitySince]) ?? EMPTY_ACTIVITIES;
  const sessions = useLiveQuery(() => db.meditationSessions.where('status').equals('completed').toArray(), []) ?? [];
  const journalCount = useLiveQuery(() => db.journalEntries.count(), []) ?? 0;
  const reflections = useLiveQuery(() => db.dailyReflections.toArray(), []) ?? [];
  const scripture = useLiveQuery(() => db.scriptureActivity.toArray(), []) ?? [];
  const awards = useLiveQuery(() => db.earnedCharms.toArray(), []) ?? [];
  const milestones = useLiveQuery(() => db.milestoneRecords.orderBy('reachedAt').toArray(), []) ?? [];
  const changes = useLiveQuery(() => db.recoveryDateHistory.orderBy('recordedAt').toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.personalGoals.toArray(), []) ?? [];
  const personalMilestones = useLiveQuery(() => db.personalMilestones.orderBy('daysAfterStart').toArray(), []) ?? EMPTY_PERSONAL_MILESTONES;
  const duration = elapsedParts(profile?.startAt, now);
  const durationDays = duration?.days;
  const next = nextMilestone(profile?.startAt ?? null, now);
  const meditationMinutes = sessions.reduce((sum, session) => sum + session.plannedMinutes, 0);
  const completedSessions = sessions.length;
  const reflectionCount = new Set(reflections.filter((item) => item.reflectedAt).map((item) => item.reflectionId)).size;
  const scriptureCount = new Set(scripture.map((item) => item.scriptureId)).size;
  const chartRows = useMemo(() => {
    const count = period === 7 ? 7 : period === 30 ? 30 : 12;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date();
      if (period === 365) date.setMonth(date.getMonth() - (count - 1 - index));
      else date.setDate(date.getDate() - (count - 1 - index));
      const key = period === 365 ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : localDateKey(date);
      const matching = period === 365
        ? activities.filter((item) => item.localDate.startsWith(key))
        : activities.filter((item) => item.localDate === key);
      const value = matching.reduce((sum, row) => sum + row.reflectionsCompleted + row.scriptureExplored + row.journalEntries + row.meditationMinutes, 0);
      const label = period === 365 ? date.toLocaleDateString(undefined, { month: 'short' }) : date.toLocaleDateString(undefined, { weekday: 'short' });
      return { key, label, value };
    });
  }, [period, activities]);
  const maxValue = Math.max(1, ...chartRows.map((row) => row.value));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile?.startAt || durationDays === undefined) return;
    const candidates = personalMilestones.filter((item) => !item.achievedAt && durationDays >= item.daysAfterStart);
    if (!candidates.length) return;
    void db.transaction('rw', db.personalMilestones, async () => {
      let reached = 0;
      for (const candidate of candidates) {
        const current = await db.personalMilestones.get(candidate.id);
        if (current && !current.achievedAt && durationDays >= current.daysAfterStart) {
          await db.personalMilestones.update(current.id, { achievedAt: new Date(now).toISOString() });
          reached += 1;
        }
      }
      return reached;
    }).then((reached) => {
      if (reached) notify(`A personal milestone is reached: ${candidates.map((item) => item.label).join(', ')}. Your progress belongs to you.`);
    }).catch(() => notify('A reached personal milestone could not be saved. Check browser storage and try again.'));
  }, [profile?.startAt, durationDays, personalMilestones, now, notify]);

  async function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    const target = Number(goalTarget);
    if (!title || !Number.isFinite(target) || target < 1) { notify('Give your personal goal a name and a target greater than zero.'); return; }
    const goal: PersonalGoal = { id: `goal:${crypto.randomUUID()}`, title, target, current: 0, unit: goalUnit.trim() || 'steps', createdAt: new Date().toISOString() };
    await db.personalGoals.add(goal);
    setGoalTitle('');
    notify('Your personal goal is saved on this device.');
  }

  async function advanceGoal(goal: PersonalGoal) {
    await db.personalGoals.update(goal.id, { current: Math.min(goal.target, goal.current + 1) });
    notify('One small step noted.');
  }

  async function removeGoal(id: string) {
    if (!window.confirm('Remove this personal goal? This does not change your recovery history.')) return;
    await db.personalGoals.delete(id);
  }

  async function addMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = milestoneLabel.trim();
    const daysAfterStart = Number(milestoneDays);
    if (!label || !Number.isInteger(daysAfterStart) || daysAfterStart < 1 || daysAfterStart > 100000) {
      notify('Give your personal milestone a name and a whole-number day target.');
      return;
    }
    const milestone: PersonalMilestone = { id: `personal-milestone:${crypto.randomUUID()}`, label, daysAfterStart, createdAt: new Date().toISOString() };
    try {
      await db.personalMilestones.add(milestone);
      setMilestoneLabel('');
      notify('Your personal milestone is saved on this device.');
    } catch {
      notify('The personal milestone could not be saved. Check browser storage and try again.');
    }
  }

  async function removeMilestone(id: string) {
    if (!window.confirm('Remove this personal milestone? Any built-in recovery history remains unchanged.')) return;
    try { await db.personalMilestones.delete(id); }
    catch { notify('The personal milestone could not be removed. Check browser storage and try again.'); }
  }

  const timeline = [
    ...milestones.map((item) => ({ id: item.id, at: item.reachedAt, title: `${item.label} milestone`, description: 'A moment along the recovery-date timeline.', share: { id: item.id, label: item.label, dateLabel: formatLocalDate(item.reachedAt) } })),
    ...changes.map((item) => ({ id: item.id, at: item.recordedAt, title: 'Recovery date updated', description: 'A date-change record you chose to keep locally.', share: undefined })),
    ...awards.map((item) => ({ id: item.id, at: item.earnedAt, title: `${item.charmId.replaceAll('-', ' ')} charm collected`, description: 'A recovery-supportive action or milestone.', share: undefined })),
    ...personalMilestones.filter((item) => item.achievedAt).map((item) => ({ id: item.id, at: item.achievedAt!, title: `${item.label} · personal milestone`, description: `A milestone you set for ${item.daysAfterStart} days.`, share: { id: item.id, label: item.label, dateLabel: formatLocalDate(item.achievedAt!) } })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">A view of the path you’ve walked</p><h1>Progress, in your own measure.</h1><p>Participation and time are different things. Neither defines your worth or predicts what comes next.</p></div><button className="button button-secondary" onClick={() => setShowCollection((value) => !value)}><Sprout size={16} /> {showCollection ? 'Back to overview' : 'The Journey Collection'}</button></header>
      {showCollection ? <CharmGallery /> : <>
        <section className="metrics-grid" aria-label="Recovery and wellness summary">
          <article className="card metric-card"><p className="eyebrow">{preferences?.discreetMode ? 'Personal timeline' : 'Selected recovery date'}</p><div className="metric-value" aria-label={preferences?.discreetMode ? 'Duration hidden in discreet mode' : undefined}>{preferences?.discreetMode ? 'Hidden' : duration ? `${duration.days}` : '—'}</div><span className="metric-label">{preferences?.discreetMode ? 'Details are hidden while discreet display is on' : duration ? `days · since ${formatLocalDate(profile?.localStartDate ?? profile?.startAt ?? '')}` : 'Set a date whenever it feels useful'}</span><Link to="/" className="inline-link">{preferences?.discreetMode ? 'Open Today' : duration ? 'Adjust date on Today' : 'Set date on Today'} <ArrowRight size={14} /></Link></article>
          <article className="card metric-card"><p className="eyebrow">Meditation</p><div className="metric-value">{meditationMinutes}<small> min</small></div><span className="metric-label">{completedSessions} completed {completedSessions === 1 ? 'session' : 'sessions'}</span></article>
          <article className="card metric-card"><p className="eyebrow">Journal</p><div className="metric-value">{journalCount}</div><span className="metric-label">entries saved on this device</span></article>
          <article className="card metric-card"><p className="eyebrow">Reflections & scripture</p><div className="metric-value">{reflectionCount + scriptureCount}</div><span className="metric-label">{reflectionCount} reflections · {scriptureCount} scripture passages</span></article>
        </section>

        <div className="two-column">
          <section className="card">
            <div className="card-header"><div><p className="eyebrow">Recorded activity, not a score</p><h2>Activity over time</h2><p>Counts reflect saved actions in your selected period.</p></div><div className="filter-row" role="group" aria-label="Activity chart period">{filters.map((item) => <button key={item.days} className={`filter-chip${period === item.days ? ' selected' : ''}`} onClick={() => setPeriod(item.days)}>{item.label}</button>)}</div></div>
            <div className="activity-bars" role="img" aria-label={`${filters.find((item) => item.days === period)?.label} activity chart. ${chartRows.map((row) => `${row.label}: ${row.value}`).join(', ')}`}>
              {chartRows.map((row) => <div className="activity-bar" key={row.key} title={`${row.label}: ${row.value} recorded activity units`}><div className="activity-bar-track"><span className="activity-bar-fill" style={{ height: `${Math.max(3, row.value / maxValue * 100)}%` }} /></div><small>{row.label}</small></div>)}
            </div>
            <p className="fine-print">Activity measures recorded participation only; it is not clinical evidence or a prediction of relapse.</p>
            <div className="activity-legend"><span><i className="legend-dot legend-reflection" /> Reflections</span><span><i className="legend-dot legend-journal" /> Journal</span><span><i className="legend-dot legend-meditation" /> Meditation minutes</span></div>
          </section>
          <section className="card milestone-card">
            <div className="card-header"><div><p className="eyebrow">{preferences?.discreetMode ? 'Personal timeline' : 'Recovery timeline'}</p><h2>{preferences?.discreetMode ? 'A saved moment' : next ? `Next · ${next.label}` : 'A date you choose'}</h2></div><CalendarDays size={20} aria-hidden="true" /></div>
            {preferences?.discreetMode ? <p className="muted">Details are hidden while discreet display is on.</p> : next ? <><p className="milestone-big">{formatLocalDate(next.at)}</p><p className="muted">A calendar milestone from your chosen start date. Your past achievements remain saved if you change that date.</p></> : <p className="muted">Add a recovery date from Today whenever a counter feels helpful.</p>}
            <div className="milestone-row"><span>Charms collected</span><strong>{awards.length}</strong></div>
            <div className="milestone-row"><span>Milestones recorded</span><strong>{milestones.length + personalMilestones.filter((item) => item.achievedAt).length}</strong></div>
          </section>
        </div>

        <div className="two-column">
          <section className="card personal-milestones-card">
            <div className="card-header"><div><p className="eyebrow">Choose a marker of your own</p><h2>Personal milestones</h2><p>Set a day-count marker that matters to you. It is separate from the standard timeline and never creates a penalty.</p></div></div>
            <form className="goal-form" onSubmit={(event) => void addMilestone(event)}><label className="sr-only" htmlFor="personal-milestone-label">Milestone name</label><input id="personal-milestone-label" maxLength={120} placeholder="e.g. A month of choosing today" value={milestoneLabel} onChange={(event) => setMilestoneLabel(event.target.value)} /><div className="goal-fields"><label><span className="sr-only">Days after your chosen start date</span><input aria-label="Days after your chosen start date" type="number" min="1" max="100000" step="1" value={milestoneDays} onChange={(event) => setMilestoneDays(event.target.value)} /></label><span className="muted">days</span><button type="submit" className="icon-button" aria-label="Add personal milestone"><Plus size={18} /></button></div></form>
            {!profile?.startAt && <p className="fine-print">You can prepare a milestone now; its date will appear after you choose a recovery start date.</p>}
            {personalMilestones.length ? <div className="personal-milestone-list">{personalMilestones.map((item) => {
              const targetAt = profile?.startAt ? new Date(new Date(profile.startAt).getTime() + item.daysAfterStart * 86400000).toISOString() : null;
              const reached = Boolean(item.achievedAt) || Boolean(duration && duration.days >= item.daysAfterStart);
              return <div className="personal-milestone-item" key={item.id}><div><strong>{item.label}</strong><small>{item.daysAfterStart} days{targetAt ? ` · target ${formatLocalDate(targetAt)}` : ''}{reached ? ' · reached' : ''}</small></div><button className="button button-small button-quiet" onClick={() => void removeMilestone(item.id)} aria-label={`Remove personal milestone ${item.label}`}>Remove</button></div>;
            })}</div> : <p className="fine-print">Add a marker that feels meaningful to you. You can remove it at any time.</p>}
          </section>
          <section className="card">
            <div className="card-header"><div><p className="eyebrow">Your story, kept here</p><h2>Recent journey moments</h2></div></div>
            {timeline.length ? <ol className="timeline">{timeline.map((item) => <li key={item.id}><span className="timeline-dot" /><div><strong>{preferences?.discreetMode ? 'A saved personal moment' : item.title}</strong><small>{preferences?.discreetMode ? 'Details hidden in discreet mode' : `${formatLocalDate(item.at)} · ${item.description}`}</small></div>{item.share && !preferences?.discreetMode && <button className="icon-button timeline-share" type="button" aria-label={`Share milestone ${item.share.label}`} onClick={() => setShareTarget(item.share!)}><Share2 size={15} aria-hidden="true" /></button>}</li>)}</ol> : <div className="empty-state">Your timeline will grow with moments you choose to record. Nothing is erased by a change in your recovery date.</div>}
          </section>
          <section className="card">
            <div className="card-header"><div><p className="eyebrow">A gentle intention</p><h2>Personal goals</h2><p>Small goals are yours to shape; missed days carry no penalty.</p></div></div>
            <form className="goal-form" onSubmit={(event) => void addGoal(event)}><label className="sr-only" htmlFor="goal-title">Goal name</label><input id="goal-title" placeholder="e.g. Read before bed" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} /><div className="goal-fields"><label><span className="sr-only">Target count</span><input aria-label="Target count" type="number" min="1" max="1000" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} /></label><label><span className="sr-only">Goal unit</span><input aria-label="Goal unit" value={goalUnit} onChange={(event) => setGoalUnit(event.target.value)} /></label><button type="submit" className="icon-button" aria-label="Add personal goal"><Plus size={18} /></button></div></form>
            {goals.length ? <div className="goal-list">{goals.map((goal) => <div className="goal-item" key={goal.id}><div><strong>{goal.title}</strong><small>{goal.current} / {goal.target} {goal.unit}</small><div className="goal-track"><span style={{ width: `${Math.min(100, goal.current / goal.target * 100)}%` }} /></div></div><div className="goal-actions"><button className="button button-small button-secondary" onClick={() => void advanceGoal(goal)} aria-label={`Record a step for ${goal.title}`}><CircleCheck size={14} /> Step</button><button className="button button-small button-quiet" onClick={() => void removeGoal(goal.id)} aria-label={`Remove goal ${goal.title}`}>Remove</button></div></div>)}</div> : <p className="fine-print">Add a goal if it helps. It is never required to maintain progress.</p>}
          </section>
        </div>
      </>}
      <MilestoneShareDialog milestone={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
