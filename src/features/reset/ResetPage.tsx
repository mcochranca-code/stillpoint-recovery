import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, HeartHandshake, Leaf, Pause, Play, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { db } from '../../db/database';
import { localDateKey } from '../../domain/time';
import type { ResetRecord } from '../../domain/types';

const feelings = ['A craving', 'Panic or anxiety', 'Shame', 'Anger', 'Loneliness', 'Spiritual discouragement', 'Something else'];
const practices = [
  { id: 'grounding', label: 'Grounding', description: 'Notice the room and your points of contact.' },
  { id: 'breathing', label: 'Gentle breathing', description: 'A light inhale and a comfortable, longer exhale. No holds.' },
  { id: 'prayer', label: 'Prayer or quiet reflection', description: 'A short optional thought for this moment.' },
  { id: 'writing', label: 'Brief writing', description: 'Name what is here in a few words.' },
  { id: 'contact', label: 'View a trusted person', description: 'Choose whether to reach out yourself.' },
];
const nextSteps = ['Move to a different room or leave a triggering place', 'Read a coping note in my Field Guide', 'Write down one small next step', 'Reach out to a trusted person', 'Take a break and return to my usual breathing', 'Choose another step for myself'];

export function ResetPage() {
  const { preferences, notify } = useAppContext();
  const [feeling, setFeeling] = useState('');
  const [practice, setPractice] = useState('grounding');
  const [nextStep, setNextStep] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pausedElapsed, setPausedElapsed] = useState<number | null>(null);
  const [writing, setWriting] = useState('');
  const [saved, setSaved] = useState(false);
  const elapsed = startedAt === null ? 0 : pausedElapsed ?? Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = Math.max(0, 90 - elapsed);
  const finished = startedAt !== null && remaining === 0;
  const contacts = preferences?.trustedContacts ?? [];
  const recent = useLiveQuery(() => db.resetRecords.orderBy('createdAt').reverse().limit(5).toArray(), []) ?? [];

  useEffect(() => {
    if (startedAt === null || pausedElapsed !== null || finished) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [startedAt, pausedElapsed, finished]);

  async function saveReset(completed: boolean) {
    const record: ResetRecord = { id: `reset:${crypto.randomUUID()}`, feeling, practice, nextStep, createdAt: new Date().toISOString(), completed };
    await db.resetRecords.add(record);
    if (writing.trim() && practice === 'writing') {
      await db.fieldGuideNotes.add({ id: `guide:${crypto.randomUUID()}`, kind: 'reflection', title: `A moment noted · ${localDateKey(new Date())}`, body: writing.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setSaved(true);
    notify(completed ? 'Your pause is noted. There is no expectation about how you should feel now.' : 'Your reset was ended early; ending early is always okay.');
  }

  function pause() {
    if (startedAt === null || pausedElapsed !== null) return;
    setPausedElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  }
  function resume() {
    if (pausedElapsed === null) return;
    setStartedAt(Date.now() - pausedElapsed * 1000); setPausedElapsed(null); setNow(Date.now());
  }
  function begin() {
    setStartedAt(Date.now()); setNow(Date.now()); setPausedElapsed(null); setSaved(false);
  }
  const phase = (Math.floor(elapsed / 9) % 2 === 0) ? 'Breathe in gently' : 'Breathe out comfortably';
  const choosePractice = (id: string) => { setPractice(id); setStartedAt(null); setPausedElapsed(null); setSaved(false); };

  return (
    <div className="page-stack reset-page">
      <header className="page-header"><div><p className="eyebrow">One small pause, if you want it</p><h1>I need a moment.</h1><p>This is a way to pause and choose a response. It does not promise that a craving or feeling will go away.</p></div><span className="pill"><ShieldCheck size={14} /> Private on this device</span></header>
      <section className="card reset-honesty"><strong>There is no wrong way to use this.</strong><p>You can skip steps, stop early, breathe normally, or reach out to someone you trust. If you are in immediate danger or need urgent care, contact your local emergency service or a trusted person.</p></section>

      {startedAt === null ? <>
        <section className="card"><p className="eyebrow">1 · What is present for you?</p><h2>Name it only if that helps.</h2><div className="choice-chip-row">{feelings.map((item) => <button key={item} className={`choice-chip${feeling === item ? ' selected' : ''}`} aria-pressed={feeling === item} onClick={() => setFeeling(item)}>{item}</button>)}</div></section>
        <section className="card"><p className="eyebrow">2 · Choose a gentle practice</p><div className="reset-practice-grid">{practices.map((item) => <button key={item.id} className={`reset-practice${practice === item.id ? ' selected' : ''}`} aria-pressed={practice === item.id} onClick={() => choosePractice(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
          {practice === 'contact' && <div className="contact-choice-panel"><HeartHandshake size={19} /><div><strong>Your trusted people</strong>{contacts.length ? contacts.map((contact, index) => <p key={`${index}-${contact}`}>{contact}</p>) : <p>No contacts saved yet. Add them in <Link to="/settings">Settings</Link>. You can still continue without a contact.</p>}<small>You choose whether and how to reach out. Stillpoint does not call or send messages.</small></div></div>}
          {practice === 'prayer' && <blockquote className="reset-prayer">“May I meet this moment with honesty, patience, and the support I need.” <small>An original optional reflection, not a quotation.</small></blockquote>}
          {practice === 'grounding' && <div className="grounding-instructions"><strong>A quiet orientation</strong><p>Notice one thing you can see, one sound, and the feeling of your feet or hands. Let each detail be ordinary; there is nothing you have to get right.</p></div>}
          {practice === 'writing' && <><label className="field-label" htmlFor="reset-writing">What would you like to remember? <span className="optional-label">Optional; saved only if you choose to finish</span></label><textarea id="reset-writing" rows={3} maxLength={4000} value={writing} onChange={(event) => setWriting(event.target.value)} placeholder="A few words for yourself…" /></>}
        </section>
        <button className="button button-primary button-wide reset-begin" disabled={!feeling} onClick={begin}><Play size={17} /> Begin a 90-second pause</button>
        {!feeling && <p className="form-help">Choose a feeling, or select “Something else,” to begin. You are free to stop at any point.</p>}
      </> : <section className="card reset-running">
        {!finished ? <><p className="eyebrow">{feeling || 'A moment for yourself'}</p><h2>{practice === 'breathing' ? phase : practice === 'grounding' ? 'Notice what is around you.' : practice === 'writing' ? 'Let a few words arrive.' : practice === 'contact' ? 'You do not have to do this alone.' : 'Let this thought sit beside you.'}</h2>
          {practice === 'breathing' && <div className={`reset-breath-orb ${phase.startsWith('Breathe in') ? 'phase-in' : 'phase-out'}`} aria-hidden="true"><img src="/assets/meditation/breathing-orb.svg" alt="" /></div>}
          {practice === 'grounding' && <div className="grounding-timer"><Leaf size={28} /><p>One thing you can see. One sound. One point of contact. No need to change your breath.</p></div>}
          {practice === 'writing' && <p className="muted">Your writing is only kept if you choose to finish and save it to your Field Guide.</p>}
          <div className="reset-countdown" role="timer" aria-live="off"><strong>00:{String(remaining).padStart(2, '0')}</strong><div className="session-progress" role="progressbar" aria-label="90-second pause progress" aria-valuenow={Math.round(elapsed / 90 * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, elapsed / 90 * 100)}%` }} /></div></div>
          <div className="action-row">{pausedElapsed === null ? <button className="button button-secondary" onClick={pause}><Pause size={15} /> Pause</button> : <button className="button button-primary" onClick={resume}><Play size={15} /> Resume</button>}<button className="button button-quiet" onClick={() => { setStartedAt(null); setPausedElapsed(null); }}>Stop</button></div>
        </> : <>
          <span className="pill pill-sage">Pause complete</span><h2>Choose one next step that feels manageable.</h2><p className="muted">The difficult feeling may still be here. This pause is not a test or a promise.</p>
          <label className="field-label" htmlFor="reset-next-step">My next step</label><select id="reset-next-step" value={nextStep} onChange={(event) => setNextStep(event.target.value)}><option value="">Choose, or leave blank</option>{nextSteps.map((item) => <option key={item}>{item}</option>)}</select>
          {nextStep.includes('Field Guide') && <Link to="/field-guide" className="button button-secondary">Open Field Guide</Link>}
          {nextStep.includes('trusted person') && contacts.map((contact, index) => <p key={`${index}-${contact}`} className="contact-choice-item"><HeartHandshake size={16} /> {contact} <small>Reach out only if and when you choose.</small></p>)}
          {saved ? <div className="saved-state" role="status">Your choice is saved locally. You can return to Today when you are ready.</div> : <button className="button button-primary" onClick={() => void saveReset(true)}>Save this pause</button>}
        </>}
      </section>}

      <section className="card reset-next-step"><div className="card-header"><div><p className="eyebrow">Support beyond this page</p><h2>You can choose another kind of support.</h2></div></div><div className="action-row"><Link to="/field-guide" className="button button-secondary">Review my Field Guide <ArrowRight size={15} /></Link><Link to="/journal" className="button button-secondary">Write in my journal</Link><Link to="/meditation" className="button button-secondary">Open Meditation Studio</Link></div></section>
      {recent.length > 0 && <p className="fine-print">{recent.length} recent reset {recent.length === 1 ? 'pause' : 'pauses'} recorded on this device. They are not scores or predictions.</p>}
    </div>
  );
}
