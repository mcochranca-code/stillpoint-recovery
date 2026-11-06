import { describe, expect, it } from 'vitest';
import { readingsByTradition } from '../data/readings';
import { activeTraditions, localDayNumber, selectDailyReading } from './daily-reading';
import { TRADITION_IDS } from './traditions';
import type { TraditionPreference } from './types';

const day = (offset: number) => new Date(2026, 10, 1 + offset, 9, 30);
const one = (tradition: TraditionPreference['traditions'][number]): TraditionPreference => ({ mode: 'one', traditions: [tradition] });

describe('daily reading selection', () => {
  it('keeps the same reading all day, whatever the hour', () => {
    const morning = new Date(2026, 10, 6, 0, 5);
    const night = new Date(2026, 10, 6, 23, 55);
    expect(selectDailyReading(morning, one('buddhist')).entry.id).toBe(selectDailyReading(night, one('buddhist')).entry.id);
    expect(localDayNumber(morning)).toBe(localDayNumber(night));
  });

  it('is deterministic for the same date and preference', () => {
    const preference: TraditionPreference = { mode: 'several', traditions: ['muslim', 'jain'] };
    expect(selectDailyReading(day(3), preference)).toEqual(selectDailyReading(day(3), preference));
  });

  it('draws only from the chosen tradition and moves through every entry without skipping', () => {
    for (const tradition of TRADITION_IDS) {
      const pool = readingsByTradition[tradition];
      const seen = new Set<string>();
      for (let offset = 0; offset < pool.length; offset += 1) {
        const selection = selectDailyReading(day(offset), one(tradition));
        expect(selection.tradition).toBe(tradition);
        expect(selection.entry.tradition).toBe(tradition);
        seen.add(selection.entry.id);
      }
      expect(seen.size).toBe(pool.length);
    }
  });

  it('takes turns between several chosen traditions, one per day', () => {
    const preference: TraditionPreference = { mode: 'several', traditions: ['hindu', 'red-road'] };
    const traditions = Array.from({ length: 6 }, (_, offset) => selectDailyReading(day(offset), preference).tradition);
    expect(new Set(traditions)).toEqual(new Set(['hindu', 'red-road']));
    for (let index = 1; index < traditions.length; index += 1) expect(traditions[index]).not.toBe(traditions[index - 1]);
  });

  it('rotates through every tradition within a week', () => {
    const preference: TraditionPreference = { mode: 'rotate', traditions: [] };
    const traditions = new Set(Array.from({ length: TRADITION_IDS.length }, (_, offset) => selectDailyReading(day(offset), preference).tradition));
    expect([...traditions].sort()).toEqual([...TRADITION_IDS].sort());
  });

  it('falls back gracefully when the stored preference is missing or invalid', () => {
    expect(activeTraditions(undefined)).toEqual(['christian']);
    expect(activeTraditions({ mode: 'one', traditions: ['not-a-tradition' as never] })).toEqual(['christian']);
    expect(activeTraditions({ mode: 'several', traditions: [] })).toEqual(['christian']);
    expect(selectDailyReading(new Date('invalid'), undefined).entry).toBeDefined();
  });

  it('explains why the reading was chosen, in plain words', () => {
    expect(selectDailyReading(day(0), one('jain')).why).toMatch(/Jain readings you chose/);
    expect(selectDailyReading(day(0), { mode: 'several', traditions: ['jain', 'muslim'] }).why).toMatch(/You chose 2 traditions/);
    expect(selectDailyReading(day(0), { mode: 'rotate', traditions: [] }).why).toMatch(/rotating through all 7 traditions/);
  });
});
