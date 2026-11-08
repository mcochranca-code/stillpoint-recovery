import { describe, expect, it } from 'vitest';
import { isTraditionPreference, normalizeTraditionPreference, traditionPreferenceFromPreset, TRADITIONS } from './traditions';

describe('tradition preferences', () => {
  it('starts existing installs where they were: faith-based → Christian, faith-neutral → reflective', () => {
    expect(traditionPreferenceFromPreset('faith-based')).toEqual({ mode: 'one', traditions: ['christian'] });
    expect(traditionPreferenceFromPreset('faith-neutral')).toEqual({ mode: 'one', traditions: ['reflective'] });
    expect(traditionPreferenceFromPreset(undefined)).toEqual({ mode: 'one', traditions: ['christian'] });
  });

  it('validates stored preferences strictly', () => {
    expect(isTraditionPreference({ mode: 'several', traditions: ['buddhist', 'jain'] })).toBe(true);
    expect(isTraditionPreference({ mode: 'several', traditions: ['buddhist', 'pastafarian'] })).toBe(false);
    expect(isTraditionPreference({ mode: 'sometimes', traditions: [] })).toBe(false);
    expect(isTraditionPreference(null)).toBe(false);
  });

  it('repairs malformed preferences without losing valid choices', () => {
    expect(normalizeTraditionPreference({ mode: 'several', traditions: ['jain', 'oops', 'jain', 'buddhist'] })).toEqual({ mode: 'several', traditions: ['buddhist', 'jain'] });
    expect(normalizeTraditionPreference({ mode: 'one', traditions: ['muslim', 'hindu'] })).toEqual({ mode: 'one', traditions: ['muslim'] });
    expect(normalizeTraditionPreference({ mode: 'several', traditions: [] }, 'faith-neutral')).toEqual({ mode: 'one', traditions: ['reflective'] });
    expect(normalizeTraditionPreference('garbage', 'faith-based')).toEqual({ mode: 'one', traditions: ['christian'] });
  });

  it('includes every requested tradition plus a non-religious option, with a visible note for the Red Road', () => {
    expect(TRADITIONS.map((tradition) => tradition.id)).toEqual(['christian', 'buddhist', 'hindu', 'muslim', 'jain', 'red-road', 'reflective']);
    const redRoad = TRADITIONS.find((tradition) => tradition.id === 'red-road')!;
    expect(redRoad.note).toMatch(/differ from nation to nation/);
    expect(redRoad.note).toMatch(/White Bison/);
    expect(redRoad.note).toMatch(/Wellbriety/);
  });
});
