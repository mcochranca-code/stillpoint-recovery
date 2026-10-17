import { useState } from 'react';
import { ArrowLeft, ArrowRight, HeartHandshake, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { db } from '../db/database';
import { defaultPreferences } from '../db/repository';
import { colorThemePresets } from '../data/themes';
import { dateOnlyToTimestamp, localDateKey } from '../domain/time';
import type { ColorTheme, ThemeMode } from '../domain/types';
import { useAppContext } from './AppContext';

const focusOptions = [
  { id: '', label: 'I’d rather not say' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'substances', label: 'Substances' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'custom', label: 'A focus of my choice' },
];

export default function Onboarding() {
  const { preferences, profile, notify } = useAppContext();
  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState(profile?.localStartDate ?? '');
  const [startTime, setStartTime] = useState(profile?.localStartTime ?? '');
  const [focus, setFocus] = useState(profile?.focus ?? '');
  const [customFocus, setCustomFocus] = useState('');
  const [intention, setIntention] = useState(profile?.intention ?? '');
  const [theme, setTheme] = useState<ThemeMode>(preferences?.theme ?? 'system');
  const [colorTheme, setColorTheme] = useState<ColorTheme>(preferences?.colorTheme ?? 'stillpoint');
  const [liveCounter, setLiveCounter] = useState(preferences?.liveCounter ?? true);
  const [highContrast, setHighContrast] = useState(preferences?.highContrast ?? false);
  const [reducedMotion, setReducedMotion] = useState(preferences?.reducedMotion ?? false);
  const [reminderEnabled, setReminderEnabled] = useState(preferences?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(preferences?.reminderTime ?? '19:00');
  const [busy, setBusy] = useState(false);
  const today = localDateKey(new Date());

  async function finish(configureDate: boolean) {
    setBusy(true);
    try {
      let remindersOn = false;
      if (reminderEnabled && 'Notification' in window) {
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        remindersOn = permission === 'granted';
      }
      let startAt = profile?.startAt ?? null;
      let selectedDate = profile?.localStartDate ?? null;
      let selectedTime = profile?.localStartTime ?? null;
      if (configureDate && startDate) {
        if (startDate > today) throw new Error('Choose today or an earlier date. You can change it whenever you need.');
        selectedTime = startTime || '00:00';
        startAt = dateOnlyToTimestamp(startDate, selectedTime);
        selectedDate = startDate;
      }
      await db.recoveryProfiles.put({
        id: 'recovery-profile', schemaVersion: 1, startAt, localStartDate: selectedDate,
        localStartTime: selectedTime, startTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        focus: focus === 'custom' ? customFocus.trim() : focus, intention: intention.trim(), updatedAt: new Date().toISOString(),
      });
      const current = preferences ?? defaultPreferences();
      await db.preferences.put({
        ...current, onboardingComplete: true, theme, colorTheme, liveCounter, highContrast, reducedMotion,
        reminderEnabled: remindersOn, reminderTime,
        updatedAt: new Date().toISOString(),
      });
      if (intention.trim()) {
        await db.earnedCharms.put({ id: 'charm:first-light', charmId: 'first-light', earnedAt: new Date().toISOString() });
      }
      notify(reminderEnabled && !remindersOn ? 'Setup is saved. Browser reminders were not enabled; you can choose again in Settings.' : configureDate && startDate ? 'Your recovery date is saved on this device. Your path is yours to shape.' : 'You can set a recovery date later, whenever you feel ready.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Your settings could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-wrap">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-brand"><img src="/assets/branding/stillpoint-logo.svg" alt="Stillpoint Recovery" /></div>
        <div className="step-indicator" aria-label={`Setup step ${step + 1} of 3`}><span className={step >= 0 ? 'complete' : ''}></span><span className={step >= 1 ? 'complete' : ''}></span><span className={step >= 2 ? 'complete' : ''}></span></div>
        {step === 0 && <div className="onboarding-content">
          <div className="onboarding-icon"><Leaf size={27} /></div>
          <p className="eyebrow">A quiet place to begin again</p>
          <h1 id="onboarding-title">One day is enough for today.</h1>
          <p className="lead">Stillpoint is a private space for reflection, recovery practices and the progress that matters to you.</p>
          <div className="privacy-note"><ShieldCheck size={20} /><p><strong>Your recovery stays on this device.</strong><br />No account, cloud sync, ads or analytics. Browser storage is not encrypted and can be lost if site data is cleared—use the backup option in Settings to keep a copy.</p></div>
          <button className="button button-primary button-wide" onClick={() => setStep(1)}>Make this space yours <ArrowRight size={17} /></button>
        </div>}
        {step === 1 && <div className="onboarding-content">
          <div className="onboarding-icon"><HeartHandshake size={26} /></div>
          <p className="eyebrow">Optional, always in your control</p>
          <h1 id="onboarding-title">Choose what you’d like to keep track of.</h1>
          <label className="field-label" htmlFor="recovery-date">Recovery start date <span className="optional-label">Optional</span></label>
          <input id="recovery-date" type="date" max={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <label className="field-label" htmlFor="recovery-time">Start time <span className="optional-label">Optional</span></label>
          <input id="recovery-time" type="time" value={startTime} disabled={!startDate} onChange={(event) => setStartTime(event.target.value)} />
          <label className="field-label" htmlFor="recovery-focus">Recovery focus <span className="optional-label">Optional</span></label>
          <select id="recovery-focus" value={focus} onChange={(event) => setFocus(event.target.value)}>{focusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
          {focus === 'custom' && <input aria-label="Custom recovery focus" placeholder="Your focus, if you wish" value={customFocus} onChange={(event) => setCustomFocus(event.target.value)} />}
          <label className="field-label" htmlFor="intention">A personal intention <span className="optional-label">Optional</span></label>
          <textarea id="intention" rows={3} maxLength={240} placeholder="What would you like to remember on this journey?" value={intention} onChange={(event) => setIntention(event.target.value)} />
          <div className="onboarding-actions"><button className="button button-quiet" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button></div>
        </div>}
        {step === 2 && <div className="onboarding-content">
          <div className="onboarding-icon"><Sparkles size={26} /></div>
          <p className="eyebrow">Make it comfortable</p>
          <h1 id="onboarding-title">Choose a few gentle preferences.</h1>
          <label className="field-label" htmlFor="theme">Appearance</label>
          <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select>
          <label className="field-label" htmlFor="color-theme">Color palette</label>
          <select id="color-theme" value={colorTheme} onChange={(event) => setColorTheme(event.target.value as ColorTheme)}>{colorThemePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
          <label className="toggle-row"><span><strong>Live timer</strong><small>Show days, hours, minutes and seconds</small></span><input type="checkbox" checked={liveCounter} onChange={(event) => setLiveCounter(event.target.checked)} /></label>
          <label className="toggle-row"><span><strong>High contrast</strong><small>Strengthen text and borders</small></span><input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /></label>
          <label className="toggle-row"><span><strong>Reduced motion</strong><small>Minimize nonessential animation</small></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
          <label className="toggle-row"><span><strong>Optional browser reminder</strong><small>{'Notification' in window ? 'Only enable if a gentle reminder would help. Wording is neutral.' : 'This browser does not support notifications.'}</small></span><input type="checkbox" checked={reminderEnabled} disabled={!('Notification' in window)} onChange={(event) => setReminderEnabled(event.target.checked)} /></label>
          <label className="field-label" htmlFor="reminder-time">Reminder time</label><input id="reminder-time" type="time" value={reminderTime} disabled={!reminderEnabled} onChange={(event) => setReminderTime(event.target.value)} />
          <p className="fine-print">Reminders are optional. Enabling asks the browser for permission; closed-app delivery depends on browser support.</p>
          <div className="onboarding-actions"><button className="button button-quiet" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" disabled={busy} onClick={() => void finish(true)}>{busy ? 'Saving…' : 'Finish setup'} <ArrowRight size={16} /></button></div>
        </div>}
        <button className="skip-setup" disabled={busy} onClick={() => void finish(false)}>Skip optional setup for now</button>
      </section>
    </main>
  );
}
