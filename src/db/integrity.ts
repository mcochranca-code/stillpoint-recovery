import type { IndexableType } from 'dexie';
import { db, type QuarantinedRecord } from './database';
import { STORE_NAMES, isValidStoreRecord } from './backup';
import { defaultPreferences, defaultRecoveryProfile } from './repository';
import { logDiagnostic } from '../platform/diagnostics';

/**
 * Local data-health checks.
 *
 * The scan is read-only and uses the same record rules as backup restore. A record is:
 * - `ok` when it passes those rules;
 * - `repairable` when filling missing fields with safe defaults (or, for the two settings records,
 *   replacing only the invalid fields with defaults) makes it pass;
 * - `unreadable` otherwise.
 *
 * Nothing is written by the scan. Repair and quarantine each require `{ confirmed: true }`, run in one
 * transaction, and keep the original value in the local quarantine table so it can still be exported.
 */

export type IssueStatus = 'repairable' | 'unreadable';

export interface IntegrityIssue {
  store: string;
  /** The record's primary key as stored; used internally to act on the record. */
  primaryKey: IndexableType;
  /** Display-safe form of the key. */
  key: string;
  status: IssueStatus;
  reason: string;
  /** Fields that a repair fills or resets (repairable issues only). */
  repairedFields?: string[];
  /** The repaired value that a confirmed repair would save (repairable issues only). */
  repaired?: Record<string, unknown>;
}

export interface StoreIntegrity {
  store: string;
  total: number;
  ok: number;
  repairable: number;
  unreadable: number;
  /** True when the store itself could not be read; its records were left untouched. */
  readFailed: boolean;
  errorName?: string;
  issues: IntegrityIssue[];
}

export interface IntegrityReport {
  scannedAt: string;
  stores: StoreIntegrity[];
  totals: { total: number; ok: number; repairable: number; unreadable: number; readFailedStores: number };
}

export interface StoreRows {
  keys: IndexableType[];
  rows: unknown[];
}

/** What a scan records about a store it could not read: only the error's name. */
export interface StoreReadFailure {
  errorName: string;
}

function errorNameOf(error: unknown): string {
  const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,59}$/.test(name) ? name : 'Error';
}

const SINGLETON_DEFAULTS: Record<string, () => Record<string, unknown>> = {
  preferences: () => defaultPreferences() as unknown as Record<string, unknown>,
  recoveryProfiles: () => defaultRecoveryProfile() as unknown as Record<string, unknown>,
};

/** Defaults that are safe to fill when a field is missing entirely. They never overwrite a present value. */
function missingFieldDefaults(store: string, row: Record<string, unknown>): Record<string, unknown> {
  switch (store) {
    case 'recoveryDateHistory':
      return { previousStartAt: null, nextStartAt: null };
    case 'dailyReflections':
    case 'scriptureActivity':
      return { favorite: false, favoriteKey: 0 };
    case 'journalEntries':
      return { title: '', body: '', tags: [], gratitude: [], ...(typeof row.createdAt === 'string' ? { updatedAt: row.createdAt } : {}) };
    case 'journalDrafts':
      return { title: '', body: '', tags: [], gratitude: [] };
    case 'dailyActivity':
      return { reflectionsCompleted: 0, scriptureExplored: 0, meditationMinutes: 0, journalEntries: 0, gratitudeEntries: 0 };
    case 'personalGoals':
      return { current: 0 };
    case 'fieldGuideNotes':
      return { body: '', ...(typeof row.createdAt === 'string' ? { updatedAt: row.createdAt } : {}) };
    case 'resetRecords':
      return { feeling: '', nextStep: '', completed: false };
    case 'stepWorkAnswers':
      return { text: '' };
    default:
      return {};
  }
}

function displayKey(key: IndexableType): string {
  return typeof key === 'string' || typeof key === 'number' ? String(key) : JSON.stringify(key);
}

function fillMissing(store: string, row: Record<string, unknown>): { value: Record<string, unknown>; fields: string[] } {
  const defaults = { ...(SINGLETON_DEFAULTS[store]?.() ?? {}), ...missingFieldDefaults(store, row) };
  const value = { ...row };
  const fields: string[] = [];
  for (const [field, fallback] of Object.entries(defaults)) {
    if (value[field] === undefined) {
      value[field] = fallback;
      fields.push(field);
    }
  }
  return { value, fields };
}

