import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Compass, Heart, Leaf, Search, Settings2, Sparkles, Wind } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { CharmGallery } from '../../components/CharmGallery';
import { db } from '../../db/database';
import { awardEligibleCharms } from '../../db/achievements';
import { updateDailyActivity } from '../../db/repository';
import { scriptureEntries } from '../../data/scripture';
import { reflections } from '../../data/reflections';
import { meditationExercises } from '../../data/exercises';
import { localDateKey, elapsedParts } from '../../domain/time';
import type { JournalEntry } from '../../domain/types';

type LibraryTab = 'reflections' | 'scripture' | 'principles' | 'meditation' | 'charms';
const tabs: Array<{ id: LibraryTab; label: string }> = [
  { id: 'reflections', label: 'Reflections' }, { id: 'scripture', label: 'Scripture' },
  { id: 'principles', label: 'Principles' }, { id: 'meditation', label: 'Meditation' }, { id: 'charms', label: 'Collection' },
];
const scriptureNeeds: Record<string, string[]> = {
  'Romans 15:13': ['Hope', 'Anxiety', 'Grief'], 'Philippians 4:13': ['Difficulty', 'Perseverance'],
  'Romans 12:2': ['Change', 'Renewal', 'Resentment'], 'James 1:2–4': ['Difficulty', 'Perseverance', 'Grief'],
  'Romans 8:1': ['Shame', 'Forgiveness', 'Resentment'], 'Matthew 6:34': ['Anxiety', 'One day at a time', 'Grief'],
  'Ecclesiastes 4:9–10': ['Loneliness', 'Support', 'Grief'], '2 Corinthians 5:17': ['New beginnings', 'Hope'],
  'Philippians 4:6–7': ['Anxiety', 'Peace', 'Gratitude'], 'Psalm 51:10': ['Forgiveness', 'Renewal', 'Resentment'],
};
const emotionalFilters = ['All needs', 'Loneliness', 'Temptation', 'Anxiety', 'Grief', 'Forgiveness', 'Resentment', 'Gratitude', 'Hope'];

