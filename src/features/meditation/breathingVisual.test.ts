import { describe, expect, it } from 'vitest';
import { getBoxBreathingOrbPosition } from './breathingVisual';

describe('getBoxBreathingOrbPosition', () => {
  it('travels around all four sides in inhale, hold, exhale and rest order', () => {
    expect(getBoxBreathingOrbPosition(0, 0, true)).toEqual({ x: 16, y: 84 });
    expect(getBoxBreathingOrbPosition(0, 1, true)).toEqual({ x: 16, y: 16 });
    expect(getBoxBreathingOrbPosition(1, 1, true)).toEqual({ x: 84, y: 16 });
    expect(getBoxBreathingOrbPosition(2, 1, true)).toEqual({ x: 84, y: 84 });
    expect(getBoxBreathingOrbPosition(3, 1, true)).toEqual({ x: 16, y: 84 });
  });

  it('skips the optional hold continuously and carries exhale over the top and right sides', () => {
    expect(getBoxBreathingOrbPosition(0, 1, false)).toEqual({ x: 16, y: 16 });
    expect(getBoxBreathingOrbPosition(2, 0, false)).toEqual({ x: 16, y: 16 });
    expect(getBoxBreathingOrbPosition(2, 0.5, false)).toEqual({ x: 84, y: 16 });
    expect(getBoxBreathingOrbPosition(2, 1, false)).toEqual({ x: 84, y: 84 });
  });

  it('clamps phase progress and provides a stable fallback for unknown indices', () => {
    expect(getBoxBreathingOrbPosition(0, -1, true)).toEqual(getBoxBreathingOrbPosition(0, 0, true));
    expect(getBoxBreathingOrbPosition(0, 2, true)).toEqual(getBoxBreathingOrbPosition(0, 1, true));
    expect(getBoxBreathingOrbPosition(9, 0.5, true)).toEqual({ x: 16, y: 16 });
  });
});
