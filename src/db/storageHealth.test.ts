import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_SCHEMA_VERSION, db } from './database';
import { defaultPreferences } from './repository';
import {
  SAFE_WRITE_MESSAGE, SafeWriteError, classifyStorageError, describeStorageFailure, exportReadableData,
  openLocalDatabase, resetLocalDatabase, retryOpenLocalDatabase, safeWrite,
} from './storageHealth';
import { inspectBackupText } from './backup';
import { DIAGNOSTICS_STORAGE_KEY, readDiagnostics } from '../platform/diagnostics';
import { LOCAL_SIGNAL_KEYS } from '../platform/localSignals';

const at = '2026-10-17T12:00:00.000Z';
const journal = (id: string) => ({ id, type: 'free-writing' as const, title: 'Note', body: 'Private words', createdAt: at, updatedAt: at, tags: [], gratitude: [] });

beforeEach(async () => {
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (!db.isOpen()) await db.open();
  db.close();
});

describe('classifyStorageError', () => {
  it.each([
    ['MissingAPIError', 'unavailable'],
    ['SecurityError', 'unavailable'],
    ['QuotaExceededError', 'quota'],
    ['VersionError', 'version'],
    ['UpgradeError', 'version'],
    ['DatabaseClosedError', 'closed'],
    ['InvalidStateError', 'closed'],
    ['InvalidAccessError', 'closed'],
  ])('maps %s to %s', (name, kind) => {
    expect(classifyStorageError(new DOMException('x', name))).toEqual({ kind, errorName: name });
  });

  it('looks through Dexie wrappers to the browser’s own error', () => {
    const wrapped = new Dexie.OpenFailedError('open failed', new DOMException('full', 'QuotaExceededError'));
    expect(classifyStorageError(wrapped)).toEqual({ kind: 'quota', errorName: 'QuotaExceededError' });
    expect(classifyStorageError({ name: 'AbortError', cause: { name: 'VersionError' } })).toEqual({ kind: 'version', errorName: 'VersionError' });
  });

  it('falls back to unknown with a safe name', () => {
    expect(classifyStorageError(new Error('private detail'))).toEqual({ kind: 'unknown', errorName: 'Error' });
    expect(classifyStorageError('text')).toEqual({ kind: 'unknown', errorName: 'Error' });
    expect(classifyStorageError({ name: 'has spaces in it' })).toEqual({ kind: 'unknown', errorName: 'Error' });
  });

  it('treats a missing IndexedDB API (for example some private windows) as unavailable', () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      expect(classifyStorageError(new Error('anything'))).toEqual({ kind: 'unavailable', errorName: 'MissingAPIError' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('describes every category in plain language', () => {
    for (const kind of ['unavailable', 'quota', 'version', 'closed', 'unknown'] as const) {
      expect(describeStorageFailure(kind).length).toBeGreaterThan(30);
    }
    expect(describeStorageFailure('unavailable')).toMatch(/private browsing/);
  });
});

describe('opening and retrying', () => {
  it('opens the database and creates the default records', async () => {
    db.close();
    await openLocalDatabase();
    expect(db.isOpen()).toBe(true);
    expect(await db.preferences.get('preferences')).toBeDefined();
  });

  it('retries after a failed open without clearing records', async () => {
    await db.journalEntries.put(journal('journal:keep'));
    db.close();
    vi.spyOn(db, 'open').mockRejectedValueOnce(new DOMException('closed', 'InvalidStateError'));
    await expect(openLocalDatabase()).rejects.toThrow();
    await retryOpenLocalDatabase();
    expect(await db.journalEntries.get('journal:keep')).toBeDefined();
    expect(readDiagnostics().at(-1)).toMatchObject({ event: 'storage-open-recovered' });
  });
});

describe('safeWrite', () => {
  it('returns the result of a successful multi-store write', async () => {
    const result = await safeWrite('test-write', [db.journalEntries, db.dailyActivity], async () => {
      await db.journalEntries.put(journal('journal:1'));
      await db.dailyActivity.put({ id: '2026-10-17', localDate: '2026-10-17', reflectionsCompleted: 0, scriptureExplored: 0, meditationMinutes: 0, journalEntries: 1, gratitudeEntries: 0 });
      return 'done';
    });
    expect(result).toBe('done');
    expect(await db.dailyActivity.count()).toBe(1);
  });

  it('rolls back every store when a later step fails and raises a friendly error', async () => {
    const attempt = safeWrite('test-write', [db.journalEntries, db.dailyActivity], async () => {
      await db.journalEntries.put(journal('journal:partial'));
      throw new Error('Simulated failure with private words');
    });
    await expect(attempt).rejects.toBeInstanceOf(SafeWriteError);
    await expect(attempt).rejects.toMatchObject({ message: SAFE_WRITE_MESSAGE, operation: 'test-write' });
    expect(await db.journalEntries.get('journal:partial')).toBeUndefined();
    expect(JSON.stringify(readDiagnostics())).not.toContain('private words');
  });
});

describe('exportReadableData', () => {
  it('exports every readable store, including quarantine, as a valid backup', async () => {
    await db.preferences.put(defaultPreferences());
    await db.journalEntries.put(journal('journal:1'));
    await db.quarantine.put({ id: 'journalEntries:x', store: 'journalEntries', originalKey: 'x', record: { id: 'x' }, reason: 'test', quarantinedAt: at });
    const result = await exportReadableData();
    expect(result.unreadableStores).toEqual([]);
    expect(result.payload.tables.journalEntries).toHaveLength(1);
    expect(result.payload.tables.quarantine).toHaveLength(1);
    expect(result.payload.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const preview = await inspectBackupText(JSON.stringify(result.payload));
    expect(preview.skippedInvalid).toBe(0);
    expect(readDiagnostics().at(-1)).toMatchObject({ event: 'recovery-export', level: 'info' });
  });

  it('skips a store that cannot be read and names it', async () => {
    const original = db.table.bind(db);
    vi.spyOn(db, 'table').mockImplementation((name: string) => {
      if (name === 'journalEntries') throw new DOMException('broken', 'DataError');
      return original(name);
    });
    const result = await exportReadableData();
    expect(result.unreadableStores).toEqual(['journalEntries']);
    expect(result.payload.tables).not.toHaveProperty('journalEntries');
    expect(result.payload.tables).not.toHaveProperty('quarantine');
    expect(readDiagnostics().some((entry) => entry.event === 'recovery-export-store-failed' && entry.store === 'journalEntries')).toBe(true);
  });

  it('reads the database as-is when the app schema cannot open it', async () => {
    await db.journalEntries.put(journal('journal:raw'));
    db.close();
    vi.spyOn(db, 'open').mockRejectedValueOnce(new DOMException('newer', 'VersionError'));
    const result = await exportReadableData();
    expect(result.payload.tables.journalEntries).toEqual([journal('journal:raw')]);
    expect(result.payload.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.unreadableStores).toEqual([]);
  });

  it('reports stores missing from an older database when read as-is', async () => {
    db.close();
    await Dexie.delete(db.name);
    const legacy = new Dexie(db.name);
    legacy.version(3).stores({ preferences: 'id', journalEntries: 'id' });
    await legacy.open();
    await legacy.table('journalEntries').put(journal('journal:old'));
    legacy.close();
    vi.spyOn(db, 'open').mockRejectedValueOnce(new DOMException('closed', 'InvalidStateError'));
    const result = await exportReadableData();
    expect(result.payload.schemaVersion).toBe(3);
    expect(result.payload.tables.journalEntries).toHaveLength(1);
    expect(result.unreadableStores).toContain('stepWorkAnswers');
    expect(result.unreadableStores).not.toContain('quarantine');
    await Dexie.delete(db.name);
  });

  it('throws when nothing at all can be opened', async () => {
    db.close();
    vi.spyOn(Dexie.prototype, 'open').mockRejectedValue(new DOMException('nope', 'UnknownError'));
    await expect(exportReadableData()).rejects.toThrow();
  });
});

describe('resetLocalDatabase', () => {
  it('refuses to run without explicit confirmation', async () => {
    await db.journalEntries.put(journal('journal:keep'));
    await expect(resetLocalDatabase({ confirmed: false })).rejects.toThrow(/explicit confirmation/);
    expect(await db.journalEntries.get('journal:keep')).toBeDefined();
  });

  it('deletes local records and engagement markers after confirmation, then starts fresh', async () => {
    await db.journalEntries.put(journal('journal:gone'));
    window.localStorage.setItem(LOCAL_SIGNAL_KEYS.lastBackupAt, at);
    await resetLocalDatabase({ confirmed: true });
    expect(db.isOpen()).toBe(true);
    expect(await db.journalEntries.count()).toBe(0);
    expect((await db.preferences.get('preferences'))?.onboardingComplete).toBe(false);
    expect(window.localStorage.getItem(LOCAL_SIGNAL_KEYS.lastBackupAt)).toBeNull();
    expect(readDiagnostics().some((entry) => entry.event === 'storage-reset')).toBe(true);
  });
});
