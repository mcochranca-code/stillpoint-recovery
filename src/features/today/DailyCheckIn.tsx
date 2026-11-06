import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Check, Wind } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { awardEligibleCharms } from '../../db/achievements';
import { checkInMoods, getTodayCheckIn, saveDailyCheckIn } from '../../db/checkIns';
import { returnedAfterActivityBreak } from '../../db/repository';
import { localDateKey } from '../../domain/time';
import type { Mood } from '../../domain/types';

const heavyMoods = new Set<Mood>(['anxious', 'sad', 'angry', 'tired']);

/** A one-tap daily check-in: the smallest meaningful action on Today. */
export const DailyCheckIn = forwardRef<HTMLElement, { daysInRecovery?: number }>(function DailyCheckIn({ daysInRecovery = 0 }, ref) {
  const { notify } = useAppContext();
  const today = localDateKey(new Date());
  const todayCheckIn = useLiveQuery(() => getTodayCheckIn(), [today]);
  const [saving, setSaving] = useState<Mood | null>(null);
  const selected = todayCheckIn?.mood;
  const selectedLabel = checkInMoods.find((mood) => mood.id === selected)?.label;

  async function choose(mood: Mood) {
    if (saving) return;
    setSaving(mood);
    try {
      const { created } = await saveDailyCheckIn(mood);
      if (created) await awardEligibleCharms(daysInRecovery, await returnedAfterActivityBreak());
      const label = checkInMoods.find((item) => item.id === mood)?.label ?? 'checked in';
      notify(created ? `Checked in as ${label.toLowerCase()}. That counts—thank you for showing up today.` : `Today’s check-in is now ${label.toLowerCase()}.`);
    } catch {
      notify('Your check-in could not be saved. Check browser storage and try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section ref={ref} id="daily-check-in" tabIndex={-1} className="card daily-check-in" aria-labelledby="daily-check-in-title">
      <div className="daily-check-in__intro">
        <p className="eyebrow">One tap · saved only on this device</p>
        <h2 id="daily-check-in-title">{selected ? 'You checked in today.' : 'How are you arriving today?'}</h2>
        <p className="muted">{selected ? `Feeling ${selectedLabel?.toLowerCase()}. You can change it anytime today.` : 'No right answer and nothing to keep up. Choose the word that fits closest.'}</p>
      </div>
      <div className="choice-chip-row daily-check-in__moods" role="group" aria-label="Choose how you are feeling today">
        {checkInMoods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className={`choice-chip${selected === mood.id ? ' selected' : ''}`}
            aria-pressed={selected === mood.id}
            aria-busy={saving === mood.id || undefined}
            onClick={() => void choose(mood.id)}
          >
            {selected === mood.id && <Check size={13} aria-hidden="true" className="check-settle" />} {mood.label}
          </button>
        ))}
      </div>
      {selected && <div className="daily-check-in__next action-row">
        {heavyMoods.has(selected) && <Link to="/reset" className="button button-secondary button-small"><Wind size={14} aria-hidden="true" /> Take a 90-second pause</Link>}
        <Link to="/journal" className="button button-quiet button-small"><BookOpen size={14} aria-hidden="true" /> Add a few lines</Link>
      </div>}
    </section>
  );
});
