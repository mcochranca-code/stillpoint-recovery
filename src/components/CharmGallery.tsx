import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { charmDefinitions } from '../data/charms';
import { db } from '../db/database';
import { charmProgress } from '../domain/achievements';
import { elapsedParts, formatLocalDate } from '../domain/time';
import type { CharmCategory, EarnedCharm } from '../domain/types';
import { useAppContext } from '../app/AppContext';

const categories: Array<{ id: 'all' | CharmCategory; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'sobriety', label: 'Milestones' }, { id: 'reflection', label: 'Reflections' },
  { id: 'journaling', label: 'Journaling' }, { id: 'meditation', label: 'Meditation' }, { id: 'gratitude', label: 'Gratitude' },
  { id: 'scripture', label: 'Scripture' }, { id: 'resilience', label: 'Resilience' },
];

export function CharmGallery() {
  const { notify } = useAppContext();
  const [category, setCategory] = useState<'all' | CharmCategory>('all');
  const [includeLocked, setIncludeLocked] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState('');
  const earned = useLiveQuery(() => db.earnedCharms.toArray(), []) ?? [];
  const journals = useLiveQuery(() => db.journalEntries.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.meditationSessions.toArray(), []) ?? [];
  const scripture = useLiveQuery(() => db.scriptureActivity.toArray(), []) ?? [];
  const reflections = useLiveQuery(() => db.dailyReflections.toArray(), []) ?? [];
  const preferences = useLiveQuery(() => db.preferences.get('preferences'), []);
  const profile = useLiveQuery(() => db.recoveryProfiles.get('recovery-profile'), []);
  const days = elapsedParts(profile?.startAt)?.days ?? 0;
  const reflectionCount = new Set(reflections.filter((entry) => entry.reflectedAt).map((entry) => entry.reflectionId)).size;

  if (!preferences) return <div className="empty-state">Loading your private collection…</div>;
  const snapshot = {
    preferences, sobrietyDays: days, journalEntries: journals,
    completedSessions: sessions.filter((session) => session.status === 'completed'),
    scriptureActivity: scripture, reflectionCount, hasIntention: Boolean(profile?.intention?.trim()), hasReturnedAfterBreak: false,
  };
  const filtered = charmDefinitions.filter((item) => category === 'all' || item.category === category)
    .filter((item) => includeLocked || earned.some((award) => award.charmId === item.id));

  function editMemory(award: EarnedCharm) {
    setEditingMemoryId(award.id);
    setMemoryDraft(award.memory ?? '');
  }

  async function saveMemory(award: EarnedCharm) {
    const memory = memoryDraft.trim();
    try {
      await db.earnedCharms.update(award.id, { memory: memory || undefined });
      setEditingMemoryId(null);
      setMemoryDraft('');
      notify(memory ? 'Your private charm memory is saved on this device.' : 'The private charm memory was removed.');
    } catch {
      notify('The charm memory could not be saved. Check browser storage and try again.');
    }
  }

  return (
    <div className="page-stack">
      <div className="collection-intro"><div><p className="eyebrow">The Journey Collection</p><h2>Small signs of care, collected along the way.</h2><p>These charms mark actions and moments that belong to you. They are not a comparison with anyone else.</p></div><div className="collection-count"><strong>{earned.length}</strong><small>of {charmDefinitions.length} collected</small></div></div>
      <div className="filter-row" role="group" aria-label="Filter charms by category">{categories.map((item) => <button key={item.id} className={`filter-chip${category === item.id ? ' selected' : ''}`} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      <label className="inline-check"><input type="checkbox" checked={includeLocked} onChange={(event) => setIncludeLocked(event.target.checked)} /> Show charms not yet collected</label>
      <div className="charm-grid">
        {filtered.map((charm) => {
          const award = earned.find((item) => item.charmId === charm.id);
          const progress = charmProgress(charm, snapshot);
          const percent = progress.target ? Math.min(100, Math.round(progress.current / progress.target * 100)) : 0;
          return <article className={`charm-card${award ? '' : ' locked'}`} key={charm.id}>
            <div className="charm-art-wrap"><img src={charm.image} alt="" loading="lazy" /></div>
            <strong>{charm.name}</strong>
            <small>{award ? `Collected ${formatLocalDate(award.earnedAt)}` : charm.description}</small>
            {!award && <div className="charm-progress-wrap"><div className="charm-progress" role="progressbar" aria-label={`${charm.name} progress`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><small>{Math.min(progress.current, progress.target)} / {progress.target} · {progress.label}</small></div>}
            {award && <>
              <span className="pill pill-sage">Collected</span>
              <div className="charm-memory">
                {award.memory && <p><strong>A memory you chose to keep</strong><span>{preferences.discreetMode ? 'Details hidden while discreet display is on.' : award.memory}</span></p>}
                {editingMemoryId === award.id ? <>
                  <label className="field-label" htmlFor={`charm-memory-${charm.id}`}>A private memory <span className="optional-label">Optional · max 500 characters</span></label>
                  <textarea id={`charm-memory-${charm.id}`} rows={3} maxLength={500} value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="What would you like to remember about this moment?" />
                  <div className="action-row"><button className="button button-small button-primary" onClick={() => void saveMemory(award)}>Save memory</button><button className="button button-small button-quiet" onClick={() => setEditingMemoryId(null)}>Cancel</button></div>
                </> : <button className="text-button" onClick={() => editMemory(award)}>{award.memory ? 'Edit your private memory' : 'Add a private memory'}</button>}
              </div>
            </>}
          </article>;
        })}
        {!filtered.length && <div className="empty-state">No collected charms in this category yet. Your next step can be a small one.</div>}
      </div>
    </div>
  );
}
