import Dexie, { type Table } from 'dexie';
import { CURRENT_SCHEMA_VERSION, db } from './database';
import { ensureDefaults } from './repository';
import { STORE_NAMES, createBackupFromTables } from './backup';
import { logDiagnostic } from '../platform/diagnostics';
import { clearAllLocalSignals } from '../platform/localSignals';
import type { BackupPayload } from '../domain/types';

/** Broad, person-facing categories for why local storage could not be used. */
export type StorageFailureKind = 'unavailable' | 'quota' | 'version' | 'closed' | 'unknown';

export interface StorageFailure {
  kind: StorageFailureKind;
  /** The browser or Dexie error name only (for example `VersionError`); never its message. */
  errorName: string;
}

const KIND_BY_ERROR_NAME: Record<string, StorageFailureKind> = {
  MissingAPIError: 'unavailable',
  SecurityError: 'unavailable',
  QuotaExceededError: 'quota',
  VersionError: 'version',
  UpgradeError: 'version',
  DatabaseClosedError: 'closed',
  InvalidStateError: 'closed',
  InvalidAccessError: 'closed',
};

function nameOf(error: unknown): string {
  const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,59}$/.test(name) ? name : 'Error';
}

/**
 * Turn a storage error into a calm category. Dexie wraps the browser's own error (for example an
 * `OpenFailedError` around a `QuotaExceededError`), so the innermost known name wins.
 */
export function classifyStorageError(error: unknown): StorageFailure {
  if (typeof indexedDB === 'undefined') return { kind: 'unavailable', errorName: 'MissingAPIError' };
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const name = nameOf(current);
    if (KIND_BY_ERROR_NAME[name]) return { kind: KIND_BY_ERROR_NAME[name], errorName: name };
    current = (current as { inner?: unknown; cause?: unknown }).inner ?? (current as { cause?: unknown }).cause;
  }
  return { kind: 'unknown', errorName: nameOf(error) };
}

/** Plain-language explanation for each failure category, shown on the recovery screen. */
export function describeStorageFailure(kind: StorageFailureKind): string {
  switch (kind) {
    case 'unavailable':
      return 'This browser is not letting Stillpoint use local storage. This often happens in private browsing windows or when site storage is turned off.';
    case 'quota':
      return 'This device or browser looks short on storage space, so Stillpoint could not open or save your local records.';
    case 'version':
      return 'Your saved data was written by a newer or different version of Stillpoint than the one open now. Another open Stillpoint tab may also be updating it.';
    case 'closed':
      return 'The browser closed or blocked the connection to your local records. Another open Stillpoint tab or a browser update can cause this.';
    default:
      return 'Your local records could not be opened. Some data may be unreadable.';
  }
}

/** Open the shared database, apply migrations and normalize the singleton records. */
export async function openLocalDatabase(): Promise<void> {
  if (!db.isOpen()) await db.open();
  await ensureDefaults();
}

/** Close any failed connection and try opening again without touching saved records. */
export async function retryOpenLocalDatabase(): Promise<void> {
  db.close({ disableAutoOpen: false });
  await openLocalDatabase();
  logDiagnostic({ level: 'info', event: 'storage-open-recovered' });
}

/** Raised by {@link safeWrite}; its message is safe to show in a toast. */
export class SafeWriteError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'SafeWriteError';
    this.operation = operation;
  }
}

export const SAFE_WRITE_MESSAGE = 'That change could not be saved, so nothing was changed. Please try again.';

/**
 * Run a multi-store write in a single read/write transaction. If any step fails, IndexedDB rolls the
 * whole transaction back, a redacted diagnostic is recorded, and a friendly {@link SafeWriteError} is thrown.
 */
export async function safeWrite<T>(operation: string, tables: Table[], work: () => Promise<T>, message = SAFE_WRITE_MESSAGE): Promise<T> {
  try {
    return await db.transaction('rw', tables, work);
  } catch (error) {
    logDiagnostic({ level: 'error', event: 'safe-write-failed', store: operation, error });
    throw new SafeWriteError(operation, message, error);
  }
}

export interface ReadableExport {
  payload: BackupPayload;
  readStores: string[];
  unreadableStores: string[];
}

const exportStoreNames = (): readonly string[] => [...STORE_NAMES, 'quarantine'];

async function readTables(source: Dexie, names: readonly string[]) {
  const tables: Record<string, unknown[]> = {};
  const unreadable: string[] = [];
  for (const name of names) {
    try {
      tables[name] = await source.table(name).toArray();
    } catch (error) {
      unreadable.push(name);
      logDiagnostic({ level: 'warning', event: 'recovery-export-store-failed', store: name, error });
    }
  }
  return { tables, unreadable };
}

/**
 * Read whatever can still be read into a standard backup payload. When the app's own schema cannot
 * open the database (for example a version mismatch), the database is opened as-is, read-only in practice,
 * without declaring any schema, so no upgrade or write can happen.
 */
export async function exportReadableData(): Promise<ReadableExport> {
  let tables: Record<string, unknown[]>;
  let unreadable: string[];
  let schemaVersion: number | undefined;
  const storeNames = exportStoreNames();
  try {
    if (!db.isOpen()) await db.open();
    ({ tables, unreadable } = await readTables(db, storeNames));
  } catch {
    const raw = new Dexie(db.name);
    try {
      await raw.open();
      const names = raw.tables.map((table) => table.name).filter((name) => storeNames.includes(name));
      ({ tables, unreadable } = await readTables(raw, names));
      unreadable.push(...storeNames.filter((name) => !names.includes(name) && name !== 'quarantine'));
      schemaVersion = Math.min(Math.max(1, Math.round(raw.verno)), CURRENT_SCHEMA_VERSION);
    } finally {
      raw.close();
    }
  }
  if (Array.isArray(tables.quarantine) && !tables.quarantine.length) delete tables.quarantine;
  const payload = await createBackupFromTables(tables, schemaVersion);
  const readStores = Object.keys(tables);
  logDiagnostic({ level: unreadable.length ? 'warning' : 'info', event: 'recovery-export', count: readStores.length });
  return { payload, readStores, unreadableStores: unreadable };
}

/**
 * Last resort: delete this browser's Stillpoint database and start fresh. Callers must obtain explicit
 * confirmation first; this function refuses to run without it.
 */
export async function resetLocalDatabase(confirmation: { confirmed: boolean }): Promise<void> {
  if (confirmation.confirmed !== true) throw new Error('Resetting local data needs explicit confirmation.');
  db.close({ disableAutoOpen: false });
  await Dexie.delete(db.name);
  clearAllLocalSignals();
  logDiagnostic({ level: 'warning', event: 'storage-reset' });
  await openLocalDatabase();
}
