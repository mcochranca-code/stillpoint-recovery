import { describe, expect, it } from 'vitest';
import {
  BACKUP_NUDGE_MIN_RECORDS, calendarDaysBetween, describeDateChange, isSnoozed, pickTodayNudge, previousStretchDays, shouldOfferReadingChoice,
  shouldNudgeBackup, shouldOfferInstall, shouldOfferReminder, snoozeUntil, welcomeBackGap,
} from './engagement';

const now = new Date('2026-11-06T12:00:00');

describe('gentle re-engagement rules', () => {
  it('counts calendar days between local date keys', () => {
    expect(calendarDaysBetween('2026-11-01', '2026-11-06')).toBe(5);
    expect(calendarDaysBetween('2026-11-06', '2026-11-06')).toBe(0);
    expect(calendarDaysBetween('2026-03-07', '2026-03-09')).toBe(2); // across a DST change
    expect(calendarDaysBetween('not-a-date', '2026-11-06')).toBe(0);
  });

  it('welcomes someone back only after a few days away, and not twice the same day', () => {
    expect(welcomeBackGap(null, '2026-11-06')).toBeNull();
    expect(welcomeBackGap('2026-11-05', '2026-11-06')).toBeNull();
    expect(welcomeBackGap('2026-11-03', '2026-11-06')).toBe(3);
    expect(welcomeBackGap('2026-10-01', '2026-11-06')).toBe(36);
    expect(welcomeBackGap('2026-10-01', '2026-11-06', '2026-11-06')).toBeNull();
  });

  it('snoozes for a period and then lets the card return', () => {
    const until = snoozeUntil(now, 30);
    expect(isSnoozed(until, now)).toBe(true);
    expect(isSnoozed(until, new Date('2026-12-07T12:00:00'))).toBe(false);
    expect(isSnoozed(null, now)).toBe(false);
    expect(isSnoozed('garbage', now)).toBe(false);
  });

  it('offers a reminder only after a check-in and never after a denial', () => {
    const base = { reminderEnabled: false, permission: 'default' as const, checkedInToday: true, now };
    expect(shouldOfferReminder(base)).toBe(true);
    expect(shouldOfferReminder({ ...base, checkedInToday: false })).toBe(false);
    expect(shouldOfferReminder({ ...base, reminderEnabled: true })).toBe(false);
    expect(shouldOfferReminder({ ...base, permission: 'denied' })).toBe(false);
    expect(shouldOfferReminder({ ...base, permission: 'unsupported' })).toBe(false);
    expect(shouldOfferReminder({ ...base, permission: 'granted' })).toBe(true);
    expect(shouldOfferReminder({ ...base, snoozedUntil: snoozeUntil(now) })).toBe(false);
  });

  it('offers install on a return visit when the browser supports it', () => {
    const base = { canPrompt: true, isStandalone: false, activeDays: 2, now };
    expect(shouldOfferInstall(base)).toBe(true);
    expect(shouldOfferInstall({ ...base, activeDays: 1 })).toBe(false);
    expect(shouldOfferInstall({ ...base, canPrompt: false })).toBe(false);
    expect(shouldOfferInstall({ ...base, isStandalone: true })).toBe(false);
    expect(shouldOfferInstall({ ...base, snoozedUntil: snoozeUntil(now) })).toBe(false);
  });

  it('nudges a backup once there is something worth keeping and none is recent', () => {
    const base = { savedRecords: BACKUP_NUDGE_MIN_RECORDS, now };
    expect(shouldNudgeBackup(base)).toBe(true);
    expect(shouldNudgeBackup({ ...base, savedRecords: BACKUP_NUDGE_MIN_RECORDS - 1 })).toBe(false);
    expect(shouldNudgeBackup({ ...base, lastBackupAt: '2026-11-01T12:00:00' })).toBe(false);
    expect(shouldNudgeBackup({ ...base, lastBackupAt: '2026-09-01T12:00:00' })).toBe(true);
    expect(shouldNudgeBackup({ ...base, snoozedUntil: snoozeUntil(now) })).toBe(false);
  });

  it('acknowledges the length of a previous stretch', () => {
    expect(previousStretchDays('2026-10-01T00:00:00.000Z', '2026-11-06T12:00:00.000Z')).toBe(36);
    expect(previousStretchDays(null, '2026-11-06T12:00:00.000Z')).toBeNull();
    expect(previousStretchDays('2026-12-01T00:00:00.000Z', '2026-11-06T12:00:00.000Z')).toBeNull();
  });

  it('shows at most one optional card at a time', () => {
    expect(pickTodayNudge({ reminder: true, install: true, backup: true })).toBe('reminder');
    expect(pickTodayNudge({ reminder: false, install: true, backup: true })).toBe('backup');
    expect(pickTodayNudge({ reminder: false, install: true, backup: false })).toBe('install');
    expect(pickTodayNudge({ reminder: false, install: false, backup: false })).toBeNull();
    expect(pickTodayNudge({ readings: true, reminder: true, install: true, backup: true })).toBe('readings');
  });

  it('offers the reading choice only while it is pending and not resting', () => {
    const now = new Date(2026, 10, 6, 12);
    expect(shouldOfferReadingChoice({ choicePending: true, now })).toBe(true);
    expect(shouldOfferReadingChoice({ choicePending: false, now })).toBe(false);
    expect(shouldOfferReadingChoice({ choicePending: true, snoozedUntil: new Date(2026, 10, 8).toISOString(), now })).toBe(false);
  });

  it('names a fresh start kindly in the timeline and keeps plain date corrections neutral', () => {
    expect(describeDateChange({ previousStartAt: '2026-10-01T00:00:00.000Z', recordedAt: '2026-10-02T06:00:00.000Z', note: 'began-again' }))
      .toEqual({ title: 'Began again', description: 'A stretch of 1 day came before this, and it still counts.' });
    expect(describeDateChange({ previousStartAt: null, recordedAt: '2026-10-02T06:00:00.000Z', note: 'began-again' }).description).toMatch(/fresh start/);
    expect(describeDateChange({ previousStartAt: '2026-10-01T00:00:00.000Z', recordedAt: '2026-11-06T00:00:00.000Z' }).title).toBe('Recovery date updated');
  });
});