export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('reflections');
  const [query, setQuery] = useState('');
  const [need, setNeed] = useState('All needs');
  const { profile, notify } = useAppContext();
  const reflectionActivity = useLiveQuery(() => db.dailyReflections.toArray(), []) ?? [];
  const scriptureActivity = useLiveQuery(() => db.scriptureActivity.toArray(), []) ?? [];
  const savedReflections = new Set(reflectionActivity.filter((item) => item.favorite).map((item) => item.reflectionId));
  const savedScripture = new Set(scriptureActivity.filter((item) => item.favorite).map((item) => item.scriptureId));
  const reflectedToday = new Set(reflectionActivity.filter((item) => item.localDate === localDateKey(new Date()) && item.reflectedAt).map((item) => item.reflectionId));
  const term = query.trim().toLowerCase();
  const reflectionList = useMemo(() => reflections.filter((item) => (!term || `${item.title} ${item.theme} ${item.reading} ${item.principle}`.toLowerCase().includes(term))), [term]);
  const scriptureList = useMemo(() => scriptureEntries.filter((item) => {
    const needs = scriptureNeeds[item.reference] ?? [];
    return (need === 'All needs' || needs.some((itemNeed) => itemNeed.toLowerCase() === need.toLowerCase()) || (need === 'Temptation' && /craving|temptation|urge/i.test(`${item.explanation} ${item.application}`)))
      && (!term || `${item.reference} ${item.verse} ${item.explanation} ${item.principle} ${needs.join(' ')}`.toLowerCase().includes(term));
  }), [need, term]);

  async function favoriteReflection(reflectionId: string) {
    const today = localDateKey(new Date());
    const id = `reflection:${today}:${reflectionId}`;
    const records = await db.dailyReflections.where('reflectionId').equals(reflectionId).toArray();
    const isSaved = records.some((record) => record.favorite);
    if (isSaved) {
      await Promise.all(records.filter((record) => record.favorite).map((record) => db.dailyReflections.update(record.id, { favorite: false })));
    } else {
      const existing = records.find((record) => record.localDate === today);
      await db.dailyReflections.put({ id, localDate: today, reflectionId, favorite: true, reflectedAt: existing?.reflectedAt, exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    }
    notify(isSaved ? 'Removed from saved reflections.' : 'Added to saved reflections.');
  }

  async function markReflection(reflectionId: string) {
    const today = localDateKey(new Date()); const id = `reflection:${today}:${reflectionId}`;
    const existing = await db.dailyReflections.get(id);
    await db.dailyReflections.put({ id, localDate: today, reflectionId, favorite: existing?.favorite ?? savedReflections.has(reflectionId), reflectedAt: existing?.reflectedAt ?? new Date().toISOString(), exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    if (!existing?.reflectedAt) await updateDailyActivity({ reflectionsCompleted: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0);
    notify('Reflection marked for today.');
  }

  async function saveReflection(reflectionId: string) {
    const item = reflections.find((reflection) => reflection.id === reflectionId);
    if (!item) return;
    const entry: JournalEntry = {
      id: `journal:${crypto.randomUUID()}`, type: 'daily-reflection', title: item.title,
      body: `${item.reading}\n\nA principle for today: ${item.principle}\n\nA small practice: ${item.practice}\n\nTo consider: ${item.question}`,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [item.theme], gratitude: [],
    };
    await db.journalEntries.add(entry); await updateDailyActivity({ journalEntries: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0);
    notify('Saved to your private journal on this device.');
  }

  async function toggleScripture(scriptureId: string) {
    const existing = await db.scriptureActivity.get(`scripture:${scriptureId}`);
    const id = `scripture:${scriptureId}`;
    await db.scriptureActivity.put({ id, scriptureId, favorite: !existing?.favorite, exploredAt: existing?.exploredAt ?? new Date().toISOString() });
    if (!existing) await updateDailyActivity({ scriptureExplored: 1 }, true);
    await awardEligibleCharms(elapsedParts(profile?.startAt)?.days ?? 0);
    notify(existing?.favorite ? 'Removed from scripture favorites.' : 'Scripture saved to your private library.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Read, practice, and return</p><h1>Library & tools.</h1><p>Original readings and optional practices, all available from this device.</p></div><Compass size={26} aria-hidden="true" /></header>
      <div className="signature-links" aria-label="Stillpoint signature tools">
        <Link to="/reset" className="signature-link"><span><Wind size={19} /></span><strong>I need a moment<small>90-second reset</small></strong></Link>
        <Link to="/garden" className="signature-link"><span><Leaf size={19} /></span><strong>Living Garden<small>Growth without streaks</small></strong></Link>
        <Link to="/field-guide" className="signature-link"><span><BookOpen size={19} /></span><strong>Recovery Field Guide<small>Your private playbook</small></strong></Link>
        <Link to="/settings" className="signature-link"><span><Settings2 size={19} /></span><strong>Settings & privacy<small>Control this space</small></strong></Link>
      </div>
      <div className="library-tabs" role="tablist" aria-label="Library categories">{tabs.map((item) => <button role="tab" aria-selected={tab === item.id} key={item.id} className={`library-tab${tab === item.id ? ' active' : ''}`} onClick={() => { setTab(item.id); setQuery(''); setNeed('All needs'); }}>{item.label}</button>)}</div>

      {tab === 'reflections' && <section className="page-stack"><div className="library-search"><Search size={17} /><label className="sr-only" htmlFor="reflection-search">Search original reflections</label><input id="reflection-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by theme, title, or principle…" /></div><p className="fine-print">{reflections.length} original reflections · selected by local calendar day · not affiliated with a recovery fellowship.</p>
        <div className="library-list">{reflectionList.map((item) => <article className="card library-entry" key={item.id}><div className="library-entry-head"><div><span className="pill pill-sage">{item.theme}</span><h2>{item.title}</h2></div><button className="icon-button" aria-label={savedReflections.has(item.id) ? 'Unsave reflection' : 'Save reflection'} onClick={() => void favoriteReflection(item.id)}><Heart size={17} fill={savedReflections.has(item.id) ? 'currentColor' : 'none'} /></button></div><p>{item.reading}</p><div className="principle-callout"><span>PRINCIPLE</span><strong>{item.principle}</strong></div><details className="library-details"><summary>Read the practice and question</summary><p><strong>For today:</strong> {item.practice}</p><p><strong>To consider:</strong> {item.question}</p></details><div className="action-row"><button className="button button-small button-primary" onClick={() => void markReflection(item.id)}>{reflectedToday.has(item.id) ? 'Reflected today' : 'Mark reflected'}</button><button className="button button-small button-secondary" onClick={() => void saveReflection(item.id)}>Save to journal</button></div></article>)}</div>
      </section>}

      {tab === 'scripture' && <section className="page-stack"><div className="library-filter-grid"><div className="library-search"><Search size={17} /><label className="sr-only" htmlFor="scripture-search">Search scripture and context</label><input id="scripture-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, passage, or principle…" /></div><label className="sr-only" htmlFor="need-filter">Browse scripture by emotional need</label><select id="need-filter" value={need} onChange={(event) => setNeed(event.target.value)}>{emotionalFilters.map((item) => <option key={item}>{item}</option>)}</select></div><p className="fine-print">Quotations are from the public-domain King James Version (KJV); context and recovery applications are original and optional.</p>
        <div className="library-list">{scriptureList.map((item) => { const isSaved = savedScripture.has(item.id); const needs = scriptureNeeds[item.reference] ?? []; return <article className="card library-entry scripture-library-card" key={item.id}><div className="library-entry-head"><div><span className="pill pill-sage">{needs.join(' · ') || item.principle}</span><h2>{item.reference}</h2></div><button className="icon-button" aria-label={isSaved ? 'Unsave scripture' : 'Save scripture'} onClick={() => void toggleScripture(item.id)}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'} /></button></div><blockquote>“{item.verse}”</blockquote><small className="muted">{item.translation}</small><p>{item.explanation}</p><div className="principle-callout"><span>RECOVERY PRINCIPLE</span><strong>{item.principle}</strong></div><p><strong>A small practice:</strong> {item.application}</p>{item.contemplation && <p className="fine-print"><em>{item.contemplation}</em></p>}</article>; })}{!scriptureList.length && <div className="empty-state">No passage matched this filter. Try another emotional need or search phrase.</div>}</div>
      </section>}

      {tab === 'principles' && <section className="page-stack"><div className="card"><p className="eyebrow">Gentle reference points</p><h2>Recovery principles</h2><p className="muted">These are invitations to consider, not rules to meet. Pair them with the support that works for you.</p></div><div className="principle-grid">{[
        ['Acceptance', 'Meet the present clearly, without needing to approve of every part of it.'], ['Patience', 'Allow change to happen through small, ordinary choices.'], ['Honesty', 'Name what is true in a way that leaves room for care and support.'], ['Courage', 'Ask for help or take one manageable step while uncertainty is still present.'], ['Gratitude', 'Notice what offers steadiness without denying what is difficult.'], ['Boundaries', 'Protect space for recovery and respectful relationships.'], ['Accountability', 'Repair what you can, and seek support for what feels too heavy alone.'], ['Forgiveness', 'Make room for learning without using shame as a measure of growth.'], ['Service', 'Offer care in ways that respect your own needs and limits.'], ['Emotional regulation', 'Notice an emotion, make space for it, and choose a response with support.'], ['Living one day at a time', 'Give today your attention; tomorrow can wait for its own moment.'], ['Resilience', 'Returning to a helpful practice is meaningful, even after a difficult stretch.'],
      ].map(([title, body]) => <article className="card principle-card" key={title}><span className="principle-mark"><Sparkles size={17} /></span><h3>{title}</h3><p>{body}</p><button className="text-button" onClick={() => { setTab('reflections'); setQuery(title ?? ''); }}>Explore related reflections <span aria-hidden="true">→</span></button></article>)}</div></section>}

      {tab === 'meditation' && <section className="exercise-library"><div className="card"><p className="eyebrow">Choose what feels comfortable</p><h2>Meditation exercises</h2><p className="muted">Each practice is optional and gentle. You may return to natural breathing or stop at any time.</p></div><div className="exercise-library-grid">{meditationExercises.map((item) => <article className="card exercise-library-item" key={item.id}><div className="exercise-thumb"><img src={item.visual === 'orb' ? '/assets/meditation/breathing-orb.svg' : item.visual === 'box' ? '/assets/meditation/box-breathing.svg' : item.visual === 'ripples' ? '/assets/meditation/grounding-ripples.svg' : item.visual === 'horizon' ? '/assets/backgrounds/still-lake.svg' : '/assets/backgrounds/soft-bokeh.svg'} alt="" /></div><span className="pill">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><details><summary>Preview instructions</summary><ol>{item.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></details><Link className="button button-secondary button-small" to={`/meditation?exercise=${item.id}`}>Choose exercise</Link></article>)}</div></section>}

      {tab === 'charms' && <CharmGallery />}
    </div>
  );
}
