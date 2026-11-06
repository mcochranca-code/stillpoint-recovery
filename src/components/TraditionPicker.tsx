import { useId } from 'react';
import { TRADITIONS, normalizeTraditionPreference } from '../domain/traditions';
import type { TraditionId, TraditionMode, TraditionPreference } from '../domain/types';
import { TraditionMotif } from './TraditionMotif';

const MODE_OPTIONS: Array<{ id: TraditionMode; label: string; hint: string }> = [
  { id: 'one', label: 'One tradition', hint: 'A reading from the same tradition each day' },
  { id: 'several', label: 'A few I choose', hint: 'Your chosen traditions take turns, one per day' },
  { id: 'rotate', label: 'Rotate through all', hint: 'A different tradition each day' },
];

interface TraditionPickerProps {
  value: TraditionPreference;
  onChange: (next: TraditionPreference) => void;
  /** Heading text for the group; shown as the fieldset legend. */
  legend?: string;
}

/**
 * Accessible tradition chooser built from native radio buttons and checkboxes inside labelled
 * fieldsets, so it works with keyboards, screen readers and browser zoom without extra ARIA.
 */
export function TraditionPicker({ value, onChange, legend = 'Daily reading tradition' }: TraditionPickerProps) {
  const id = useId();
  const current = normalizeTraditionPreference(value);
  const multiple = current.mode === 'several';

  function setMode(mode: TraditionMode) {
    if (mode === current.mode) return;
    if (mode === 'one') onChange({ mode, traditions: [current.traditions[0] ?? 'christian'] });
    else onChange({ mode, traditions: current.traditions });
  }

  function toggle(tradition: TraditionId, checked: boolean) {
    if (!multiple) { onChange({ mode: 'one', traditions: [tradition] }); return; }
    const next = checked ? [...current.traditions, tradition] : current.traditions.filter((item) => item !== tradition);
    if (!next.length) return; // Keep at least one; the hint explains this.
    onChange({ mode: 'several', traditions: next });
  }

  return (
    <fieldset className="tradition-picker">
      <legend>{legend}</legend>
      <p className="fine-print">Choose where your daily reading comes from. This choice stays on this device, and you can change it at any time.</p>
      <fieldset className="tradition-mode">
        <legend className="sr-only">How readings are chosen</legend>
        {MODE_OPTIONS.map((option) => (
          <label key={option.id} className={`tradition-mode-option${current.mode === option.id ? ' selected' : ''}`}>
            <input type="radio" name={`${id}-mode`} value={option.id} checked={current.mode === option.id} onChange={() => setMode(option.id)} />
            <span><strong>{option.label}</strong><small>{option.hint}</small></span>
          </label>
        ))}
      </fieldset>
      {current.mode === 'rotate' ? (
        <p className="tradition-rotate-note">Every tradition takes a turn: {TRADITIONS.map((tradition) => tradition.label).join(', ')}.</p>
      ) : (
        <fieldset className="tradition-options" aria-describedby={multiple ? `${id}-hint` : undefined}>
          <legend className="sr-only">{multiple ? 'Traditions to include' : 'Tradition'}</legend>
          {multiple && <p id={`${id}-hint`} className="fine-print">Choose one or more. At least one stays selected.</p>}
          {TRADITIONS.map((tradition) => {
            const checked = current.traditions.includes(tradition.id);
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
