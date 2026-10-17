import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flower2, Leaf, Sprout, TreePine } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { db } from '../../db/database';
import { charmDefinitions } from '../../data/charms';
import type { GardenStyle } from '../../domain/types';

export function GardenPage() {
  const { preferences, updatePreferences } = useAppContext();
  const activities = useLiveQuery(() => db.dailyActivity.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.meditationSessions.toArray(), []) ?? [];
  const awardsQuery = useLiveQuery(() => db.earnedCharms.toArray(), []);
  const awards = useMemo(() => awardsQuery ?? [], [awardsQuery]);
  const journals = useLiveQuery(() => db.journalEntries.count(), []) ?? 0;
  const reflections = activities.reduce((sum, item) => sum + item.reflectionsCompleted, 0);
  const minutes = sessions.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.plannedMinutes, 0);
  const gardenPoints = reflections + journals + sessions.filter((item) => item.status === 'completed').length + awards.length * 3;
  const stage = gardenPoints === 0 ? 'A place to begin' : gardenPoints < 5 ? 'First leaves' : gardenPoints < 15 ? 'New roots' : gardenPoints < 35 ? 'A growing grove' : 'A landscape shaped by care';
  const plantCount = Math.min(12, Math.max(gardenPoints === 0 ? 1 : 2, Math.floor(gardenPoints / 2) + 1));
  const earnedDefinitions = useMemo(() => awards.map((award) => charmDefinitions.find((charm) => charm.id === award.charmId)).filter(Boolean), [awards]);
  const woodland = preferences?.gardenStyle !== 'desert-bloom';

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Growth that does not ask for a streak</p><h1>The Living Garden.</h1><p>A visual record of care you chose to give. Missed days never make anything here wither.</p></div><span className="pill">{stage}</span></header>
      <section className={`garden-scene ${woodland ? 'woodland' : 'desert-bloom'}`} aria-label={`${woodland ? 'Woodland' : 'Desert bloom'} garden, ${stage}`}>
        <img className="garden-landscape" src={woodland ? '/assets/backgrounds/forest-path.svg' : '/assets/backgrounds/sunrise-hills.svg'} alt="" />
        <div className="garden-sun" aria-hidden="true" />
        <div className="garden-plants" aria-hidden="true">
          {Array.from({ length: plantCount }, (_, index) => {
            const Icon = index % 5 === 0 ? TreePine : index % 3 === 0 ? Flower2 : index % 2 === 0 ? Sprout : Leaf;
            return <div className={`garden-plant plant-${index % 6}`} key={index}><Icon size={index % 5 === 0 ? 44 : 30 + index % 4 * 5} strokeWidth={1.35} /></div>;
          })}
        </div>
        <div className="garden-scene-label"><span>{woodland ? 'WOODLAND' : 'DESERT BLOOM'}</span><strong>{stage}</strong></div>
      </section>
      <div className="garden-style-controls" role="group" aria-label="Choose Living Garden style"><span>Choose a landscape</span><button className={`filter-chip${woodland ? ' selected' : ''}`} aria-pressed={woodland} onClick={() => void updatePreferences({ gardenStyle: 'woodland' as GardenStyle })}>Woodland</button><button className={`filter-chip${!woodland ? ' selected' : ''}`} aria-pressed={!woodland} onClick={() => void updatePreferences({ gardenStyle: 'desert-bloom' as GardenStyle })}>Desert bloom</button></div>
      <div className="garden-summary-grid"><article className="card garden-stat"><Leaf size={19} /><strong>{reflections}</strong><span>reflections · leaves</span></article><article className="card garden-stat"><Sprout size={19} /><strong>{journals}</strong><span>journal entries · tended soil</span></article><article className="card garden-stat"><Flower2 size={19} /><strong>{minutes}</strong><span>meditation minutes · water</span></article><article className="card garden-stat"><TreePine size={19} /><strong>{awards.length}</strong><span>milestones & charms · new growth</span></article></div>
      <section className="card garden-story"><div><p className="eyebrow">A personal landscape</p><h2>Every practice can leave a gentle trace.</h2><p>Reflections grow leaves, journaling enriches the soil, meditation adds water, and meaningful milestones make room for new plants. These elements are based on cumulative practices and achievements saved on this device—not a daily streak.</p><p>Nothing dies when you take time away. If your path changes or you adjust your date, your earlier growth and earned charms remain yours.</p></div><div className="garden-charm-row" aria-label="Decorations from earned charms">{earnedDefinitions.length ? earnedDefinitions.slice(0, 6).map((charm) => charm && <img key={charm.id} src={charm.image} alt={`${charm.name} garden decoration`} title={charm.name} />) : <span className="garden-seed"><Sprout size={22} /> Your first garden detail will appear when you choose a recovery-supportive activity.</span>}</div></section>
      <div className="signature-links"><Link to="/reset" className="signature-link"><span><Leaf size={19} /></span><strong>I need a moment<small>Take a gentle pause</small></strong></Link><Link to="/progress" className="signature-link"><span><TreePine size={19} /></span><strong>Notice your journey<small>Open Progress</small></strong></Link><Link to="/field-guide" className="signature-link"><span><Sprout size={19} /></span><strong>Recovery Field Guide<small>Your private playbook</small></strong></Link></div>
    </div>
  );
}
