/**
 * A small, local-only diagnostics log for data-health support.
 *
 * It lives in this browser's localStorage (so it still works when IndexedDB cannot open), is capped
 * at {@link MAX_DIAGNOSTIC_ENTRIES} entries, and is never sent anywhere. Entries are built from a fixed
 * vocabulary only: an event code, a level, a store name, an error *name* (never its message), a count
 * and a timestamp. Journal text, record contents, record IDs and free-form messages are never stored.
 */

export const DIAGNOSTICS_STORAGE_KEY = 'stillpoint-diagnostics-v1';
export const MAX_DIAGNOSTIC_ENTRIES = 200;

export const DIAGNOSTIC_EVENTS = [
  'storage-open-failed',
  'storage-open-recovered',
  'storage-reset',
  'integrity-scan',
  'integrity-scan-store-failed',
  'records-repaired',
  'records-quarantined',
  'safe-write-failed',
  'recovery-export',
  'recovery-export-store-failed',
  'restore-failed',
  'storage-read-failed',
  'render-error',
] as const;

export type DiagnosticEvent = typeof DIAGNOSTIC_EVENTS[number];
export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface DiagnosticEntry {
  at: string;
  level: DiagnosticLevel;
  event: DiagnosticEvent;
  store?: string;
  errorName?: string;
  count?: number;
}

export interface DiagnosticInput {
  level: DiagnosticLevel;
  event: DiagnosticEvent;
  store?: string;
  /** An Error (only its `name` is kept) or an error name string. */
  error?: unknown;
  count?: number;
}

const EVENTS = new Set<string>(DIAGNOSTIC_EVENTS);
const LEVELS = new Set<string>(['info', 'warning', 'error']);
/** Store and operation names are short identifiers such as `journalEntries` or `recovery-date`. */
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9-]{0,59}$/;

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_IDENTIFIER.test(value) ? value : undefined;
}

/** Keep only an error's class-like name (for example `QuotaExceededError`); messages can hold personal text. */
export function errorNameOf(error: unknown): string | undefined {
  if (error === undefined || error === null) return undefined;
  const name = typeof error === 'string' ? error : (error as { name?: unknown }).name;
  return safeIdentifier(name) ?? 'Error';
}

function sanitize(entry: unknown): DiagnosticEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;
  if (typeof row.event !== 'string' || !EVENTS.has(row.event)) return null;
  if (typeof row.level !== 'string' || !LEVELS.has(row.level)) return null;
  if (typeof row.at !== 'string' || Number.isNaN(Date.parse(row.at))) return null;
  const clean: DiagnosticEntry = { at: row.at, level: row.level as DiagnosticLevel, event: row.event as DiagnosticEvent };
  const store = safeIdentifier(row.store);
  if (store) clean.store = store;
  const errorName = safeIdentifier(row.errorName);
  if (errorName) clean.errorName = errorName;
  if (typeof row.count === 'number' && Number.isInteger(row.count) && row.count >= 0) clean.count = row.count;
  return clean;
}

/** Read the log, oldest first. Unreadable or unexpected entries are dropped rather than shown. */
export function readDiagnostics(): DiagnosticEntry[] {
  try {
    const raw = window.localStorage.getItem(DIAGNOSTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitize).filter((entry): entry is DiagnosticEntry => entry !== null).slice(-MAX_DIAGNOSTIC_ENTRIES);
  } catch {
    return [];
  }
}

/** Append one redacted entry, dropping the oldest once the cap is reached. Never throws. */
export function logDiagnostic(input: DiagnosticInput): DiagnosticEntry | null {
  const entry = sanitize({
    at: new Date().toISOString(),
    level: input.level,
    event: input.event,
    store: input.store,
    errorName: errorNameOf(input.error),
    count: input.count,
  });
  if (!entry) return null;
  try {
    const next = [...readDiagnostics(), entry].slice(-MAX_DIAGNOSTIC_ENTRIES);
    window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(next));
  } catch { /* Diagnostics are optional; storage may be full or disabled. */ }
  return entry;
}

/** Remove every diagnostics entry from this browser. */
export function clearDiagnostics(): void {
  try { window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY); }
  catch { /* Optional. */ }
}

/** Plain-text form for the person to copy into a support conversation if they choose. */
export function formatDiagnostics(entries: DiagnosticEntry[] = readDiagnostics()): string {
  if (!entries.length) return 'Stillpoint diagnostics: no entries.';
  const lines = entries.map((entry) => [
    entry.at,
    entry.level.toUpperCase(),
    entry.event,
    entry.store ? `store=${entry.store}` : '',
    entry.errorName ? `error=${entry.errorName}` : '',
    entry.count !== undefined ? `count=${entry.count}` : '',
  ].filter(Boolean).join(' '));
  return [`Stillpoint diagnostics (${entries.length} entries, local only):`, ...lines].join('\n');
}