/**
 * For the two settings records, start from safe defaults and keep each of the person's own values
 * that still passes the rules, so only the invalid fields return to their defaults.
 */
function resetInvalidSingletonFields(store: string, row: Record<string, unknown>): { value: Record<string, unknown>; fields: string[] } | null {
  const defaults = SINGLETON_DEFAULTS[store]?.();
  if (!defaults) return null;
  let value: Record<string, unknown> = { ...row, ...defaults };
  if (!isValidStoreRecord(store, value)) return null;
  const fields: string[] = [];
  for (const field of Object.keys(defaults)) {
    if (field === 'id' || !(field in row)) continue;
    const candidate = { ...value, [field]: row[field] };
    if (isValidStoreRecord(store, candidate)) value = candidate;
    else fields.push(field);
  }
  return { value, fields };
}

/** Classify one record. Pure: never reads or writes storage. */
export function checkRecord(store: string, primaryKey: IndexableType, row: unknown): IntegrityIssue | null {
  if (isValidStoreRecord(store, row)) return null;
  const key = displayKey(primaryKey);
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return { store, primaryKey, key, status: 'unreadable', reason: 'The record is not a readable object.' };
  }
  const record = row as Record<string, unknown>;
  if (record.id !== primaryKey) {
    return { store, primaryKey, key, status: 'unreadable', reason: 'The record ID is missing or does not match its key.' };
  }
  const filled = fillMissing(store, record);
  if (filled.fields.length && isValidStoreRecord(store, filled.value)) {
    if (store === 'dailyReflections' || store === 'scriptureActivity') filled.value.favoriteKey = filled.value.favorite ? 1 : 0;
    return { store, primaryKey, key, status: 'repairable', reason: 'Some fields are missing and can be filled with defaults.', repairedFields: filled.fields, repaired: filled.value };
  }
  const reset = resetInvalidSingletonFields(store, filled.value);
  if (reset) {
    const fields = [...new Set([...filled.fields, ...reset.fields])];
    return { store, primaryKey, key, status: 'repairable', reason: 'Some settings are invalid and can return to their defaults.', repairedFields: fields, repaired: reset.value };
  }
  return { store, primaryKey, key, status: 'unreadable', reason: 'Some fields are invalid or unreadable.' };
}

/** Check every record of one store. Pure. */
export function checkStoreRecords(store: string, { keys, rows }: StoreRows): StoreIntegrity {
  const issues: IntegrityIssue[] = [];
  rows.forEach((row, index) => {
    const primaryKey = keys[index] ?? (row && typeof row === 'object' ? (row as { id?: IndexableType }).id : undefined) ?? index;
    const issue = checkRecord(store, primaryKey, row);
    if (issue) issues.push(issue);
  });
  const repairable = issues.filter((issue) => issue.status === 'repairable').length;
  const unreadable = issues.length - repairable;
  return { store, total: rows.length, ok: rows.length - issues.length, repairable, unreadable, readFailed: false, issues };
}

/** Assemble a report from per-store rows, or the error raised while reading a store. Pure. */
export function buildIntegrityReport(input: Record<string, StoreRows | StoreReadFailure>, scannedAt = new Date().toISOString()): IntegrityReport {
  const stores = Object.entries(input).map(([store, value]): StoreIntegrity => (
    'rows' in value
      ? checkStoreRecords(store, value)
      : { store, total: 0, ok: 0, repairable: 0, unreadable: 0, readFailed: true, errorName: value.errorName, issues: [] }
  ));
  const sum = (pick: (store: StoreIntegrity) => number) => stores.reduce((total, store) => total + pick(store), 0);
  return {
    scannedAt,
    stores,
    totals: {
      total: sum((store) => store.total),
      ok: sum((store) => store.ok),
      repairable: sum((store) => store.repairable),
      unreadable: sum((store) => store.unreadable),
      readFailedStores: stores.filter((store) => store.readFailed).length,
    },
  };
}

