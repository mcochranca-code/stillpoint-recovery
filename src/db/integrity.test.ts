import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { buildIntegrityReport, checkRecord, checkStoreRecords, quarantineRecords, repairRecords, scanLocalData } from './integrity';
import { defaultPreferences, defaultRecoveryProfile } from './repository';
import { DIAGNOSTICS_STORAGE_KEY, readDiagnostics } from '../platform/diagnostics';
import type { JournalEntry } from '../domain/types';

const at = '2026-10-17T12:00:00.000Z';
const entry = (id: string, overrides: Record<string, unknown> = {}): JournalEntry => ({
  id, type: 'free-writing', title: 'A note', body: 'Private words', createdAt: at, updatedAt: at, tags: [], gratitude: [],
  ...overrides,
} as JournalEntry);

beforeEach(async () => {
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('checkRecord (pure)', () => {
  it('accepts a record that passes the backup rules', () => {
    expect(checkRecord('journalEntries', 'journal:ok', entry('journal:ok'))).toBeNull();
  });

  it('marks a record with missing optional fields as repairable and fills only those fields', () => {
    const partial: Record<string, unknown> = { ...entry('journal:partial') };
    delete partial.tags;
    delete partial.gratitude;
    const issue = checkRecord('journalEntries', 'journal:partial', partial);
    expect(issue).toMatchObject({ status: 'repairable', repairedFields: ['tags', 'gratitude'] });
    expect(issue?.repaired).toMatchObject({ body: 'Private words', tags: [], gratitude: [] });
  });

  it('recomputes the favorite index when a missing favorite flag is filled', () => {
    const issue = checkRecord('scriptureActivity', 's-1', { id: 's-1', scriptureId: 'psalm-23', exploredAt: at });
    expect(issue).toMatchObject({ status: 'repairable', repaired: { favorite: false, favoriteKey: 0 } });
  });

  it('resets only the invalid fields of the settings record and keeps the person’s other choices', () => {
    const preferences = { ...defaultPreferences(), theme: 'neon', highContrast: true, textScale: 1.5 };
    const issue = checkRecord('preferences', 'preferences', preferences);
    expect(issue?.status).toBe('repairable');
    expect(issue?.repairedFields).toEqual(['theme']);
    expect(issue?.repaired).toMatchObject({ theme: 'system', highContrast: true, textScale: 1.5 });
  });

  it('fills a missing settings field from defaults', () => {
    const preferences: Record<string, unknown> = { ...defaultPreferences() };
    delete preferences.allowBreathHolds;
    expect(checkRecord('preferences', 'preferences', preferences)).toMatchObject({ status: 'repairable', repairedFields: ['allowBreathHolds'] });
  });

  it('marks records that cannot be repaired as unreadable without changing them', () => {
    const broken = entry('journal:bad', { type: 'not-a-type', createdAt: 'never' });
    const snapshot = structuredClone(broken);
    expect(checkRecord('journalEntries', 'journal:bad', broken)).toMatchObject({ status: 'unreadable', key: 'journal:bad' });
    expect(broken).toEqual(snapshot);
    expect(checkRecord('journalEntries', 'x', 'just text')).toMatchObject({ status: 'unreadable', reason: 'The record is not a readable object.' });
    expect(checkRecord('journalEntries', 'x', entry('y', { type: 'bad' }))).toMatchObject({ status: 'unreadable', reason: 'The record ID is missing or does not match its key.' });
    expect(checkRecord('recoveryProfiles', 'recovery-profile', { ...defaultRecoveryProfile(), id: 'other' })?.status).toBe('unreadable');
    expect(checkRecord('unknownStore', 1, { id: 1 })).toMatchObject({ key: '1', status: 'unreadable' });
    expect(checkRecord('unknownStore', ['a', 1], { id: ['a', 1] })).toMatchObject({ key: '["a",1]' });
  });
});

describe('integrity report (pure)', () => {
  it('counts ok, repairable and unreadable records per store and in total', () => {
    const partial: Record<string, unknown> = { ...entry('journal:2') };
    delete partial.tags;
    const journal = checkStoreRecords('journalEntries', {
      keys: ['journal:1', 'journal:2', 'journal:3'],
      rows: [entry('journal:1'), partial, entry('journal:3', { createdAt: 'nope' })],
    });
    expect(journal).toMatchObject({ total: 3, ok: 1, repairable: 1, unreadable: 1, readFailed: false });

    const report = buildIntegrityReport({
      journalEntries: { keys: ['journal:1', 'journal:2', 'journal:3'], rows: [entry('journal:1'), partial, entry('journal:3', { createdAt: 'nope' })] },
      dailyActivity: { keys: [], rows: [{ id: '2026-10-01', localDate: '2026-10-01' }] },
      earnedCharms: { errorName: 'DataError' },
    }, at);
    expect(report.scannedAt).toBe(at);
    expect(report.totals).toEqual({ total: 4, ok: 1, repairable: 2, unreadable: 1, readFailedStores: 1 });
    expect(report.stores.find((store) => store.store === 'earnedCharms')).toMatchObject({ readFailed: true, errorName: 'DataError', issues: [] });
    // A row without a separate key falls back to its own id.
    expect(report.stores.find((store) => store.store === 'dailyActivity')?.issues[0]).toMatchObject({ key: '2026-10-01', status: 'repairable' });
  });
});

describe('scanLocalData, repair and quarantine', () => {
  async function seedMixedData() {
    await db.preferences.put(defaultPreferences());
    await db.recoveryProfiles.put(defaultRecoveryProfile());
    await db.journalEntries.bulkPut([
      entry('journal:ok'),
      { ...entry('journal:partial'), tags: undefined } as unknown as JournalEntry,
      entry('journal:broken', { type: 'not-a-type' }),
    ]);
  }

  it('scans every store read-only and logs only counts', async () => {
    await seedMixedData();
    const report = await scanLocalData();
    expect(report.totals).toMatchObject({ ok: 3, repairable: 1, unreadable: 1, readFailedStores: 0 });
    expect(await db.journalEntries.count()).toBe(3);
    expect((await db.journalEntries.get('journal:partial'))?.tags).toBeUndefined();
    const log = JSON.stringify(readDiagnostics());
    expect(log).toContain('integrity-scan');
    expect(log).toContain('journalEntries');
    expect(log).not.toContain('Private words');
    expect(log).not.toContain('journal:broken');
  });

  it('reports a healthy store set with an info entry', async () => {
    await db.preferences.put(defaultPreferences());
    const report = await scanLocalData();
    expect(report.totals).toMatchObject({ ok: 1, repairable: 0, unreadable: 0 });
    expect(readDiagnostics().at(-1)).toMatchObject({ level: 'info', event: 'integrity-scan', count: 0 });
  });

  it('reports a store that cannot be read instead of failing the whole scan', async () => {
    const original = db.table.bind(db);
    vi.spyOn(db, 'table').mockImplementation((name: string) => {
      if (name === 'earnedCharms') throw new DOMException('gone', 'InvalidStateError');
      return original(name);
    });
    const report = await scanLocalData();
    expect(report.stores.find((store) => store.store === 'earnedCharms')).toMatchObject({ readFailed: true, errorName: 'InvalidStateError' });
    expect(readDiagnostics().some((item) => item.event === 'integrity-scan-store-failed' && item.store === 'earnedCharms')).toBe(true);
  });

  it('never repairs or quarantines without explicit confirmation', async () => {
    await seedMixedData();
    const report = await scanLocalData();
    await expect(repairRecords(report, { confirmed: false })).rejects.toThrow(/explicit confirmation/);
    await expect(quarantineRecords(report, undefined as never)).rejects.toThrow(/explicit confirmation/);
    expect((await db.journalEntries.get('journal:partial'))?.tags).toBeUndefined();
    expect(await db.journalEntries.get('journal:broken')).toBeDefined();
    expect(await db.quarantine.count()).toBe(0);
  });

  it('repairs after confirmation and keeps the original in quarantine', async () => {
    await seedMixedData();
    const report = await scanLocalData();
    expect(await repairRecords(report, { confirmed: true })).toBe(1);
    expect((await db.journalEntries.get('journal:partial'))?.tags).toEqual([]);
    const kept = await db.quarantine.where('store').equals('journalEntries').toArray();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ originalKey: 'journal:partial', reason: 'Original kept before repair' });
    expect((kept[0]?.record as JournalEntry).tags).toBeUndefined();
    // A second run finds nothing left to repair.
    expect(await repairRecords(report, { confirmed: true })).toBe(0);
    expect(await repairRecords(await scanLocalData(), { confirmed: true })).toBe(0);
  });

  it('moves unreadable records to quarantine unchanged after confirmation, so they can still be exported', async () => {
    await seedMixedData();
    const report = await scanLocalData();
    expect(await quarantineRecords(report, { confirmed: true })).toBe(1);
    expect(await db.journalEntries.get('journal:broken')).toBeUndefined();
    expect(await db.quarantine.get('journalEntries:journal:broken')).toMatchObject({
      store: 'journalEntries', originalKey: 'journal:broken', record: { type: 'not-a-type', body: 'Private words' },
    });
    expect(await quarantineRecords(report, { confirmed: true })).toBe(0);
    expect(await quarantineRecords(await scanLocalData(), { confirmed: true })).toBe(0);
    expect(readDiagnostics().some((item) => item.event === 'records-quarantined' && item.count === 1)).toBe(true);
  });

  it('rolls back a quarantine that fails partway, leaving every record where it was', async () => {
    await seedMixedData();
    await db.journalEntries.put(entry('journal:broken-2', { type: 'still-not-a-type' }));
    const report = await scanLocalData();
    expect(report.totals.unreadable).toBe(2);
    // Tables are looked up by name inside the transaction, so patch the shared Table prototype.
    const tablePrototype = Object.getPrototypeOf(db.journalEntries) as { delete: (key: unknown) => Promise<void> };
    const realDelete = tablePrototype.delete;
    let calls = 0;
    vi.spyOn(tablePrototype, 'delete').mockImplementation(function (this: unknown, key: unknown) {
      calls += 1;
      if (calls === 2) return Promise.reject(new Error('disk hiccup'));
      return realDelete.call(this, key);
    });
    await expect(quarantineRecords(report, { confirmed: true })).rejects.toThrow('disk hiccup');
    vi.restoreAllMocks();
    expect(await db.journalEntries.get('journal:broken')).toBeDefined();
    expect(await db.journalEntries.get('journal:broken-2')).toBeDefined();
    expect(await db.quarantine.count()).toBe(0);
  });
});
