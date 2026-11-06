/**
 * Small on-device markers that let Stillpoint be considerate about when it
 * shows optional cards (last visit, last backup, "not now" choices).
 *
 * They live only in this browser's localStorage, are never sent anywhere,
 * contain no recovery details, and every read tolerates storage being
 * unavailable so the app keeps working in restrictive browsers.
 */

export const LOCAL_SIGNAL_KEYS = {
  lastVisitDate: 'stillpoint-last-visit-date-v1',
  welcomeBackDismissedOn: 'stillpoint-welcome-back-dismissed-v1',
  lastBackupAt: 'stillpoint-last-backup-at-v1',
  reminderOfferSnoozedUntil: 'stillpoint-reminder-offer-snoozed-v1',
  installOfferSnoozedUntil: 'stillpoint-install-offer-snoozed-v1',
  backupNudgeSnoozedUntil: 'stillpoint-backup-nudge-snoozed-v1',
  onboardingDraft: 'stillpoint-onboarding-draft-v1',
} as const;

export type LocalSignalKey = keyof typeof LOCAL_SIGNAL_KEYS;

export function readLocalSignal(key: LocalSignalKey): string | null {
  try { return window.localStorage.getItem(LOCAL_SIGNAL_KEYS[key]); }
  catch { return null; }
}

export function writeLocalSignal(key: LocalSignalKey, value: string): void {
  try { window.localStorage.setItem(LOCAL_SIGNAL_KEYS[key], value); }
  catch { /* Optional; the card may simply appear again. */ }
}

export function clearLocalSignal(key: LocalSignalKey): void {
  try { window.localStorage.removeItem(LOCAL_SIGNAL_KEYS[key]); }
  catch { /* Optional. */ }
}

/** Remove every engagement marker, e.g. when all local data is deleted. */
export function clearAllLocalSignals(): void {
  for (const key of Object.keys(LOCAL_SIGNAL_KEYS) as LocalSignalKey[]) clearLocalSignal(key);
}

/** Ask the browser to keep this site's storage from automatic eviction. Best-effort and silent. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