/** Read every supported store and check it. Read-only; a store that cannot be read is reported, not changed. */
export async function scanLocalData(): Promise<IntegrityReport> {
  const input: Record<string, StoreRows | StoreReadFailure> = {};
  for (const store of STORE_NAMES) {
    try {
      const table = db.table(store);
      input[store] = await db.transaction('r', table, async () => ({
        keys: await table.toCollection().primaryKeys(),
        rows: await table.toArray(),
      }));
    } catch (error) {
      input[store] = { errorName: errorNameOf(error) };
      logDiagnostic({ level: 'warning', event: 'integrity-scan-store-failed', store, error });
    }
  }
  const report = buildIntegrityReport(input);
  logDiagnostic({ level: report.totals.repairable || report.totals.unreadable || report.totals.readFailedStores ? 'warning' : 'info', event: 'integrity-scan', count: report.totals.repairable + report.totals.unreadable });
  for (const store of report.stores) {
    if (store.repairable || store.unreadable) logDiagnostic({ level: 'warning', event: 'integrity-scan', store: store.store, count: store.repairable + store.unreadable });
  }
  return report;
}

export interface Confirmation {
  confirmed: boolean;
}

function requireConfirmation(confirmation: Confirmation | undefined, action: string): void {
  if (confirmation?.confirmed !== true) throw new Error(`${action} needs explicit confirmation before any record is changed.`);
}

function issuesOf(report: IntegrityReport, status: IssueStatus): IntegrityIssue[] {
  return report.stores.flatMap((store) => store.issues.filter((issue) => issue.status === status));
}

function quarantineEntry(issue: IntegrityIssue, original: unknown, id: string, reason: string, at: string): QuarantinedRecord {
  return { id, store: issue.store, originalKey: issue.key, record: original, reason, quarantinedAt: at };
}

/**
 * Save the repaired form of each repairable record, keeping the original in quarantine.
 * Records that changed since the scan (now valid or gone) are left alone. All-or-nothing.
 */
export async function repairRecords(report: IntegrityReport, confirmation: Confirmation): Promise<number> {
  requireConfirmation(confirmation, 'Repair');
  const issues = issuesOf(report, 'repairable');
  if (!issues.length) return 0;
  const stores = [...new Set(issues.map((issue) => issue.store))];
  let repaired = 0;
  await db.transaction('rw', [...stores.map((store) => db.table(store)), db.quarantine], async () => {
    const at = new Date().toISOString();
    for (const issue of issues) {
      const table = db.table(issue.store);
      const current: unknown = await table.get(issue.primaryKey);
      if (current === undefined || isValidStoreRecord(issue.store, current) || !issue.repaired) continue;
      await db.quarantine.put(quarantineEntry(issue, current, `${issue.store}:${issue.key}:before-repair:${at}`, 'Original kept before repair', at));
      await table.put(issue.repaired);
      repaired += 1;
    }
  });
  if (repaired) logDiagnostic({ level: 'info', event: 'records-repaired', count: repaired });
  return repaired;
}

/**
 * Move each unreadable record into the local quarantine table, unchanged, and remove it from the store
 * it was breaking. Records that changed since the scan are left alone. All-or-nothing.
 */
export async function quarantineRecords(report: IntegrityReport, confirmation: Confirmation): Promise<number> {
  requireConfirmation(confirmation, 'Quarantine');
  const issues = issuesOf(report, 'unreadable');
  if (!issues.length) return 0;
  const stores = [...new Set(issues.map((issue) => issue.store))];
  let moved = 0;
  await db.transaction('rw', [...stores.map((store) => db.table(store)), db.quarantine], async () => {
    const at = new Date().toISOString();
    for (const issue of issues) {
      const table = db.table(issue.store);
      const current: unknown = await table.get(issue.primaryKey);
      if (current === undefined || isValidStoreRecord(issue.store, current)) continue;
      await db.quarantine.put(quarantineEntry(issue, current, `${issue.store}:${issue.key}`, issue.reason, at));
      await table.delete(issue.primaryKey);
      moved += 1;
    }
  });
  if (moved) logDiagnostic({ level: 'warning', event: 'records-quarantined', count: moved });
  return moved;
}
