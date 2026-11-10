import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DIAGNOSTICS_STORAGE_KEY, MAX_DIAGNOSTIC_ENTRIES, clearDiagnostics, errorNameOf, formatDiagnostics, logDiagnostic, readDiagnostics,
} from './diagnostics';

beforeEach(() => {
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
});

describe('local diagnostics log', () => {
  it('keeps at most 200 entries, dropping the oldest first', () => {
    for (let index = 0; index < MAX_DIAGNOSTIC_ENTRIES + 25; index += 1) {
      logDiagnostic({ level: 'warning', event: 'integrity-scan', count: index });
    }
    const entries = readDiagnostics();
    expect(MAX_DIAGNOSTIC_ENTRIES).toBe(200);
    expect(entries).toHaveLength(200);
    expect(entries[0]?.count).toBe(25);
    expect(entries.at(-1)?.count).toBe(224);
  });

  it('keeps only an error’s name and drops messages, record text and unknown fields', () => {
    const error = new Error('Journal: I felt awful today at 123 Main St');
    error.name = 'QuotaExceededError';
    logDiagnostic({ level: 'error', event: 'safe-write-failed', store: 'recovery-date', error, count: 2, ...{ body: 'secret journal text' } } as never);
    const raw = window.localStorage.getItem(DIAGNOSTICS_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('Journal');
    expect(raw).not.toContain('Main St');
    expect(raw).not.toContain('secret');
    expect(readDiagnostics()[0]).toEqual({ at: expect.any(String), level: 'error', event: 'safe-write-failed', store: 'recovery-date', errorName: 'QuotaExceededError', count: 2 });
  });

  it('refuses free-form store names, error names and events', () => {
    logDiagnostic({ level: 'warning', event: 'integrity-scan', store: 'my journal about Sam', error: 'Something with spaces', count: -1 });
    expect(readDiagnostics()[0]).toEqual({ at: expect.any(String), level: 'warning', event: 'integrity-scan', errorName: 'Error' });
    expect(logDiagnostic({ level: 'warning', event: 'free text event' as never })).toBeNull();
    expect(logDiagnostic({ level: 'loud' as never, event: 'integrity-scan' })).toBeNull();
    expect(readDiagnostics()).toHaveLength(1);
  });

  it('reads defensively: drops tampered entries and tolerates bad JSON', () => {
    window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify([
      { at: '2026-11-01T00:00:00.000Z', level: 'info', event: 'integrity-scan', note: 'private' },
      { at: 'not a date', level: 'info', event: 'integrity-scan' },
      { at: '2026-11-01T00:00:00.000Z', level: 'info', event: 'unknown' },
      null,
    ]));
    expect(readDiagnostics()).toEqual([{ at: '2026-11-01T00:00:00.000Z', level: 'info', event: 'integrity-scan' }]);
    window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, '{not json');
    expect(readDiagnostics()).toEqual([]);
    window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, '{"a":1}');
    expect(readDiagnostics()).toEqual([]);
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    expect(logDiagnostic({ level: 'info', event: 'storage-reset' })).toMatchObject({ event: 'storage-reset' });
    expect(() => clearDiagnostics()).not.toThrow();
  });

  it('formats a plain-text copy and clears the log', () => {
    expect(formatDiagnostics([])).toBe('Stillpoint diagnostics: no entries.');
    logDiagnostic({ level: 'warning', event: 'integrity-scan', store: 'journalEntries', count: 3 });
    logDiagnostic({ level: 'error', event: 'storage-open-failed', error: 'VersionError' });
    const text = formatDiagnostics();
    expect(text).toMatch(/^Stillpoint diagnostics \(2 entries, local only\):/);
    expect(text).toContain('WARNING integrity-scan store=journalEntries count=3');
    expect(text).toContain('ERROR storage-open-failed error=VersionError');
    clearDiagnostics();
    expect(readDiagnostics()).toEqual([]);
  });

  it('reduces any error value to a safe name', () => {
    expect(errorNameOf(undefined)).toBeUndefined();
    expect(errorNameOf(null)).toBeUndefined();
    expect(errorNameOf(new TypeError('x'))).toBe('TypeError');
    expect(errorNameOf({ name: 42 })).toBe('Error');
    expect(errorNameOf('VersionError')).toBe('VersionError');
  });
});
