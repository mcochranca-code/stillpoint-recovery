import { describe, expect, it } from 'vitest';
import { daypartFor } from './daypart';

describe('daypartFor', () => {
  it('maps local hours to dawn, day, dusk and night', () => {
    const at = (hour: number) => daypartFor(new Date(2026, 10, 6, hour, 30));
    expect([4, 5, 8, 9, 16, 17, 20, 21, 0].map(at)).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
  });
});
