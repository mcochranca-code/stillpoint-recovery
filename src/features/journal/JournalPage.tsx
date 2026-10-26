import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Download, FilePlus2, Search, Trash2, X } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { useDialogFocus } from '../../app/useDialogFocus';
import { db } from '../../db/database';
import { awardEligibleCharms } from '../../db/achievements';
import { returnedAfterActivityBreak, updateDailyActivity } from '../../db/repository';
import { elapsedParts, formatLocalDate, localDateKey } from '../../domain/time';
import type { JournalDraft, JournalEntry, JournalType, Mood } from '../../domain/types';

const types: Array<{ id: JournalType; label: string }> = [
  { id: 'daily-reflection', label: 'Daily reflection' }, { id: 'gratitude', label: 'Gratitude' },
  { id: 'emotional-check-in', label: 'Emotional check-in' }, { id: 'milestone', label: 'Recovery milestone' },
  { id: 'trigger', label: 'Trigger or craving reflection' }, { id: 'prayer', label: 'Prayer' },
  { id: 'free-writing', label: 'Free writing' }, { id: 'meditation', label: 'Meditation reflection' },
  { id: 'victory', label: 'Personal victory' },
];
const prompts = [
  'What am I grateful for today?', 'What is within my control?', 'What emotion needs my attention?',
  'What situation challenged my recovery?', 'What helped me respond constructively?',
  'Who can I reach out to for support?', 'What does taking recovery one day at a time mean to me today?',
];
const moods: Array<{ id: Mood; label: string }> = [
  { id: 'peaceful', label: 'Peaceful' }, { id: 'hopeful', label: 'Hopeful' }, { id: 'steady', label: 'Steady' },
  { id: 'anxious', label: 'Anxious' }, { id: 'sad', label: 'Sad' }, { id: 'angry', label: 'Angry' },
  { id: 'tired', label: 'Tired' }, { id: 'grateful', label: 'Grateful' },
];
const typeLabel = (type: JournalType) => types.find((item) => item.id === type)?.label ?? 'Journal entry';

