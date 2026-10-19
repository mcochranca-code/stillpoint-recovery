import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Heart, Pause, Play, RotateCcw, Square, Volume2, VolumeX, Wind } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { AmbientAudioPlayer } from '../../components/AmbientAudioPlayer';
import { db } from '../../db/database';
import { awardEligibleCharms } from '../../db/achievements';
import { updateDailyActivity } from '../../db/repository';
import { meditationExercises } from '../../data/exercises';
import { elapsedParts, formatLocalDate } from '../../domain/time';
import type { ActiveMeditationSession, MeditationExercise, MeditationSession } from '../../domain/types';

const durations = [2, 5, 10, 20] as const;
type Duration = (typeof durations)[number];

function currentPhase(exercise: MeditationExercise, elapsedSeconds: number, allowHolds: boolean) {
  const phases = exercise.phases.filter((phase) => allowHolds || phase.label !== 'Hold');
  const safePhases = phases.length ? phases : exercise.phases;
  const cycle = safePhases.reduce((sum, phase) => sum + Math.max(1, phase.seconds), 0);
  let inCycle = Math.max(0, elapsedSeconds) % cycle;
  let index = 0;
  for (const phase of safePhases) {
    if (inCycle < phase.seconds) return { phase, index, remaining: Math.max(1, Math.ceil(phase.seconds - inCycle)) };
    inCycle -= phase.seconds;
    index += 1;
  }
  return { phase: safePhases[0]!, index: 0, remaining: safePhases[0]!.seconds };
}

function phaseClass(label: string) {
  return label.toLowerCase().replaceAll(' ', '-');
}

