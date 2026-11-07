import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, HeartHandshake, Leaf, ShieldCheck } from 'lucide-react';
import { CURRENT_SCHEMA_VERSION, db } from '../db/database';
import { defaultPreferences } from '../db/repository';
import { colorThemePresets } from '../data/themes';
import { dateOnlyToTimestamp, localDateKey } from '../domain/time';
import type { ColorTheme, ThemeMode } from '../domain/types';
import { clearLocalSignal, readLocalSignal, writeLocalSignal } from '../platform/localSignals';
import { useAppContext } from './AppContext';

const focusOptions = [
  { id: '', label: 'I’d rather not say' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'substances', label: 'Substances' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'custom', label: 'A focus of my choice' },
];

const TOTAL_STEPS = 2;

/** Fields kept on this device while setup is in progress, so leaving midway never loses them. */
export interface OnboardingDraft {
  step: number;
  startDate: string;
  startTime: string;
  focus: string;
  customFocus: string;
  intention: string;
  theme: ThemeMode;
  colorTheme: ColorTheme;
  liveCounter: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

function readDraft(): Partial<OnboardingDraft> {
  const raw = readLocalSignal('onboardingDraft');
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Partial<OnboardingDraft> : {};
  } catch { return {}; }
}

/** Guide a short, skippable first-time setup. Every field is optional and progress resumes if the app is closed. */
export default function Onboarding() {
  const { preferences, profile, notify } = useAppContext();
  const [draft] = useState(readDraft);
  const [step, setStep] = useState(() => Math.min(TOTAL_STEPS - 1, Math.max(0, Number(draft.step) || 0)));
  const [startDate, setStartDate] = useState(draft.startDate ?? profile?.localStartDate ?? '');
  const [startTime, setStartTime] = useState(draft.startTime ?? profile?.localStartTime ?? '');
  const [focus, setFocus] = useState(draft.focus ?? profile?.focus ?? '');
  const [customFocus, setCustomFocus] = useState(draft.customFocus ?? '');
  const [intention, setIntention] = useState(draft.intention ?? profile?.intention ?? '');
  const [theme, setTheme] = useState<ThemeMode>(draft.theme ?? preferences?.theme ?? 'system');
  const [colorTheme, setColorTheme] = useState<ColorTheme>(draft.colorTheme ?? preferences?.colorTheme ?? 'stillpoint');
  const [liveCounter, setLiveCounter] = useState(draft.liveCounter ?? preferences?.liveCounter ?? true);
  const [highContrast, setHighContrast] = useState(draft.highContrast ?? preferences?.highContrast ?? false);
  const [reducedMotion, setReducedMotion] = useState(draft.reducedMotion ?? preferences?.reducedMotion ?? false);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const resumed = useRef(Boolean(draft.step));
  const today = localDateKey(new Date());

  useEffect(() => {
    const next: OnboardingDraft = { step, startDate, startTime, focus, customFocus, intention, theme, colorTheme, liveCounter, highContrast, reducedMotion };
    writeLocalSignal('onboardingDraft', JSON.stringify(next));
  }, [step, startDate, startTime, focus, customFocus, intention, theme, colorTheme, liveCounter, highContrast, reducedMotion]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);

  async function finish(configureDate: boolean) {
    setBusy(true);
    try {
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
        id: 'recovery-profile', schemaVersion: CURRENT_SCHEMA_VERSION, startAt, localStartDate: selectedDate,
        localStartTime: selectedTime, startTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        focus: configureDate ? (focus === 'custom' ? customFocus.trim() : focus) : (profile?.focus ?? ''),
        intention: configureDate ? intention.trim() : (profile?.intention ?? ''), updatedAt: new Date().toISOString(),
      });
      const current = preferences ?? defaultPreferences();
      // Comfort choices (contrast, motion, appearance) apply even when the rest of setup is skipped.
      await db.preferences.put({
        ...current, onboardingComplete: true, theme, colorTheme, liveCounter, highContrast, reducedMotion,
        updatedAt: new Date().toISOString(),
      });
      if (configureDate && intention.trim()) {
        await db.earnedCharms.put({ id: 'charm:first-light', charmId: 'first-light', earnedAt: new Date().toISOString() });
      }
      clearLocalSignal('onboardingDraft');
      notify(configureDate && startDate ? 'Your recovery date is saved on this device. Your path is yours to shape.' : 'Welcome. Everything else can wait until you’re ready.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Your settings could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const comfortSettings = <details className="onboarding-more">
    <summary>Comfort &amp; accessibility <span className="optional-label">Optional</span></summary>
    <label className="toggle-row"><span><strong>High contrast</strong><small>Strengthen text and borders</small></span><input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /></label>
    <label className="toggle-row"><span><strong>Reduced motion</strong><small>Minimize nonessential animation</small></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
    <label className="field-label" htmlFor="theme">Appearance</label>
    <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select>
    <label className="field-label" htmlFor="color-theme">Color palette</label>
    <select id="color-theme" value={colorTheme} onChange={(event) => setColorTheme(event.target.value as ColorTheme)}>{colorThemePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
    <label className="toggle-row"><span><strong>Live timer</strong><small>Show days, hours, minutes and seconds</small></span><input type="checkbox" checked={liveCounter} onChange={(event) => setLiveCounter(event.target.checked)} /></label>
  </details>;

  return (
    <main className="onboarding-wrap">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-brand"><img src="/assets/branding/stillpoint-logo.svg" alt="Stillpoint Recovery" /></div>
        <div className="step-indicator" role="img" aria-label={`Setup step ${step + 1} of ${TOTAL_STEPS}`}>{Array.from({ length: TOTAL_STEPS }, (_, index) => <span key={index} className={step >= index ? 'complete' : ''}></span>)}</div>
        {step === 0 && <div className="onboarding-content">
          <div className="onboarding-icon"><Leaf size={27} aria-hidden="true" /></div>
          <p className="eyebrow">A quiet place to begin again</p>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>One day is enough for today.</h1>
          <p className="lead">Stillpoint is a private space for reflection, recovery practices and the progress that matters to you. Setup takes under a minute, and every question is optional.</p>
          <div className="privacy-note"><ShieldCheck size={20} aria-hidden="true" /><p><strong>Your recovery stays in this browser profile on this device.</strong><br />No account, cloud sync, ads or analytics. Storage is not encrypted. Clearing site data, removing the browser profile, or uninstalling may erase it—download a private backup in Settings to keep a copy.</p></div>
          {comfortSettings}
          <button className="button button-primary button-wide" onClick={() => setStep(1)}>Make this space yours <ArrowRight size={17} aria-hidden="true" /></button>
          <button className="button button-secondary button-wide" disabled={busy} onClick={() => void finish(false)}>Explore first, set up later</button>
        </div>}
        {step === 1 && <div className="onboarding-content">
          <div className="onboarding-icon"><HeartHandshake size={26} aria-hidden="true" /></div>
          <p className="eyebrow">{resumed.current ? 'Picking up where you left off' : 'Optional, always in your control'}</p>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>Anything you’d like to remember?</h1>
          <p className="lead">Leave any of this blank. You can add or change it later from Today.</p>
          <label className="field-label" htmlFor="recovery-date">Recovery start date <span className="optional-label">Optional</span></label>
          <input id="recovery-date" type="date" max={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <label className="field-label" htmlFor="recovery-time">Start time <span className="optional-label">Optional</span></label>
          <input id="recovery-time" type="time" value={startTime} disabled={!startDate} onChange={(event) => setStartTime(event.target.value)} />
          <label className="field-label" htmlFor="intention">A personal intention <span className="optional-label">Optional</span></label>
          <textarea id="intention" rows={3} maxLength={240} placeholder="What would you like to remember on this journey?" value={intention} onChange={(event) => setIntention(event.target.value)} />
          <details className="onboarding-more">
            <summary>Recovery focus <span className="optional-label">Optional</span></summary>
            <label className="field-label" htmlFor="recovery-focus">Recovery focus</label>
            <select id="recovery-focus" value={focus} onChange={(event) => setFocus(event.target.value)}>{focusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
            {focus === 'custom' && <input aria-label="Custom recovery focus" placeholder="Your focus, if you wish" value={customFocus} onChange={(event) => setCustomFocus(event.target.value)} />}
          </details>
          <p className="fine-print">Reminders are offered later, only if they would help—never on first launch.</p>
          <div className="onboarding-actions"><button className="button button-quiet" onClick={() => setStep(0)}><ArrowLeft size={16} aria-hidden="true" /> Back</button><button className="button button-primary" disabled={busy} onClick={() => void finish(true)}>{busy ? 'Saving…' : 'Open my space'} <ArrowRight size={16} aria-hidden="true" /></button></div>
          <button className="skip-setup" disabled={busy} onClick={() => void finish(false)}>Skip these for now</button>
        </div>}
      </section>
    </main>
  );
}