function toLocalDateTime(value?: string): string {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

/** Render private journal entry creation, search, editing, and draft recovery. */
export function JournalPage() {
  const { preferences, notify } = useAppContext();
  const entriesQuery = useLiveQuery(() => db.journalEntries.orderBy('createdAt').reverse().toArray(), []);
  const entries = useMemo(() => entriesQuery ?? [], [entriesQuery]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<JournalType | 'all'>('all');
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => (typeFilter === 'all' || entry.type === typeFilter) && (!query || [entry.title, entry.body, ...entry.tags, entry.trigger ?? '', entry.copingStrategy ?? ''].join(' ').toLowerCase().includes(query)));
  }, [entries, search, typeFilter]);

  function createEntry() { setEditing(null); setIsCreating(true); }
  function closeEditor() { setIsCreating(false); setEditing(null); }

  async function deleteEntry(entry: JournalEntry) {
    if (!window.confirm(`Permanently delete “${entry.title || 'this entry'}” from this device? This cannot be undone.`)) return;
    await db.journalEntries.delete(entry.id);
    notify('Entry permanently deleted from this device.');
  }

  function exportEntries() {
    if (!filtered.length) { notify('There are no entries in this view to export.'); return; }
    const blob = new Blob([JSON.stringify({ application: 'stillpoint-journal-export', exportedAt: new Date().toISOString(), entries: filtered }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `stillpoint-journal-${localDateKey(new Date())}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    notify('A local copy of these entries was downloaded. Nothing was uploaded.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Private writing space · stored on this device</p><h1>Journal, at your pace.</h1><p>No entry is required. Write a little, return later, or simply leave the page.</p></div><button className="button button-primary" onClick={createEntry}><FilePlus2 size={16} /> New entry</button></header>
      <div className="journal-tools card">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search private journal entries</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your writing…" /></label>
        <label className="filter-select"><span className="sr-only">Filter journal by entry type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as JournalType | 'all')}><option value="all">All entry types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
        <button className="button button-secondary" onClick={exportEntries}><Download size={16} /> Export view</button>
      </div>
      <section className="journal-list" aria-label="Saved journal entries">
        {filtered.length ? filtered.map((entry) => <article key={entry.id} className="card journal-entry">
          <div className="journal-entry-top"><div><span className="pill pill-sage">{preferences?.discreetMode ? 'Private entry' : typeLabel(entry.type)}</span><h2>{preferences?.discreetMode ? 'Personal writing' : entry.title || 'Untitled entry'}</h2><small>{preferences?.discreetMode ? 'Details hidden while discreet display is on' : `${formatLocalDate(entry.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hourCycle: preferences?.timeFormat === '24h' ? 'h23' : 'h12' })}${entry.mood ? ` · ${moods.find((mood) => mood.id === entry.mood)?.label}` : ''}`}</small></div><div className="entry-actions"><button className="button button-small button-secondary" onClick={() => { setEditing(entry); setIsCreating(false); }} aria-label={`Edit ${preferences?.discreetMode ? 'private journal entry' : entry.title || 'journal entry'}`}>Edit</button><button className="icon-button danger-icon" onClick={() => void deleteEntry(entry)} aria-label={`Delete ${preferences?.discreetMode ? 'private journal entry' : entry.title || 'journal entry'}`}><Trash2 size={16} /></button></div></div>
          <p className="journal-body-preview">{preferences?.discreetMode ? 'Writing is hidden while discreet display is on.' : entry.body}</p>
          {!preferences?.discreetMode && entry.tags.length > 0 && <div className="tag-row">{entry.tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}</div>}
          {!preferences?.discreetMode && entry.trigger && <p className="fine-print"><strong>Situation noted:</strong> {entry.trigger}</p>}
          {!preferences?.discreetMode && entry.copingStrategy && <p className="fine-print"><strong>What helped:</strong> {entry.copingStrategy}</p>}
        </article>) : <div className="card empty-state"><BookOpen size={26} /><h2>{search || typeFilter !== 'all' ? 'No entries found' : 'Your journal is here when you are'}</h2><p>{search || typeFilter !== 'all' ? 'Try another search or entry type.' : 'A few lines can be enough. Your entries remain private on this device and are never shared unless you choose to export them.'}</p>{!search && typeFilter === 'all' && <button className="button button-primary" onClick={createEntry}>Write a first entry</button>}</div>}
      </section>
      {(isCreating || editing) && <JournalEditor key={editing?.id ?? 'new'} entry={editing ?? undefined} onClose={closeEditor} onSaved={closeEditor} />}
    </div>
  );
}

function JournalEditor({ entry, onClose, onSaved }: { entry?: JournalEntry; onClose: () => void; onSaved: () => void }) {
  const { profile, notify } = useAppContext();
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
  const [type, setType] = useState<JournalType>(entry?.type ?? 'free-writing');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [body, setBody] = useState(entry?.body ?? '');
  const [dateTimeLocal, setDateTimeLocal] = useState(() => toLocalDateTime(entry?.createdAt));
  const [mood, setMood] = useState<Mood | ''>(entry?.mood ?? '');
  const [tags, setTags] = useState(entry?.tags.join(', ') ?? '');
  const [gratitude, setGratitude] = useState(entry?.gratitude.join('\n') ?? '');
  const [trigger, setTrigger] = useState(entry?.trigger ?? '');
  const [copingStrategy, setCopingStrategy] = useState(entry?.copingStrategy ?? '');
  const [savedAt, setSavedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState('');
  const fieldsRef = useRef({ title, body });
  const latestDraftRef = useRef<JournalDraft | null>(null);
  const savedDraftRef = useRef(false);
  const draftTimerRef = useRef<number | undefined>(undefined);
  // Serialize autosaves so a slow older write cannot overwrite a newer draft.
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistDraftRef = useRef<(draft: JournalDraft) => Promise<void>>(() => Promise.resolve());
  persistDraftRef.current = (draft) => {
    writeQueueRef.current = writeQueueRef.current.catch(() => {}).then(async () => { await db.journalDrafts.put(draft); });
    return writeQueueRef.current;
  };

  useEffect(() => { fieldsRef.current = { title, body }; }, [title, body]);

  useEffect(() => {
    if (entry) return;
    let active = true;
    db.journalDrafts.get('active-journal-draft').then((draft) => {
      if (!active || !draft) return;
      const untouched = !fieldsRef.current.title && !fieldsRef.current.body;
      if (untouched) {
        setType(draft.type); setTitle(draft.title); setBody(draft.body); setDateTimeLocal(draft.dateTimeLocal ?? toLocalDateTime()); setMood(draft.mood ?? '');
        setTags(draft.tags.join(', ')); setGratitude(draft.gratitude.join('\n'));
        setTrigger(draft.trigger ?? ''); setCopingStrategy(draft.copingStrategy ?? '');
        setSavedAt(`Draft recovered · ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
      }
    });
    return () => { active = false; };
  }, [entry]);

  useEffect(() => {
    if (entry) return;
    const draft: JournalDraft = {
      id: 'active-journal-draft', type, title, body, dateTimeLocal, mood: mood || undefined,
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      gratitude: gratitude.split('\n').map((item) => item.trim()).filter(Boolean),
      trigger: trigger || undefined, copingStrategy: copingStrategy || undefined, updatedAt: new Date().toISOString(),
    };
    latestDraftRef.current = draft;
    draftTimerRef.current = window.setTimeout(() => {
      void persistDraftRef.current(draft).then(() => setSavedAt(`Draft saved on this device · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`))
        .catch(() => setSavedAt('Draft could not be saved. Check browser storage.'));
    }, 450);
    return () => { if (draftTimerRef.current !== undefined) window.clearTimeout(draftTimerRef.current); };
  }, [entry, type, title, body, dateTimeLocal, mood, tags, gratitude, trigger, copingStrategy]);

  useEffect(() => () => {
    const draft = latestDraftRef.current;
    if (!entry && !savedDraftRef.current && draft && (draft.title.trim() || draft.body.trim())) {
      void persistDraftRef.current({ ...draft, updatedAt: new Date().toISOString() });
    }
  }, [entry]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() && !body.trim()) { notify('Add a title or a few words before saving.'); return; }
    const selectedDate = new Date(dateTimeLocal);
    if (Number.isNaN(selectedDate.getTime())) { notify('Choose a valid entry date and time.'); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const next: JournalEntry = {
      id: entry?.id ?? `journal:${crypto.randomUUID()}`, type, title: title.trim(), body: body.trim(),
      createdAt: selectedDate.toISOString(), updatedAt: now, mood: mood || undefined,
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      gratitude: gratitude.split('\n').map((item) => item.trim()).filter(Boolean),
      trigger: trigger.trim() || undefined, copingStrategy: copingStrategy.trim() || undefined,
    };
    try {
      if (draftTimerRef.current !== undefined) window.clearTimeout(draftTimerRef.current);
      await writeQueueRef.current.catch(() => {});
      await db.journalEntries.put(next);
      await db.journalDrafts.delete('active-journal-draft');
      savedDraftRef.current = true;
      if (!entry) {
        await updateDailyActivity({ journalEntries: 1, ...(type === 'gratitude' ? { gratitudeEntries: 1 } : {}) }, true);
      }
      const duration = elapsedParts(profile?.startAt);
      const returned = await returnedAfterActivityBreak();
      const awards = await awardEligibleCharms(duration?.days ?? 0, returned);
      if (awards.length) notify(`A Journey Collection charm is now yours: ${awards.map((award) => award.charmId.replaceAll('-', ' ')).join(', ')}.`);
      else notify(entry ? 'Your entry is saved on this device.' : 'Entry saved privately on this device.');
      onSaved();
    } catch {
      notify('This entry could not be saved. Check available browser storage and try again.');
    } finally { setSaving(false); }
  }

  function usePrompt() {
    const nextPrompt = prompts[Math.floor(Math.random() * prompts.length)] ?? prompts[0]!;
    setPrompt(nextPrompt);
    if (!body.includes(nextPrompt)) setBody((current) => current ? `${current}\n\n${nextPrompt}\n` : `${nextPrompt}\n`);
    if (!title) setTitle('A moment to reflect');
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="dialog-card journal-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="card-header"><div><p className="eyebrow">Kept privately on this device</p><h2 id="editor-title">{entry ? 'Edit your entry' : 'A page for today'}</h2>{savedAt && <p className="draft-saved" role="status">{savedAt}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close journal editor"><X size={18} /></button></div>
        <form onSubmit={(event) => void save(event)}>
          <label className="field-label" htmlFor="entry-type">Entry type</label><select id="entry-type" value={type} onChange={(event) => setType(event.target.value as JournalType)}>{types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          <label className="field-label" htmlFor="entry-date-time">Entry date and time</label><input id="entry-date-time" type="datetime-local" value={dateTimeLocal} onChange={(event) => setDateTimeLocal(event.target.value)} />
          <label className="field-label" htmlFor="entry-title">Title <span className="optional-label">Optional</span></label><input id="entry-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this moment a name" />
          <div className="prompt-row"><span>Not sure where to begin?</span><button type="button" className="button button-small button-secondary" onClick={usePrompt}>Offer a gentle prompt</button></div>
          {prompt && <p className="prompt-preview">{prompt}</p>}
          <label className="field-label" htmlFor="entry-body">Your words</label><textarea id="entry-body" rows={8} maxLength={30000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write freely. You can save a draft and come back later." />
          <div className="form-grid"><div><label className="field-label" htmlFor="entry-mood">Mood <span className="optional-label">Optional</span></label><select id="entry-mood" value={mood} onChange={(event) => setMood(event.target.value as Mood | '')}><option value="">Not selected</option>{moods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><div><label className="field-label" htmlFor="entry-tags">Tags <span className="optional-label">Comma-separated</span></label><input id="entry-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="home, patience" /></div></div>
          {type === 'gratitude' && <><label className="field-label" htmlFor="entry-gratitude">Gratitude list <span className="optional-label">One per line</span></label><textarea id="entry-gratitude" rows={3} value={gratitude} onChange={(event) => setGratitude(event.target.value)} placeholder="A person, a moment, a small comfort…" /></>}
          {type === 'trigger' && <><label className="field-label" htmlFor="entry-trigger">Situation or craving <span className="optional-label">Optional</span></label><textarea id="entry-trigger" rows={2} value={trigger} onChange={(event) => setTrigger(event.target.value)} placeholder="Describe only what you want to remember." /><label className="field-label" htmlFor="entry-coping">What helped or might help? <span className="optional-label">Optional</span></label><textarea id="entry-coping" rows={2} value={copingStrategy} onChange={(event) => setCopingStrategy(event.target.value)} placeholder="A person, place, practice, or next step." /></>}
          <p className="fine-print">Your entry is not sent anywhere. This journal is a personal tool, not a clinical record or emergency service.</p>
          <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Close</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Save entry'}</button></div>
        </form>
      </section>
    </div>
  );
}
