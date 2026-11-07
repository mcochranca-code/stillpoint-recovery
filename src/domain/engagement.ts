/**
 * Pure rules for gentle, on-device re-engagement.
 *
 * Nothing here is transmitted anywhere. These helpers only decide whether a
 * quiet, dismissible card is worth showing, so the app can welcome someone
 * back, offer a reminder or an install at a meaningful moment, and nudge a
 * private backup before local data is at risk. Each rule leans toward showing
 * less rather than more.
 */

export const DAY_MS = 86_400_000;

/** Days to wait before offering the same card again after "Not now". */
export const SNOOZE_DAYS = 30;
/** Calendar days away before Today offers a welcome-back note. */
export const WELCOME_BACK_AFTER_DAYS = 3;
/** Saved records (journal entries, check-ins, sessions) before a backup nudge appears. */
export const BACKUP_NUDGE_MIN_RECORDS = 5;
/** Days since the last backup before nudging again. */
export const BACKUP_NUDGE_INTERVAL_DAYS = 30;
/** Distinct days with saved activity before offering an install. */
export const INSTALL_MIN_ACTIVE_DAYS = 2;

/** Whole calendar days from one YYYY-MM-DD key to another (negative if `to` is earlier). */
export function calendarDaysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / DAY_MS);
}

/** True when an ISO timestamp snooze is still in effect. */
export function isSnoozed(snoozedUntil: string | null | undefined, now: Date): boolean {
  if (!snoozedUntil) return false;
  const until = new Date(snoozedUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

/** Return the ISO timestamp a snooze of `days` would end at. */
export function snoozeUntil(now: Date, days = SNOOZE_DAYS): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/**
 * How many days someone was away, if long enough to deserve a welcome-back note.
 * Returns null on a first visit, a same-day return, a short gap, or after dismissal today.
 */
export function welcomeBackGap(lastVisitDate: string | null | undefined, today: string, dismissedOn?: string | null): number | null {
  if (!lastVisitDate || dismissedOn === today) return null;
  const gap = calendarDaysBetween(lastVisitDate, today);
  return gap >= WELCOME_BACK_AFTER_DAYS ? gap : null;
}

export interface ReminderOfferInput {
  reminderEnabled: boolean;
  permission: NotificationPermission | 'unsupported';
  checkedInToday: boolean;
  snoozedUntil?: string | null;
  now: Date;
}

/**
 * Offer a reminder only after a first meaningful action, only where the browser
 * can still ask (never after a denial), and never while snoozed.
 */
export function shouldOfferReminder({ reminderEnabled, permission, checkedInToday, snoozedUntil, now }: ReminderOfferInput): boolean {
  if (reminderEnabled || !checkedInToday) return false;
  if (permission === 'unsupported' || permission === 'denied') return false;
  return !isSnoozed(snoozedUntil, now);
}

export interface InstallOfferInput {
  canPrompt: boolean;
  isStandalone: boolean;
  activeDays: number;
  snoozedUntil?: string | null;
  now: Date;
}

/** Offer an install only when the browser supports it and the person has come back on a second day. */
export function shouldOfferInstall({ canPrompt, isStandalone, activeDays, snoozedUntil, now }: InstallOfferInput): boolean {
  if (!canPrompt || isStandalone) return false;
  if (activeDays < INSTALL_MIN_ACTIVE_DAYS) return false;
  return !isSnoozed(snoozedUntil, now);
}

export interface BackupNudgeInput {
  savedRecords: number;
  lastBackupAt?: string | null;
  snoozedUntil?: string | null;
  now: Date;
}

/** Nudge a private backup once there is something worth keeping and none was made recently. */
export function shouldNudgeBackup({ savedRecords, lastBackupAt, snoozedUntil, now }: BackupNudgeInput): boolean {
  if (savedRecords < BACKUP_NUDGE_MIN_RECORDS) return false;
  if (isSnoozed(snoozedUntil, now)) return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= BACKUP_NUDGE_INTERVAL_DAYS * DAY_MS;
}

/** Whole days covered by a previous stretch, for a kind acknowledgement when someone begins again. */
export function previousStretchDays(previousStartAt: string | null | undefined, endedAt: string): number | null {
  if (!previousStartAt) return null;
  const start = new Date(previousStartAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / DAY_MS);
}

export interface ReadingChoiceOfferInput {
  /** True while a new install has not chosen where its readings come from. */
  choicePending: boolean;
  snoozedUntil?: string | null;
  now: Date;
}

/** Invite a choice of readings until one is made; "Not now" rests it for a while like the other cards. */
export function shouldOfferReadingChoice({ choicePending, snoozedUntil, now }: ReadingChoiceOfferInput): boolean {
  return choicePending && !isSnoozed(snoozedUntil, now);
}

export type TodayNudge = 'readings' | 'reminder' | 'install' | 'backup';

/** Show at most one optional card at a time so Today never feels like a to-do list. */
export function pickTodayNudge(flags: Partial<Record<TodayNudge, boolean>>): TodayNudge | null {
  // Choosing readings comes first: until it is made, the person sees a neutral reading they did not pick.
  if (flags.readings) return 'readings';
  if (flags.reminder) return 'reminder';
  if (flags.backup) return 'backup';
  if (flags.install) return 'install';
  return null;
}

/** Timeline wording for a kept date-change record: a fresh start is named kindly and its prior days still count. */
export function describeDateChange(record: { previousStartAt: string | null; recordedAt: string; note?: string }): { title: string; description: string } {
  if (record.note !== 'began-again') return { title: 'Recovery date updated', description: 'A date-change record you chose to keep locally.' };
  const stretch = previousStretchDays(record.previousStartAt, record.recordedAt);
  return {
    title: 'Began again',
    description: stretch ? `A stretch of ${stretch} ${stretch === 1 ? 'day' : 'days'} came before this, and it still counts.` : 'A fresh start, with everything you saved still here.',
  };
}
