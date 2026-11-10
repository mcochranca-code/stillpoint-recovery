import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { classifyStorageError, describeStorageFailure, openLocalDatabase, retryOpenLocalDatabase, type StorageFailure } from '../db/storageHealth';
import { logDiagnostic } from '../platform/diagnostics';
import { getNextDailyReminderAt, getNextMeetingReminder, isDailyReminderDue } from '../domain/reminders';
import { localDateKey } from '../domain/time';
import { daypartFor } from '../domain/daypart';
import type { MeetingReminder, RecoveryProfile, UserPreferences } from '../domain/types';
import { applyThemeIdentity } from '../platform/themeIdentity';

interface AppContextValue {
  preferences: UserPreferences | undefined;
  profile: RecoveryProfile | undefined;
  ready: boolean;
  /** Person-facing explanation when local storage could not be opened; null when it is healthy. */
  storageError: string | null;
  /** Category and error name of a storage-open failure, for the recovery screen. */
  storageFailure?: StorageFailure | null;
  /** Close any failed connection and try opening local storage again. Never clears records. */
  retryStorage?: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (updates: Partial<RecoveryProfile>) => Promise<void>;
  notify: (message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const DAILY_REMINDER_STORAGE_KEY = 'stillpoint-daily-reminder-last-attempt-v1';
type ReminderPath = '/' | '/meditation' | '/meetings';

function readLastDailyReminderDate(): string | undefined {
  try { return window.localStorage.getItem(DAILY_REMINDER_STORAGE_KEY) ?? undefined; }
  catch { return undefined; }
}

async function showLocalReminder(body: string, tag: string, path: ReminderPath): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = {
    body,
    tag,
    icon: '/assets/branding/app-icon.svg',
    data: { path },
  };
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification('Stillpoint', options);
        return true;
      }
    } catch { /* Fall back to the browser's page notification when available. */ }
  }
  try {
    const notification = new Notification('Stillpoint', options);
    notification.onclick = () => { window.focus(); window.location.assign(path); };
    return true;
  } catch { return false; }
}

type StorageStatus = 'opening' | 'open' | 'failed';

/**
 * Opens local storage before any screen reads it. If opening fails, the app shows a recovery screen
 * instead of crashing; retrying remounts the live data layer so every query starts fresh.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StorageStatus>('opening');
  const [failure, setFailure] = useState<StorageFailure | null>(null);
  const [generation, setGeneration] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('opening');
    (generation === 0 ? openLocalDatabase() : retryOpenLocalDatabase()).then(() => {
      if (!alive) return;
      setFailure(null);
      setStatus('open');
    }).catch((error: unknown) => {
      if (!alive) return;
      const classified = classifyStorageError(error);
      logDiagnostic({ level: 'error', event: 'storage-open-failed', error: classified.errorName });
      setFailure(classified);
      setStatus('failed');
    });
    return () => { alive = false; };
  }, [generation]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const retryStorage = useCallback(() => setGeneration((value) => value + 1), []);

  return (
    <LiveDataProvider key={generation} status={status} failure={failure} retryStorage={retryStorage} notify={setNotice}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{notice && <div className="toast">{notice}</div>}</div>
    </LiveDataProvider>
  );
}

interface LiveDataProviderProps {
  children: ReactNode;
  status: StorageStatus;
  failure: StorageFailure | null;
  retryStorage: () => void;
  notify: (message: string) => void;
}

/** Reads only after storage has opened; a read that fails resolves to nothing rather than crashing the shell. */
function readSafely<T>(enabled: boolean, read: () => Promise<T>): Promise<T | undefined> | undefined {
  if (!enabled) return undefined;
  return read().catch((error: unknown) => {
    logDiagnostic({ level: 'warning', event: 'storage-read-failed', error });
    return undefined;
  });
}

