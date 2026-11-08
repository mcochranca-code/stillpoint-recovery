import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT_PRESET, hasChosenChristianTradition, isContentPreset, shouldShowChristianExtras, shouldShowFaithContent } from './content-preset';
import { defaultPreferences } from '../db/repository';
import type { UserPreferences } from './types';

describe('faith content preset', () => {
  it('keeps existing and missing preferences on the Faith-based default', () => {
    expect(DEFAULT_CONTENT_PRESET).toBe('faith-based');
    expect(shouldShowFaithContent(undefined)).toBe(true);
    expect(shouldShowFaithContent('faith-based')).toBe(true);
  });

  it('hides optional faith sections only for the Faith-neutral preset', () => {
    expect(shouldShowFaithContent('faith-neutral')).toBe(false);
  });

  it('accepts only supported preset values', () => {
    expect(isContentPreset('faith-based')).toBe(true);
    expect(isContentPreset('faith-neutral')).toBe(true);
    expect(isContentPreset('unknown')).toBe(false);
  });
});

describe('Christian extras (Our Daily Bread, Scripture library)', () => {
  const christian = { mode: 'one', traditions: ['christian'] } as UserPreferences['traditionPreference'];
  const legacy = (overrides: Partial<UserPreferences> = {}) => {
    const record: Partial<UserPreferences> = { ...defaultPreferences(), traditionPreference: christian, ...overrides };
    delete record.christianExtras;
    delete record.traditionChoicePending;
    return record;
  };

  it('are off for a new install, before and after choosing a tradition, until opted in', () => {
    const fresh = defaultPreferences();
    expect(fresh.christianExtras).toBe(false);
    expect(shouldShowChristianExtras(fresh)).toBe(false);
    expect(shouldShowChristianExtras({ ...fresh, traditionChoicePending: false, traditionPreference: christian })).toBe(false);
    expect(shouldShowChristianExtras({ ...fresh, traditionChoicePending: false, traditionPreference: christian, christianExtras: true })).toBe(true);
  });

  it('need Christian among the chosen traditions, even when opted in', () => {
    const base = { ...defaultPreferences(), traditionChoicePending: false, christianExtras: true };
    expect(shouldShowChristianExtras({ ...base, traditionPreference: { mode: 'one', traditions: ['buddhist'] } })).toBe(false);
    expect(shouldShowChristianExtras({ ...base, traditionPreference: { mode: 'several', traditions: ['christian', 'muslim'] } })).toBe(true);
    expect(shouldShowChristianExtras({ ...base, traditionPreference: { mode: 'rotate', traditions: ['christian', 'hindu', 'reflective'] } })).toBe(true);
    expect(shouldShowChristianExtras({ ...base, traditionChoicePending: true, traditionPreference: christian })).toBe(false);
    expect(hasChosenChristianTradition(undefined)).toBe(false);
  });

  it('keep the earlier behaviour for installs from before the switch until they change it', () => {
    expect(shouldShowChristianExtras(legacy({ contentPreset: 'faith-based' }))).toBe(true);
    expect(shouldShowChristianExtras(legacy({ contentPreset: 'faith-neutral', traditionPreference: { mode: 'one', traditions: ['reflective'] } }))).toBe(false);
    expect(shouldShowChristianExtras(legacy({ contentPreset: 'faith-neutral' }))).toBe(false);
    expect(shouldShowChristianExtras({ ...legacy({ contentPreset: 'faith-based' }), christianExtras: false })).toBe(false);
  });
});
