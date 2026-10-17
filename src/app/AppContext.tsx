import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { ensureDefaults } from '../db/repository';
import type { RecoveryProfile, UserPreferences } from '../domain/types';

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
    if (!preferences?.reminderEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let timer: number | undefined;
    const schedule = () => {
      const [hourText, minuteText] = preferences.reminderTime.split(':');
      const next = new Date();
      next.setHours(Number(hourText) || 19, Number(minuteText) || 0, 0, 0);
      if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
      timer = window.setTimeout(async () => {
        const options: NotificationOptions = { body: 'A quiet moment is here, if it helps.', tag: 'stillpoint-gentle-reminder' };
        try {
          const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined;
          if (registration?.showNotification) await registration.showNotification('Stillpoint', options);
          else new Notification('Stillpoint', options);
        } catch { /* Browser notification delivery is best-effort and can be unavailable. */ }
        schedule();
      }, Math.max(1000, next.getTime() - Date.now()));
    };
    schedule();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [preferences?.reminderEnabled, preferences?.reminderTime]);

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
      <div className="toast-region" aria-live="polite" aria-atomic="true">{notice && <div className="toast">{notice}</div>}</div>
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider.');
  return value;
}
