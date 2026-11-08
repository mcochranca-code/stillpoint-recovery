import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppContext } from '../../app/AppContext';
import { TraditionPicker } from '../../components/TraditionPicker';
import type { TraditionPreference } from '../../domain/types';

interface ChooseReadingsCardProps {
  icon: ReactNode;
  onNotNow: () => void;
}

/**
 * A soft invitation on Today for someone who has not chosen where readings come from.
 * One tap opens the same accessible picker used in onboarding and Settings, with nothing
 * pre-selected. Until a choice is saved, the daily reading stays neutral.
 */
export function ChooseReadingsCard({ icon, onNotNow }: ChooseReadingsCardProps) {
  const { updatePreferences, notify } = useAppContext();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<TraditionPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [open]);

  async function save() {
    if (!choice) return;
    setSaving(true);
    try {
      await updatePreferences({ traditionPreference: choice, traditionChoicePending: false });
      notify('Your reading choice is saved on this device. You can change it any time in Settings.');
    } catch {
      notify('Your choice could not be saved. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <section className="card today-nudge choose-readings" aria-labelledby="today-nudge-title">
      <span className="today-nudge__icon" aria-hidden="true">{icon}</span>
      <div className="today-nudge__copy">
        <p className="eyebrow">Your path, your words</p>
        <h2 id="today-nudge-title">Choose your readings</h2>
        <p className="muted">Pick one tradition, a few that take turns, all of them, or spiritual but not religious. Until you choose, your daily reading needs no faith.</p>
        {!open && <div className="action-row">
          <button type="button" className="button button-primary button-small" onClick={() => setOpen(true)}>Choose your readings</button>
          <button type="button" className="button button-quiet button-small" onClick={onNotNow}>Not now</button>
        </div>}
        {open && <div ref={panelRef} className="choose-readings__panel">
            <TraditionPicker legend="Your daily readings" value={choice} onChange={setChoice} />
            <div className="action-row">
              <button type="button" className="button button-primary button-small" disabled={!choice || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save my choice'}</button>
              <button type="button" className="button button-quiet button-small" onClick={() => { setOpen(false); setChoice(null); }}>Cancel</button>
            </div>
            {!choice && <p className="fine-print">Choose a tradition, or Rotate through all, to save.</p>}
        </div>}
      </div>
    </section>
  );
}
