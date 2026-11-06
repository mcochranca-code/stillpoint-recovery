import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { ensureDefaults } from '../db/repository';
import { getNextDailyReminderAt, getNextMeetingReminder, isDailyReminderDue } from '../domain/reminders';
import { localDateKey } from '../domain/time';
import type { MeetingReminder, RecoveryProfile, UserPreferences } from '../domain/types';

interface AppContextValue {
  preferences: UserPreferences | undefined;
  profile: RecoveryProfile | undefined;
  ready: boolean;
  storageError: string | null;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const preferences = useLiveQuery(() => db.preferences.get('preferences'), []);
  const profile = useLiveQuery(() => db.recoveryProfiles.get('recovery-profile'), []);
  const meetingReminders = useLiveQuery(() => db.meetingReminders.toArray(), []);
  const [initialized, setInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    ensureDefaults().then(() => {
      if (alive) setInitialized(true);
    }).catch(() => {
      if (alive) {
        setStorageError('Local storage could not be opened. Your browser may be out of space or have storage disabled.');
        setInitialized(true);
      }
    });
    return () => { alive = false; };
  }, []);

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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<AppContextValue>(() => ({
    preferences,
    profile,
    ready: initialized && Boolean(preferences) && Boolean(profile),
    storageError,
    updatePreferences: async (updates) => {
      await db.preferences.update('preferences', { ...updates, updatedAt: new Date().toISOString() });
    },
    updateProfile: async (updates) => {
      await db.recoveryProfiles.update('recovery-profile', { ...updates, updatedAt: new Date().toISOString() });
    },
    notify: (message) => setNotice(message),
  }), [preferences, profile, initialized, storageError]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{notice && <div className="toast">{notice}</div>}</div>
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider.');
  return value;
}
