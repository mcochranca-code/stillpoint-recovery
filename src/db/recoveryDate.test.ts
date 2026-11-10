import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { saveRecoveryDateChange } from './recoveryDate';
import { defaultRecoveryProfile } from './repository';
import { SafeWriteError } from './storageHealth';
import { DIAGNOSTICS_STORAGE_KEY, readDiagnostics } from '../platform/diagnostics';

const previous = '2026-01-01T08:00:00.000Z';
const next = '2026-03-01T08:00:00.000Z';
const profile = (startAt: string) => ({ ...defaultRecoveryProfile(), startAt, localStartDate: startAt.slice(0, 10), localStartTime: '00:00' });
const history = { id: 'date-change:1', previousStartAt: previous, nextStartAt: next, recordedAt: next, note: 'began-again' };

beforeEach(async () => {
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  await db.delete();
  await db.open();
  await db.recoveryProfiles.put(profile(previous));
});

afterEach(() => {
  db.close();
});

describe('saveRecoveryDateChange', () => {
  it('saves the new date, its history entry and reached milestones together', async () => {
    await saveRecoveryDateChange(profile(next), history);
    expect((await db.recoveryProfiles.get('recovery-profile'))?.startAt).toBe(next);
    expect(await db.recoveryDateHistory.get('date-change:1')).toMatchObject({ note: 'began-again' });
    expect(await db.milestoneRecords.where('startAt').equals(next).count()).toBeGreaterThan(0);
  });

  it('saves without history when none is kept, and skips milestones without a date', async () => {
    await saveRecoveryDateChange({ ...defaultRecoveryProfile() });
    expect((await db.recoveryProfiles.get('recovery-profile'))?.startAt).toBeNull();
    expect(await db.recoveryDateHistory.count()).toBe(0);
    expect(await db.milestoneRecords.count()).toBe(0);
  });

  it('rolls back the history entry when the profile write fails mid-transaction', async () => {
    vi.spyOn(db.recoveryProfiles, 'put').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    const failure = saveRecoveryDateChange(profile(next), history);
    await expect(failure).rejects.toBeInstanceOf(SafeWriteError);
    await expect(failure).rejects.toThrow('Your date could not be saved, so nothing was changed. Please try again.');
    expect(await db.recoveryDateHistory.count()).toBe(0);
    expect(await db.milestoneRecords.count()).toBe(0);
    expect((await db.recoveryProfiles.get('recovery-profile'))?.startAt).toBe(previous);
    expect(readDiagnostics().at(-1)).toMatchObject({ event: 'safe-write-failed', store: 'recovery-date', errorName: 'QuotaExceededError' });
  });
});
