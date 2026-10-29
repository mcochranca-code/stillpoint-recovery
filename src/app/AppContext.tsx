import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CURRENT_SCHEMA_VERSION, db } from '../db/database';
import { ensureDefaults } from '../db/repository';
import type { RecoveryProfile, UserPreferences } from '../domain/types';
import { getNextDailyReminderAt, getNextMeetingReminder } from '../domain/reminders';

async function deliverLocalNotification(title: string, body: string, tag: string) {
  const options: NotificationOptions = { body, tag };
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined;
    if (registration?.showNotification) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch { /* Browser notification delivery is best-effort and can be unavailable. */ }
}

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

/** Load local preferences/profile and expose their state and update actions to the app. */
export function AppProvider({ children }: { children: ReactNode }) {
  const preferences = useLiveQuery(() => db.preferences.get('preferences'), []);
  const profile = useLiveQuery(() => db.recoveryProfiles.get('recovery-profile'), []);
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
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let timer: number | undefined;
    let cancelled = false;
    const schedule = async () => {
      if (cancelled) return;
      const current = await db.preferences.get('preferences');
      if (cancelled || !current) return;
      const now = new Date();
      const dailyAt = current.reminderEnabled ? getNextDailyReminderAt(now, current.reminderTime) : null;
      const meetingReminders = current.meetingReminders ?? [];
      const listings = meetingReminders.length
        ? (await import('../data/meetings')).meetingListings
        : [];
      if (cancelled) return;
      const meetingReminder = getNextMeetingReminder(meetingReminders, listings, now);
      const nextAt = dailyAt && (!meetingReminder || dailyAt.getTime() <= meetingReminder.notifyAt.getTime())
        ? dailyAt
        : meetingReminder?.notifyAt;
      if (!nextAt) return;

      const delay = Math.max(1000, Math.min(2_147_000_000, nextAt.getTime() - Date.now()));
      timer = window.setTimeout(() => {
        void (async () => {
          if (dailyAt && dailyAt.getTime() <= nextAt.getTime() && (!meetingReminder || dailyAt.getTime() <= meetingReminder.notifyAt.getTime())) {
            const latest = await db.preferences.get('preferences');
            if (latest?.reminderEnabled) {
              await deliverLocalNotification('Stillpoint', 'A quiet meditation moment is here, if it helps.', 'stillpoint-daily-meditation');
            }
          } else if (meetingReminder) {
            const latest = await db.preferences.get('preferences');
            const saved = latest?.meetingReminders?.find((item) => item.id === meetingReminder.reminder.id);
            const occurrenceAt = meetingReminder.meetingStartsAt.toISOString();
            if (saved && saved.lastNotifiedOccurrenceAt !== occurrenceAt) {
              await deliverLocalNotification('Stillpoint reminder', 'A meeting reminder you set is coming up, if it helps.', 'stillpoint-meeting-reminder');
              const meetingReminders = (latest?.meetingReminders ?? []).map((item) => item.id === saved.id
                ? { ...item, lastNotifiedOccurrenceAt: occurrenceAt }
                : item);
              await db.preferences.update('preferences', { meetingReminders, schemaVersion: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() });
            }
          }
          await schedule();
        })().catch(() => { void schedule(); });
      }, delay);
    };
    void schedule();
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [preferences?.reminderEnabled, preferences?.reminderTime, preferences?.meetingReminders]);

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
      await db.preferences.update('preferences', { schemaVersion: CURRENT_SCHEMA_VERSION, ...updates, updatedAt: new Date().toISOString() });
    },
    updateProfile: async (updates) => {
      await db.recoveryProfiles.update('recovery-profile', { schemaVersion: CURRENT_SCHEMA_VERSION, ...updates, updatedAt: new Date().toISOString() });
    },
    notify: (message) => setNotice(message),
  }), [preferences, profile, initialized, storageError]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">{notice && <div className="toast">{notice}</div>}</div>
    </AppContext.Provider>
  );
}

/** Read the application context, throwing when used outside its provider. */
export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider.');
  return value;
}
