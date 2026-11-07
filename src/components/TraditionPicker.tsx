import { useId, useState } from 'react';
import { TRADITIONS, normalizeTraditionPreference } from '../domain/traditions';
import type { TraditionId, TraditionMode, TraditionPreference } from '../domain/types';
import { TraditionMotif } from './TraditionMotif';

const MODE_OPTIONS: Array<{ id: TraditionMode; label: string; hint: string }> = [
  { id: 'one', label: 'One tradition', hint: 'A reading from the same tradition each day' },
  { id: 'several', label: 'A few I choose', hint: 'Your chosen traditions take turns, one per day' },
  { id: 'rotate', label: 'Rotate through all', hint: 'A different tradition each day' },
];

interface TraditionPickerProps {
  /** The current choice, or null when the person has not chosen yet (nothing is pre-selected). */
  value: TraditionPreference | null;
  onChange: (next: TraditionPreference) => void;
  /** Heading text for the group; shown as the fieldset legend. */
  legend?: string;
}

/**
 * Accessible tradition chooser built from native radio buttons and checkboxes inside labelled
 * fieldsets, so it works with keyboards, screen readers and browser zoom without extra ARIA.
 * With no value, nothing is selected: picking a tradition card chooses "One tradition", and
 * picking a mode first waits for a tradition before reporting a choice.
 */
export function TraditionPicker({ value, onChange, legend = 'Daily reading tradition' }: TraditionPickerProps) {
  const id = useId();
  // A mode picked before any tradition is (first run, or leaving "Rotate through all"), so the
  // mode shows as selected while no tradition is quietly chosen on the person's behalf.
  const [draftMode, setDraftMode] = useState<TraditionMode | null>(null);
  const current = value ? normalizeTraditionPreference(value) : null;
  const drafting = draftMode !== null && (!current || current.mode === 'rotate');
  const mode: TraditionMode | null = drafting ? draftMode : current?.mode ?? null;
  const selected: TraditionId[] = !drafting && current && current.mode !== 'rotate' ? current.traditions : [];
  const multiple = mode === 'several';

  function choose(next: TraditionPreference) { setDraftMode(null); onChange(next); }

  function setMode(next: TraditionMode) {
    if (next === mode) return;
    if (next === 'rotate') { choose({ mode: 'rotate', traditions: TRADITIONS.map((tradition) => tradition.id) }); return; }
    if (!selected.length) { setDraftMode(next); return; }
    choose(next === 'one' ? { mode: 'one', traditions: [selected[0]!] } : { mode: 'several', traditions: selected });
  }

  function toggle(tradition: TraditionId, checked: boolean) {
    if (!multiple) { choose({ mode: 'one', traditions: [tradition] }); return; }
    const next = checked ? [...selected, tradition] : selected.filter((item) => item !== tradition);
    if (!next.length) return; // Keep at least one once chosen; the hint explains this.
    choose({ mode: 'several', traditions: next });
  }

  return (
    <fieldset className="tradition-picker">
      <legend>{legend}</legend>
      <p className="fine-print">Choose where your daily reading comes from. This choice stays on this device, and you can change it at any time.</p>
      <fieldset className="tradition-mode">
        <legend className="sr-only">How readings are chosen</legend>
        {MODE_OPTIONS.map((option) => (
          <label key={option.id} className={`tradition-mode-option${mode === option.id ? ' selected' : ''}`}>
            <input type="radio" name={`${id}-mode`} value={option.id} checked={mode === option.id} onChange={() => setMode(option.id)} />
            <span><strong>{option.label}</strong><small>{option.hint}</small></span>
          </label>
        ))}
      </fieldset>
      {mode === 'rotate' ? (
        <p className="tradition-rotate-note">Every tradition takes a turn: {TRADITIONS.map((tradition) => tradition.label).join(', ')}.</p>
      ) : (
        <fieldset className="tradition-options" aria-describedby={multiple ? `${id}-hint` : undefined}>
          <legend className="sr-only">{multiple ? 'Traditions to include' : 'Tradition'}</legend>
          {multiple && <p id={`${id}-hint`} className="fine-print">Choose one or more. At least one stays selected.</p>}
          {TRADITIONS.map((tradition) => {
            const checked = selected.includes(tradition.id);
            return (
              <label key={tradition.id} className={`tradition-option tradition-${tradition.id}${checked ? ' selected' : ''}`}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={`${id}-tradition`}
                  value={tradition.id}
                  checked={checked}
                  aria-describedby={`${id}-${tradition.id}-desc`}
                  onChange={(event) => toggle(tradition.id, event.target.checked)}
                />
                <TraditionMotif tradition={tradition.id} />
                <span className="tradition-option-copy">
                  <strong>{tradition.label}</strong>
                  <small id={`${id}-${tradition.id}-desc`}>{tradition.description} <span className="tradition-sources">{tradition.sources}</span></small>
                </span>
                <span className="tradition-option-state" aria-hidden="true">{checked ? 'Chosen' : ''}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </fieldset>
  );
}