function LiveDataProvider({ children, status, failure, retryStorage, notify }: LiveDataProviderProps) {
  const open = status === 'open';
  const preferences = useLiveQuery(() => readSafely(open, () => db.preferences.get('preferences')), [open]);
  const profile = useLiveQuery(() => readSafely(open, () => db.recoveryProfiles.get('recovery-profile')), [open]);
  const meetingReminders = useLiveQuery(() => readSafely(open, () => db.meetingReminders.toArray()), [open]);

  useEffect(() => {
    if (preferences?.colorTheme) applyThemeIdentity(preferences.colorTheme);
  }, [preferences?.colorTheme]);

  useEffect(() => {
    if (!preferences) return;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyAppearance = () => {
      root.classList.toggle('dark', preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches));
      const canvasColor = getComputedStyle(root).getPropertyValue('--canvas').trim();
      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeColor && canvasColor) themeColor.content = canvasColor;
    };
    root.dataset.colorTheme = preferences.colorTheme ?? 'stillpoint';
    applyAppearance();
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('reduce-motion', preferences.reducedMotion);
    root.classList.toggle('discreet-mode', preferences.discreetMode);
    document.title = preferences.discreetMode ? 'Stillpoint' : 'Stillpoint Recovery';
    root.style.setProperty('--text-scale', String(preferences.textScale));
    if (preferences.theme === 'system') media.addEventListener('change', applyAppearance);
    return () => media.removeEventListener('change', applyAppearance);
  }, [preferences]);

  // Tint the atmospheric background to the local time of day; re-checked every ten minutes.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => { root.dataset.daypart = daypartFor(new Date()); };
    apply();
    const timer = window.setInterval(apply, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const dailyEnabled = Boolean(preferences?.reminderEnabled);
    const selectedMeetings = (meetingReminders ?? []) as MeetingReminder[];
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || (!dailyEnabled && !selectedMeetings.length)) return;

    let stopped = false;
    let checking = false;
    let dailyTimer: number | undefined;
    let nextDailyAt = dailyEnabled ? getNextDailyReminderAt(new Date(), preferences?.reminderTime ?? '') : null;
    let lastDailyDate = readLastDailyReminderDate();

    const armDailyTimer = () => {
      if (dailyTimer !== undefined) window.clearTimeout(dailyTimer);
      if (!dailyEnabled || !nextDailyAt || stopped) return;
      dailyTimer = window.setTimeout(() => { void checkDueReminders(); }, Math.max(1000, nextDailyAt.getTime() - Date.now()));
    };

    const checkDueReminders = async () => {
      if (stopped || checking) return;
      checking = true;
      try {
        const now = new Date();
        if (dailyEnabled && nextDailyAt && isDailyReminderDue(now, nextDailyAt, lastDailyDate)) {
          const date = localDateKey(nextDailyAt);
          lastDailyDate = date;
          try { window.localStorage.setItem(DAILY_REMINDER_STORAGE_KEY, date); } catch { /* Attempt is still de-duplicated in this session. */ }
          await showLocalReminder('A quiet moment for today, if it helps.', `stillpoint-daily-${date}`, '/');
          nextDailyAt = getNextDailyReminderAt(new Date(), preferences?.reminderTime ?? '');
          armDailyTimer();
        } else if (dailyEnabled && nextDailyAt && nextDailyAt.getTime() <= now.getTime()) {
          nextDailyAt = getNextDailyReminderAt(now, preferences?.reminderTime ?? '');
          armDailyTimer();
        }

        if (selectedMeetings.length) {
          const { stanislausMeetingListings } = await import('../data/meetings');
          if (stopped) return;
          const scheduled = getNextMeetingReminder(selectedMeetings, stanislausMeetingListings, now);
          if (scheduled && scheduled.notifyAt.getTime() <= now.getTime()) {
            const occurrenceAt = scheduled.meetingStartsAt.toISOString();
            const current = await db.meetingReminders.get(scheduled.reminder.id);
            if (current && current.lastNotifiedOccurrenceAt !== occurrenceAt && current.lastAttemptedOccurrenceAt !== occurrenceAt) {
              await db.meetingReminders.update(current.id, { lastAttemptedOccurrenceAt: occurrenceAt });
              const delivered = await showLocalReminder('A meeting you saved starts soon.', `stillpoint-meeting-${current.meetingId}-${occurrenceAt}`, '/meetings');
              if (delivered) await db.meetingReminders.update(current.id, { lastNotifiedOccurrenceAt: occurrenceAt });
            }
          }
        }
      } catch { /* Local notification delivery is best-effort; no personal details are logged. */ }
      finally { checking = false; }
    };

    armDailyTimer();
    const meetingTimer = window.setInterval(() => { void checkDueReminders(); }, 30_000);
    document.addEventListener('visibilitychange', checkDueReminders);
    window.addEventListener('focus', checkDueReminders);
    void checkDueReminders();

    return () => {
      stopped = true;
      if (dailyTimer !== undefined) window.clearTimeout(dailyTimer);
      window.clearInterval(meetingTimer);
      document.removeEventListener('visibilitychange', checkDueReminders);
      window.removeEventListener('focus', checkDueReminders);
    };
  }, [preferences?.reminderEnabled, preferences?.reminderTime, meetingReminders]);

  const value = useMemo<AppContextValue>(() => ({
    preferences,
    profile,
    ready: open && Boolean(preferences) && Boolean(profile),
    storageError: failure ? describeStorageFailure(failure.kind) : null,
    storageFailure: failure,
    retryStorage,
    updatePreferences: async (updates) => {
      await db.preferences.update('preferences', { ...updates, updatedAt: new Date().toISOString() });
    },
    updateProfile: async (updates) => {
      await db.recoveryProfiles.update('recovery-profile', { ...updates, updatedAt: new Date().toISOString() });
    },
    notify,
  }), [preferences, profile, open, failure, retryStorage, notify]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider.');
  return value;
}
