import { describe, expect, it } from 'vitest';
import { FALLBACK_LANDSCAPE, TRADITION_LANDSCAPES, landscapeFor, landscapeTradition } from './landscape';
import { selectDailyReading } from './daily-reading';
import { TRADITION_IDS } from './traditions';
import type { TraditionPreference } from './types';

const chosen = (traditionPreference: TraditionPreference) => ({ traditionPreference, traditionChoicePending: false });

describe('page-header landscape', () => {
  it('uses the soft fallback before a tradition is chosen and for spiritual but not religious', () => {
    expect(landscapeFor(undefined, new Date(2026, 10, 9))).toBe(FALLBACK_LANDSCAPE);
    expect(landscapeFor({ traditionPreference: { mode: 'one', traditions: ['christian'] }, traditionChoicePending: true }, new Date(2026, 10, 9))).toBe(FALLBACK_LANDSCAPE);
    expect(landscapeFor(chosen({ mode: 'one', traditions: ['reflective'] }), new Date(2026, 10, 9))).toBe(FALLBACK_LANDSCAPE);
  });

  it('gives every tradition a landscape', () => {
    for (const id of TRADITION_IDS) {
      expect(landscapeFor(chosen({ mode: 'one', traditions: [id] }), new Date(2026, 10, 9))).toBe(TRADITION_LANDSCAPES[id]);
    }
  });

  it('follows the tradition of today’s reading when several traditions take turns', () => {
    const preferences = [chosen({ mode: 'several', traditions: ['buddhist', 'muslim', 'red-road'] }), chosen({ mode: 'rotate', traditions: [] })];
    for (const preference of preferences) {
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(2026, 10, 1 + offset, 12);
        expect(landscapeTradition(preference, date)).toBe(selectDailyReading(date, preference.traditionPreference).tradition);
      }
    }
  });
});
