import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Wind } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { awardEligibleCharms } from '../../db/achievements';
import { checkInMoods, DAILY_CHECK_IN_FEELING_PREFIX, getTodayCheckIn, saveDailyCheckIn } from '../../db/checkIns';
import { returnedAfterActivityBreak } from '../../db/repository';
import { localDateKey } from '../../domain/time';
import { emotionGroups, getEmotionTerm } from '../../data/emotion-vocabulary';
import type { Mood } from '../../domain/types';

const heavyMoods = new Set<Mood>(['anxious', 'sad', 'angry', 'tired', 'lonely', 'numb', 'overwhelmed', 'ashamed']);
type WordResponse = 'fits' | 'unsure';

function storedEmotionIds(tags: string[], fallbackMood?: Mood): string[] {
  const ids = tags
    .filter((tag) => tag.startsWith(DAILY_CHECK_IN_FEELING_PREFIX))
    .map((tag) => tag.slice(DAILY_CHECK_IN_FEELING_PREFIX.length))
    .filter((id) => Boolean(getEmotionTerm(id)));
  return ids.length ? ids.slice(0, 3) : fallbackMood ? [fallbackMood] : [];
}

/** A private, word-by-word invitation to notice feelings without trying to diagnose them. */
export const DailyCheckIn = forwardRef<HTMLElement, { daysInRecovery?: number }>(function DailyCheckIn({ daysInRecovery = 0 }, ref) {
  const { notify } = useAppContext();
  const today = localDateKey(new Date());
  const [todayCheckIn, setTodayCheckIn] = useState<Awaited<ReturnType<typeof getTodayCheckIn>>>();
  const [ready, setReady] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<Mood | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, WordResponse>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    void getTodayCheckIn(new Date()).then((entry) => {
      if (!active) return;
      setTodayCheckIn(entry);
      const ids = storedEmotionIds(entry?.tags ?? [], entry?.mood);
      setSelectedWords(ids);
      const firstTerm = ids.map((id) => getEmotionTerm(id)).find(Boolean);
      setActiveGroupId(firstTerm?.parent ?? null);
      setActiveWordId(ids[0] ?? null);
      setResponses(Object.fromEntries(ids.map((id) => [id, 'fits'])));
    }).catch(() => {
      if (active) notify('Your saved check-in could not be opened. Check browser storage and try again.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [today, notify]);

  const selectedMood = useMemo(
    () => selectedWords.map((id) => getEmotionTerm(id)?.parent).find(Boolean),
    [selectedWords],
  );
  const selectedLabels = selectedWords.map((id) => getEmotionTerm(id)?.label).filter((label): label is string => Boolean(label));
  const activeGroup = emotionGroups.find((group) => group.id === activeGroupId);
  const activeTerm = activeWordId ? getEmotionTerm(activeWordId) : undefined;
  const allWordsReviewed = selectedWords.length > 0 && selectedWords.every((id) => Boolean(responses[id]));
  const needsPause = selectedWords.some((id) => heavyMoods.has(getEmotionTerm(id)?.parent ?? 'steady'));
  const savedIds = storedEmotionIds(todayCheckIn?.tags ?? [], todayCheckIn?.mood);
  const hasChanges = !todayCheckIn || todayCheckIn.mood !== selectedMood || savedIds.join('|') !== selectedWords.join('|');

  function chooseWord(id: string, parent: Mood) {
    setActiveGroupId(parent);
    setActiveWordId(id);
    if (selectedWords.includes(id)) {
      setSelectedWords((current) => current.filter((word) => word !== id));
      setResponses((current) => { const next = { ...current }; delete next[id]; return next; });
      return;
    }
    if (selectedWords.length >= 3) {
      notify('You can hold up to three feeling words here. You can change them any time.');
      return;
    }
    setSelectedWords((current) => [...current, id]);
  }

  function answerWord(response: WordResponse | 'not-quite') {
    if (!activeWordId) return;
    if (response === 'not-quite') {
      setSelectedWords((current) => current.filter((word) => word !== activeWordId));
      setResponses((current) => { const next = { ...current }; delete next[activeWordId]; return next; });
      return;
    }
    setResponses((current) => ({ ...current, [activeWordId]: response }));
  }

  async function saveCheckIn() {
    if (!selectedMood || !allWordsReviewed || saving) return;
    setSaving(true);
    try {
      const { entry, created } = await saveDailyCheckIn(selectedMood, new Date(), selectedWords);
      setTodayCheckIn(entry);
      if (created) await awardEligibleCharms(daysInRecovery, await returnedAfterActivityBreak());
      const label = checkInMoods.find((mood) => mood.id === selectedMood)?.label?.toLowerCase() ?? 'your feelings';
      notify(created ? `Checked in as ${label}. Thank you for taking a moment with yourself.` : 'Your check-in is updated and saved on this device.');
    } catch {
      notify('Your check-in could not be saved. Check browser storage and try again.');
    } finally {
      setSaving(false);
    }
  }

  const reflectionPrompt = selectedLabels.length
    ? `I am noticing ${selectedLabels.join(', ').toLowerCase()}. What might these feelings be asking me to notice? What support would feel kind right now?`
    : '';
  const journalState = selectedMood && reflectionPrompt ? {
    emotionReflection: {
      title: 'A moment with my feelings',
      prompt: reflectionPrompt,
      mood: selectedMood,
      tags: selectedWords.map((id) => `${DAILY_CHECK_IN_FEELING_PREFIX}${id}`),
    },
  } : undefined;

  return (
    <section ref={ref} id="daily-check-in" tabIndex={-1} className="card daily-check-in" aria-labelledby="daily-check-in-title">
      <div className="daily-check-in__intro">
        <p className="eyebrow">Private on this device · change your words anytime</p>
        <h2 id="daily-check-in-title">{todayCheckIn ? 'You checked in today.' : 'How are you arriving today?'}</h2>
        <p className="muted">{todayCheckIn ? 'Your check-in is yours to revisit. Feelings can be layered, changing, or hard to name.' : 'Start with a broad feeling, then explore a more exact word if that helps. There is no right answer.'}</p>
      </div>

      <div className="emotion-broad-choices" role="group" aria-label="Choose a broad feeling to explore">
        {checkInMoods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className={`choice-chip${selectedWords.includes(mood.id) ? ' selected' : ''}`}
            aria-pressed={selectedWords.includes(mood.id)}
            disabled={!ready || saving}
            onClick={() => chooseWord(mood.id, mood.id)}
          >
            {selectedWords.includes(mood.id) && <Check size={13} aria-hidden="true" className="check-settle" />} {mood.label}
          </button>
        ))}
      </div>

      {activeGroup && <section className="emotion-explorer" aria-label={`${activeGroup.label} vocabulary`}>
        <div className="emotion-group-definition">
          <h3>{activeGroup.label} can hold a lot of different feelings.</h3>
          <p>{activeGroup.definition}</p>
          <p className="fine-print">Choose a more specific word, or keep the broader one. You can pair up to three words.</p>
        </div>
        <div className="emotion-nuance-choices" role="group" aria-label={`More specific words related to ${activeGroup.label.toLowerCase()}`}>
          {activeGroup.words.map((word) => (
            <button
              type="button"
              key={word.id}
              className={`filter-chip${selectedWords.includes(word.id) ? ' selected' : ''}`}
              aria-pressed={selectedWords.includes(word.id)}
              disabled={!ready || saving}
              onClick={() => chooseWord(word.id, activeGroup.id)}
            >
              {word.label}
            </button>
          ))}
        </div>
      </section>}

      {selectedWords.length > 0 && <div className="emotion-selected-words">
        <div className="emotion-selected-heading"><strong>Your words, for now</strong><span aria-live="polite">{selectedWords.length} of 3</span></div>
        <div className="emotion-selected-list" role="group" aria-label="Selected feeling words">
          {selectedWords.map((id) => {
            const term = getEmotionTerm(id);
            if (!term) return null;
            return <button key={id} type="button" className={`filter-chip${activeWordId === id ? ' selected' : ''}`} aria-pressed={activeWordId === id} onClick={() => { setActiveGroupId(term.parent); setActiveWordId(id); }}>{term.label} <span className="emotion-response-mark" aria-label={responses[id] === 'fits' ? 'Fits for now' : responses[id] === 'unsure' ? 'Still exploring' : 'Needs your response'}>{responses[id] === 'fits' ? '✓' : responses[id] === 'unsure' ? '·' : ''}</span></button>;
          })}
        </div>
        {activeTerm && selectedWords.includes(activeTerm.id) && <section className="emotion-definition" aria-live="polite" aria-labelledby="emotion-definition-title">
          <p className="eyebrow">A word to try on · not a diagnosis</p>
          <h3 id="emotion-definition-title">{activeTerm.label}</h3>
          <p>{activeTerm.definition}</p>
          <p className="emotion-check-question">Does this word feel true for you right now?</p>
          <div className="emotion-response-actions" role="group" aria-label={`Does ${activeTerm.label.toLowerCase()} fit?`}>
            <button type="button" className={`button button-small ${responses[activeTerm.id] === 'fits' ? 'button-primary' : 'button-secondary'}`} onClick={() => answerWord('fits')}>Yes, this fits for now</button>
            <button type="button" className={`button button-small ${responses[activeTerm.id] === 'unsure' ? 'button-primary' : 'button-secondary'}`} onClick={() => answerWord('unsure')}>I’m still figuring it out</button>
            <button type="button" className="button button-quiet button-small" onClick={() => answerWord('not-quite')}>Not quite</button>
          </div>
        </section>}
      </div>}

      <p className="emotion-support-note">You are the authority on what you feel. You can choose more than one word, keep it uncertain, or leave it here.</p>
      <div className="daily-check-in__next action-row">
        <button type="button" className="button button-primary" disabled={!ready || saving || !hasChanges || !selectedMood || !allWordsReviewed} aria-busy={saving || undefined} onClick={() => void saveCheckIn()}>
          <Check size={15} aria-hidden="true" /> {saving ? 'Saving…' : todayCheckIn ? 'Update today’s check-in' : 'Save today’s check-in'}
        </button>
        {needsPause && <Link to="/reset" className="button button-secondary button-small"><Wind size={14} aria-hidden="true" /> Take a 90-second pause</Link>}
        {journalState && allWordsReviewed && <Link to="/journal" state={journalState} className="button button-quiet button-small"><BookOpen size={14} aria-hidden="true" /> Write a reflection, if it helps</Link>}
      </div>
      {!ready && <p className="fine-print" role="status">Opening today’s private check-in…</p>}
      {ready && selectedWords.length > 0 && !allWordsReviewed && <p className="fine-print">Choose how each selected word feels to you before saving. You can leave it uncertain.</p>}
    </section>
  );
});
