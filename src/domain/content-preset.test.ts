import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT_PRESET, isContentPreset, shouldShowFaithContent } from './content-preset';

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