export function MeditationPage() {
  const { profile, preferences, updatePreferences, notify } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get('exercise') ?? meditationExercises[0]!.id);
  const [duration, setDuration] = useState<Duration>(2);
  const [now, setNow] = useState(Date.now());
  const [voiceCues, setVoiceCues] = useState(false);
  const [completed, setCompleted] = useState<MeditationSession | null>(null);
  const [reflection, setReflection] = useState('');
  const completionLock = useRef('');
  const active = useLiveQuery(() => db.activeSessions.toCollection().first(), []);
  const history = useLiveQuery(() => db.meditationSessions.orderBy('completedAt').reverse().limit(20).toArray(), []) ?? [];
  const exercise = meditationExercises.find((item) => item.id === (active?.exerciseId ?? selectedId)) ?? meditationExercises[0]!;
  const elapsedMs = active ? active.elapsedMs + (active.status === 'running' && active.segmentStartedAt ? Math.max(0, now - active.segmentStartedAt) : 0) : 0;
  const totalMs = active ? active.plannedMinutes * 60_000 : duration * 60_000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  const elapsedDisplay = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const progress = totalMs ? Math.min(100, elapsedMs / totalMs * 100) : 0;
  const phaseInfo = useMemo(() => currentPhase(exercise, elapsedSeconds, preferences?.allowBreathHolds ?? false), [exercise, elapsedSeconds, preferences?.allowBreathHolds]);
  const activeId = active?.id;
  const activeStatus = active?.status;
  const phaseLabel = phaseInfo.phase.label;

  useEffect(() => {
    if (!activeId) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    const onVisible = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [activeId, activeStatus]);

  useEffect(() => {
    const requested = searchParams.get('exercise');
    if (requested && meditationExercises.some((item) => item.id === requested)) setSelectedId(requested);
  }, [searchParams]);

  const completeSession = useCallback(async (session: ActiveMeditationSession) => {
    if (completionLock.current === session.id) return;
    completionLock.current = session.id;
    const completeRecord: MeditationSession = {
      id: session.id, exerciseId: session.exerciseId, exerciseName: session.exerciseName,
      plannedMinutes: session.plannedMinutes, elapsedSeconds: Math.floor(session.plannedMinutes * 60),
      startedAt: session.createdAt, completedAt: new Date().toISOString(), status: 'completed',
    };
    let created = false;
    await db.transaction('rw', db.meditationSessions, db.activeSessions, async () => {
      if (!(await db.meditationSessions.get(completeRecord.id))) {
        await db.meditationSessions.add(completeRecord);
        created = true;
      }
      await db.activeSessions.delete(session.id);
    });
    if (created) {
      await updateDailyActivity({ meditationMinutes: session.plannedMinutes }, true);
      const days = elapsedParts(profile?.startAt)?.days ?? 0;
      await awardEligibleCharms(days);
    }
    setCompleted(completeRecord);
    notify('You made a little room for yourself. This completed session is saved on this device.');
  }, [profile?.startAt, notify]);

  useEffect(() => {
    if (!active || active.status !== 'running') return;
    if (elapsedMs >= totalMs && completionLock.current !== active.id) void completeSession(active);
  }, [active, elapsedMs, totalMs, completeSession]);

  useEffect(() => {
    if (!voiceCues || activeStatus !== 'running' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(phaseLabel);
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voiceCues, activeStatus, activeId, phaseLabel, phaseInfo.index]);

  async function startSession(force = false) {
    if (active && !force) return;
    setCompleted(null); setReflection(''); completionLock.current = '';
    const chosen = meditationExercises.find((item) => item.id === selectedId) ?? meditationExercises[0]!;
    const session: ActiveMeditationSession = {
      id: `session:${crypto.randomUUID()}`, exerciseId: chosen.id, exerciseName: chosen.name,
      plannedMinutes: duration, elapsedMs: 0, segmentStartedAt: Date.now(), status: 'running', createdAt: new Date().toISOString(),
    };
    await db.activeSessions.add(session);
    setSearchParams({ exercise: chosen.id }, { replace: true });
  }

  async function pauseSession() {
    if (!active || active.status !== 'running') return;
    const elapsed = active.elapsedMs + (active.segmentStartedAt ? Date.now() - active.segmentStartedAt : 0);
    await db.activeSessions.update(active.id, { elapsedMs: Math.min(elapsed, totalMs), segmentStartedAt: undefined, status: 'paused' });
    window.speechSynthesis?.cancel();
  }

  async function resumeSession() {
    if (!active || active.status !== 'paused') return;
    await db.activeSessions.update(active.id, { segmentStartedAt: Date.now(), status: 'running' });
  }

  async function finishEarly(restart = false) {
    if (!active) return;
    const elapsed = Math.min(totalMs, elapsedMs);
    const record: MeditationSession = {
      id: active.id, exerciseId: active.exerciseId, exerciseName: active.exerciseName,
      plannedMinutes: active.plannedMinutes, elapsedSeconds: Math.floor(elapsed / 1000),
      startedAt: active.createdAt, completedAt: new Date().toISOString(), status: 'ended',
    };
    await db.transaction('rw', db.meditationSessions, db.activeSessions, async () => {
      if (!(await db.meditationSessions.get(record.id))) await db.meditationSessions.add(record);
      await db.activeSessions.delete(active.id);
    });
    window.speechSynthesis?.cancel();
    setCompleted(null);
    notify('Session ended early and kept in your history as incomplete.');
    if (restart) {
      completionLock.current = '';
      await startSession(true);
    }
  }

  async function saveSessionReflection() {
    if (!completed || !reflection.trim()) { notify('A reflection is optional; add a few words if you would like to keep them with this session.'); return; }
    await db.meditationSessions.update(completed.id, { reflection: reflection.trim() });
    setCompleted({ ...completed, reflection: reflection.trim() });
    notify('Your meditation reflection is saved locally with this session.');
  }

  const selectedForPreview = meditationExercises.find((item) => item.id === selectedId) ?? meditationExercises[0]!;
  const displayExercise = active ? exercise : selectedForPreview;
  const visualSrc = displayExercise.visual === 'orb' ? '/assets/meditation/breathing-orb.svg'
    : displayExercise.visual === 'box' ? '/assets/meditation/box-breathing.svg'
      : displayExercise.visual === 'ripples' ? '/assets/meditation/grounding-ripples.svg'
        : displayExercise.visual === 'horizon' ? '/assets/backgrounds/still-lake.svg'
          : '/assets/backgrounds/soft-bokeh.svg';

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">A gentle practice, if it helps</p><h1>Meditation studio.</h1><p>No special breathing is required. Stop, pause, or return to your natural breath at any time.</p></div><span className="pill"><Wind size={13} /> Silent by default</span></header>

      {completed?.status === 'completed' && !active ? <section className="card completion-card" aria-labelledby="completion-title">
        <div className="completion-sunrise"><Check size={30} /></div><p className="eyebrow">A quiet moment, completed</p><h2 id="completion-title">You showed up for this moment.</h2><p>{completed.exerciseName} · {completed.plannedMinutes} minutes · saved {formatLocalDate(completed.completedAt ?? new Date())}</p>
        <label className="field-label" htmlFor="meditation-reflection">Optional reflection</label><textarea id="meditation-reflection" rows={3} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What would you like to remember?" />
        <div className="action-row"><button className="button button-secondary" onClick={() => void saveSessionReflection()}>Save reflection</button><Link className="button button-primary" to="/">Return to Today</Link><button className="button button-quiet" onClick={() => setCompleted(null)}>Choose another practice</button></div>
        <p className="fine-print">Meditation is optional and does not replace medical care, substance-use treatment, peer support, or emergency help.</p>
      </section> : <>
        {!active && <section className="card">
          <div className="card-header"><div><p className="eyebrow">Choose a comfortable length</p><h2>Time for yourself</h2></div></div>
          <div className="duration-options" role="group" aria-label="Meditation duration">{durations.map((minutes) => <button key={minutes} onClick={() => setDuration(minutes)} className={`duration-option${duration === minutes ? ' selected' : ''}`} aria-pressed={duration === minutes}><strong>{minutes}</strong><span>minutes</span></button>)}</div>
          <div className="exercise-grid">
            {meditationExercises.map((item) => <button key={item.id} className={`exercise-choice${item.id === selectedId ? ' selected' : ''}`} onClick={() => { setSelectedId(item.id); setSearchParams({ exercise: item.id }, { replace: true }); }} aria-pressed={item.id === selectedId}>
              <span className="exercise-visual-thumb"><img src={item.visual === 'orb' ? '/assets/meditation/breathing-orb.svg' : item.visual === 'box' ? '/assets/meditation/box-breathing.svg' : item.visual === 'ripples' ? '/assets/meditation/grounding-ripples.svg' : item.visual === 'horizon' ? '/assets/backgrounds/still-lake.svg' : '/assets/backgrounds/soft-bokeh.svg'} alt="" loading="lazy" /></span><span className="exercise-choice-copy"><strong>{item.name}</strong><small>{item.description}</small></span>
            </button>)}
          </div>
          <div className="exercise-preview"><div className="card-header"><div><p className="eyebrow">A preview of the practice</p><h3>{selectedForPreview.name}</h3></div><span className="pill">{selectedForPreview.category}</span></div><ol>{selectedForPreview.instructions.map((line) => <li key={line}>{line}</li>)}</ol>
            {selectedForPreview.holdOptional && <label className="toggle-row"><span><strong>Include brief optional pause</strong><small>Breath holds are off by default and may be skipped at any time.</small></span><input type="checkbox" checked={preferences?.allowBreathHolds ?? false} onChange={(event) => void updatePreferences({ allowBreathHolds: event.target.checked })} /></label>}
          </div>
          <button className="button button-primary button-wide start-button" onClick={() => void startSession()}><Play size={17} fill="currentColor" /> Begin {duration}-minute practice</button>
        </section>}

        {active && <section className="card active-session-card" aria-label={`${active.status === 'paused' ? 'Paused' : 'Active'} meditation session`}>
          <div className="active-session-header"><div><p className="eyebrow">{active.status === 'paused' ? 'Paused · take your time' : 'A few minutes for this moment'}</p><h2>{exercise.name}</h2><p>{exercise.description}</p></div><span className="pill">{active.plannedMinutes} minutes</span></div>
          <div className="meditation-session-layout">
            <div className="meditation-visual-stage" aria-hidden="true">
              {preferences?.hideMeditationVisual ? <div className="visual-hidden"><Wind size={32} /><span>Visual guide hidden</span></div> : <div className={`meditation-visual ${displayExercise.visual} phase-${phaseClass(phaseInfo.phase.label)}${active.status === 'paused' ? ' paused' : ''}`} style={{ transitionDuration: `${phaseInfo.phase.seconds}s` }}><img src={visualSrc} alt="" /></div>}
            </div>
            <div className="session-readout"><span className="phase-label" aria-live="polite">{active.status === 'paused' ? 'Paused' : phaseInfo.phase.label}</span><strong className="session-time" role="timer" aria-label={`${Math.floor(remainingSeconds / 60)} minutes and ${remainingSeconds % 60} seconds remaining`}>{elapsedDisplay}</strong><span className="phase-caption">{active.status === 'paused' ? 'Your timer will wait until you resume.' : `Next gentle cue in ${phaseInfo.remaining} seconds.`}</span><div className="session-progress" role="progressbar" aria-label="Meditation time elapsed" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p className="fine-print">Follow only what feels comfortable. Return to natural breathing or stop whenever you need.</p>
              <div className="session-controls">{active.status === 'running' ? <button className="button button-primary" onClick={() => void pauseSession()}><Pause size={16} /> Pause</button> : <button className="button button-primary" onClick={() => void resumeSession()}><Play size={16} /> Resume</button>}<button className="button button-secondary" onClick={() => void finishEarly(true)}><RotateCcw size={16} /> Restart</button><button className="button button-quiet" onClick={() => void finishEarly()}><Square size={14} /> End session</button></div>
              <button className="audio-toggle" onClick={() => { setVoiceCues((value) => !value); if (voiceCues) window.speechSynthesis?.cancel(); }} disabled={!('speechSynthesis' in window)}>{voiceCues ? <Volume2 size={15} /> : <VolumeX size={15} />} Voice cues {voiceCues ? 'on' : 'off'} <small>(uses your device voice, if available)</small></button>
            </div>
          </div>
        </section>}
      </>}

      <AmbientAudioPlayer context="meditation" sessionStatus={completed?.status === 'completed' ? 'complete' : active?.status ?? 'idle'} />

      <section className="card safety-note"><div className="safety-icon"><Heart size={19} /></div><div><strong>Comfort comes first.</strong><p>These practices are gentle and optional. There is no need to hold your breath or follow a rhythm. You can stop or return to ordinary breathing at any time. Meditation is not a replacement for medical care, professional treatment, peer support, or emergency help.</p></div></section>

      <section className="card">
        <div className="card-header"><div><p className="eyebrow">Your private history</p><h2>Recent sessions</h2></div><span className="pill">{history.filter((item) => item.status === 'completed').length} completed</span></div>
        {history.length ? <div className="session-history">{history.map((item) => <article className="session-history-item" key={item.id}><div><strong>{item.exerciseName}</strong><small>{formatLocalDate(item.completedAt ?? item.startedAt)} · {Math.floor(item.elapsedSeconds / 60)}m {item.elapsedSeconds % 60}s</small></div><span className={`pill${item.status === 'completed' ? ' pill-sage' : ''}`}>{item.status === 'completed' ? 'Completed' : 'Ended early'}</span>{item.reflection && <p>{item.reflection}</p>}</article>)}</div> : <div className="empty-state">Completed and ended sessions will appear here. A session counts as completed only after the full selected time.</div>}
      </section>
    </div>
  );
}
