import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookHeart, FilePlus2, HeartHandshake, NotebookPen, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { useDialogFocus } from '../../app/useDialogFocus';
import { db } from '../../db/database';
import { reflections } from '../../data/reflections';
import { scriptureEntries } from '../../data/scripture';
import { formatLocalDate } from '../../domain/time';
import type { DailyReflection, FieldGuideNote, ScriptureActivity } from '../../domain/types';

const EMPTY_REFLECTION_ACTIVITY: DailyReflection[] = [];
const EMPTY_SCRIPTURE_ACTIVITY: ScriptureActivity[] = [];

const noteKinds: Array<{ id: FieldGuideNote['kind']; label: string }> = [
  { id: 'strategy', label: 'A strategy that helps' }, { id: 'trigger', label: 'A difficult situation' },
  { id: 'reflection', label: 'A reflection to revisit' }, { id: 'prayer', label: 'A prayer or grounding thought' }, { id: 'note', label: 'Personal note' },
];

type GuideTab = 'notes' | 'what-helped' | 'difficult-moments' | 'favorites' | 'contacts' | 'resources';

/** Render the user's private collection of coping strategies and field-guide notes. */
export function FieldGuidePage() {
  const { preferences, notify } = useAppContext();
  const [tab, setTab] = useState<GuideTab>('notes');
  const [editor, setEditor] = useState<FieldGuideNote | 'new' | null>(null);
  const notes = useLiveQuery(() => db.fieldGuideNotes.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const entriesQuery = useLiveQuery(() => db.journalEntries.orderBy('createdAt').reverse().toArray(), []);
  const entries = useMemo(() => entriesQuery ?? [], [entriesQuery]);
  const savedScripture = useLiveQuery(() => db.scriptureActivity.where('favoriteKey').equals(1).toArray(), []) ?? EMPTY_SCRIPTURE_ACTIVITY;
  const savedReflectionsQuery = useLiveQuery(() => db.dailyReflections.where('favoriteKey').equals(1).toArray(), []) ?? EMPTY_REFLECTION_ACTIVITY;
  const savedReflections = useMemo(() => new Set(savedReflectionsQuery.map((item) => item.reflectionId)), [savedReflectionsQuery]);
  const strategies = useMemo(() => entries.filter((entry) => Boolean(entry.copingStrategy?.trim())), [entries]);
  const triggers = useMemo(() => entries.filter((entry) => entry.type === 'trigger' && (entry.trigger || entry.copingStrategy)), [entries]);
  const tabs: Array<{ id: GuideTab; label: string }> = [
    { id: 'notes', label: 'My notes' }, { id: 'what-helped', label: 'What helped' },
    { id: 'difficult-moments', label: 'Difficult moments I recorded' }, { id: 'favorites', label: 'Saved readings' }, { id: 'contacts', label: 'Trusted contacts' }, { id: 'resources', label: 'Recovery resources' },
  ];

  async function saveNote(note: FieldGuideNote) {
    await db.fieldGuideNotes.put({ ...note, updatedAt: new Date().toISOString() });
    setEditor(null); notify('Saved privately to your Field Guide on this device.');
  }
  async function deleteNote(note: FieldGuideNote) {
    if (!window.confirm(`Permanently remove “${note.title}” from your Field Guide?`)) return;
    await db.fieldGuideNotes.delete(note.id); notify('Field Guide note removed from this device.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">A private playbook built from your own experience</p><h1>Personal Recovery Field Guide.</h1><p>Review what you chose to save. Nothing here is inferred, scored, diagnosed, or used to predict what may happen.</p></div><span className="pill"><ShieldCheck size={14} /> On this device</span></header>
      <div className="field-guide-callout"><BookHeart size={19} /><p>Your experiences can remind you of options you have tried. This guide never replaces support from people you trust or a qualified professional.</p></div>
      <div className="library-tabs field-guide-tabs" role="tablist" aria-label="Field Guide sections">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`library-tab${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>{preferences?.discreetMode && ['difficult-moments', 'contacts', 'resources'].includes(item.id) ? 'Private notes' : item.label}</button>)}</div>

      {tab === 'notes' && <section className="page-stack"><div className="field-guide-toolbar"><p className="muted">Private notes you choose to write and keep.</p><button className="button button-primary" onClick={() => setEditor('new')}><FilePlus2 size={16} /> Add a note</button></div>{notes.length ? <div className="field-guide-grid">{notes.map((note) => <article className="card field-note-card" key={note.id}><div className="card-header"><span className="pill pill-sage">{preferences?.discreetMode ? 'Private note' : noteKinds.find((kind) => kind.id === note.kind)?.label}</span><div className="entry-actions"><button className="icon-button" aria-label={`Edit ${preferences?.discreetMode ? 'private note' : note.title}`} onClick={() => setEditor(note)}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label={`Delete ${preferences?.discreetMode ? 'private note' : note.title}`} onClick={() => void deleteNote(note)}><Trash2 size={15} /></button></div></div><h2>{preferences?.discreetMode ? 'Private note' : note.title}</h2><p className="muted">{preferences?.discreetMode ? 'Content hidden while discreet display is on.' : note.body}</p>{!preferences?.discreetMode && <small className="fine-print">Updated {formatLocalDate(note.updatedAt)}</small>}</article>)}</div> : <div className="card empty-state"><NotebookPen size={25} /><h2>Your guide begins with what you choose</h2><p>Add a supportive strategy, a reminder, or a note about what has helped. Nothing is generated from your writing.</p></div>}</section>}

      {tab === 'what-helped' && <section className="page-stack"><div className="card"><p className="eyebrow">From entries you chose to save</p><h2>Strategies you recorded</h2><p className="muted">These are copied from your own journal entries, not a prediction about future situations.</p></div>{strategies.length ? strategies.map((entry) => <article className="card field-source-card" key={entry.id}><span className="pill">{preferences?.discreetMode ? 'Private strategy' : entry.title || 'Journal entry'}</span><p>{preferences?.discreetMode ? 'Details hidden while discreet display is on.' : entry.copingStrategy}</p>{!preferences?.discreetMode && <small>{formatLocalDate(entry.createdAt)}</small>}<Link to="/journal" className="text-button">Open journal</Link>{!preferences?.discreetMode && <button className="text-button" onClick={() => void saveNote({ id: `guide:${crypto.randomUUID()}`, kind: 'strategy', title: entry.title || 'A strategy that helped', body: entry.copingStrategy ?? '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })}>Keep in Field Guide</button>}</article>) : <div className="card empty-state"><p>No coping strategy has been recorded yet. If it feels helpful, add one through a trigger/craving journal entry or write a Field Guide note.</p><Link className="button button-secondary" to="/journal">Open journal</Link></div>}</section>}

      {tab === 'difficult-moments' && <section className="page-stack"><div className="card"><p className="eyebrow">Only situations you chose to record</p><h2>{preferences?.discreetMode ? 'Private notes' : 'Difficult moments'}</h2><p className="muted">This is a list of your own saved notes. It does not label risk, analyze patterns, or make predictions.</p></div>{triggers.length ? triggers.map((entry) => <article className="card field-source-card" key={entry.id}><h3>{preferences?.discreetMode ? 'Private moment' : entry.title || 'A moment I noted'}</h3>{!preferences?.discreetMode && entry.trigger && <p><strong>Situation:</strong> {entry.trigger}</p>}{!preferences?.discreetMode && entry.copingStrategy && <p><strong>What I wrote might help:</strong> {entry.copingStrategy}</p>}{!preferences?.discreetMode && <small>{formatLocalDate(entry.createdAt)}</small>}<Link to="/journal" className="text-button">Review journal entry</Link></article>) : <div className="card empty-state"><p>Nothing here until you choose to record a difficult moment. You can use the Reset for an immediate pause without saving anything.</p><Link className="button button-primary" to="/reset">I need a moment</Link></div>}</section>}

      {tab === 'favorites' && <section className="page-stack"><div className="card"><p className="eyebrow">Words you chose to keep nearby</p><h2>Saved reflections & scripture</h2></div><div className="field-guide-grid">{reflections.filter((item) => savedReflections.has(item.id)).map((item) => <article className="card" key={item.id}><span className="pill pill-sage">{preferences?.discreetMode ? 'Saved reading' : 'Original reflection'}</span><h3>{preferences?.discreetMode ? 'Details hidden' : item.title}</h3><p>{preferences?.discreetMode ? 'Details hidden while discreet display is on.' : item.reading}</p>{!preferences?.discreetMode && <small>{item.principle}</small>}</article>)}{savedScripture.map((item) => { const verse = scriptureEntries.find((scripture) => scripture.id === item.scriptureId); return verse ? <article className="card" key={item.id}><span className="pill pill-sage">{preferences?.discreetMode ? 'Saved reading' : verse.translation}</span><h3>{preferences?.discreetMode ? 'Details hidden' : verse.reference}</h3>{!preferences?.discreetMode && <blockquote>“{verse.verse}”</blockquote>}<p>{preferences?.discreetMode ? 'Details hidden while discreet display is on.' : verse.explanation}</p>{!preferences?.discreetMode && <small>{verse.principle}</small>}</article> : null; })}{!savedReflections.size && !savedScripture.length && <div className="card empty-state">Save reflections or scripture from the Library to gather them here.</div>}</div></section>}

      {tab === 'contacts' && <section className="page-stack"><div className="card"><p className="eyebrow">People you choose</p><h2>Trusted contacts</h2><p className="muted">Your list is managed in Settings. Stillpoint does not contact anyone automatically.</p><Link to="/settings" className="button button-secondary">Manage contacts</Link></div>{preferences?.trustedContacts.length ? <div className="field-guide-grid">{preferences.trustedContacts.map((contact, index) => <article className="card contact-card" key={`${index}-${contact}`}><HeartHandshake size={19} /><strong>{preferences.discreetMode ? 'Contact details hidden' : contact}</strong><small>Stored only in your local preferences</small></article>)}</div> : <div className="card empty-state">No contacts have been added. If you want, add people you trust in <Link to="/settings">Settings</Link>.</div>}</section>}

      {tab === 'resources' && <section className="page-stack"><div className="card"><p className="eyebrow">Saved by you</p><h2>Recovery support resources</h2><p className="muted">These are personal notes only. Stillpoint does not verify, open, call, or share any resource. For urgent help, use a service you know is appropriate in your location.</p><Link to="/settings" className="button button-secondary">Manage resources in Settings</Link></div>{preferences?.supportResources?.length ? <div className="field-guide-grid">{preferences.supportResources.map((resource, index) => <article className="card contact-card" key={`${index}-${resource}`}><ShieldCheck size={18} /><strong>{preferences?.discreetMode ? 'Resource details hidden' : resource}</strong><small>Stored only in local preferences · not verified</small></article>)}</div> : <div className="card empty-state">No resources are saved. Add only resources you personally trust in <Link to="/settings">Settings</Link>.</div>}</section>}

      {editor && <FieldNoteEditor note={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSave={(note) => void saveNote(note)} />}
    </div>
  );
}

function FieldNoteEditor({ note, onClose, onSave }: { note?: FieldGuideNote; onClose: () => void; onSave: (note: FieldGuideNote) => void }) {
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
  const [kind, setKind] = useState<FieldGuideNote['kind']>(note?.kind ?? 'strategy');
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    onSave({ id: note?.id ?? `guide:${crypto.randomUUID()}`, kind, title: title.trim(), body: body.trim(), createdAt: note?.createdAt ?? now, updatedAt: now });
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="field-note-title"><div className="card-header"><div><p className="eyebrow">Only stored on this device</p><h2 id="field-note-title">{note ? 'Edit Field Guide note' : 'Add to your Field Guide'}</h2></div><button className="icon-button" aria-label="Close note editor" onClick={onClose}><X size={17} /></button></div><form onSubmit={submit}><label className="field-label" htmlFor="guide-kind">Kind</label><select id="guide-kind" value={kind} onChange={(event) => setKind(event.target.value as FieldGuideNote['kind'])}>{noteKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><label className="field-label" htmlFor="guide-title">Title</label><input id="guide-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /><label className="field-label" htmlFor="guide-body">What would you like to remember?</label><textarea id="guide-body" rows={6} maxLength={12000} required value={body} onChange={(event) => setBody(event.target.value)} /><div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Save note</button></div></form></section></div>;
}
