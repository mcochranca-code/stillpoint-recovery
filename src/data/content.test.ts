import { describe, expect, it } from 'vitest';
import { charmDefinitions } from './charms';
import { meditationExercises } from './exercises';
import { colorThemePresets } from './themes';
import { getDailyReflection, reflections } from './reflections';
import { scriptureEntries } from './scripture';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('bundled local recovery content', () => {
  it('contains at least 90 complete original daily reflections with unique IDs', () => {
    expect(reflections.length).toBeGreaterThanOrEqual(90);
    expect(unique(reflections.map((item) => item.id))).toBe(true);
    for (const item of reflections) {
      expect(item.title.trim()).not.toBe('');
      expect(item.reading.trim()).not.toBe('');
      expect(item.principle.trim()).not.toBe('');
      expect(item.practice.trim()).not.toBe('');
      expect(item.question.trim()).not.toBe('');
    }
  });

  it('selects the same reflection throughout a local calendar day', () => {
    const morning = new Date(2026, 9, 17, 7, 15);
    const evening = new Date(2026, 9, 17, 22, 50);
    expect(getDailyReflection(morning).id).toBe(getDailyReflection(evening).id);
  });

  it('includes the expected ten KJV scripture entries with complete recovery context', () => {
    expect(scriptureEntries).toHaveLength(10);
    expect(unique(scriptureEntries.map((item) => item.id))).toBe(true);
    for (const item of scriptureEntries) {
      expect(item.reference).not.toBe('');
      expect(item.translation).toMatch(/KJV/);
      expect(item.verse).not.toBe('');
      expect(item.explanation).not.toBe('');
      expect(item.principle).not.toBe('');
      expect(item.application).not.toBe('');
    }
  });

  it('includes ten distinct gentle meditation exercises with nonempty, positive pacing', () => {
    expect(meditationExercises).toHaveLength(10);
    expect(unique(meditationExercises.map((item) => item.id))).toBe(true);
    for (const item of meditationExercises) {
      expect(item.instructions.length).toBeGreaterThan(0);
      expect(item.phases.length).toBeGreaterThan(0);
      expect(item.phases.every((phase) => phase.seconds > 0)).toBe(true);
      const includesHold = item.phases.some((phase) => phase.label === 'Hold');
      expect(!includesHold || item.holdOptional).toBe(true);
    }
  });

  it('contains the complete twelve-charm Journey Collection with unique IDs', () => {
    expect(charmDefinitions).toHaveLength(12);
    expect(unique(charmDefinitions.map((item) => item.id))).toBe(true);
    expect(charmDefinitions.every((item) => item.name && item.criteria && item.description && item.image)).toBe(true);
  });

  it('offers five named, distinct color palettes with three preview swatches each', () => {
    expect(colorThemePresets.map((preset) => preset.id)).toEqual(['stillpoint', 'catppuccin', 'monokai', 'obsidian', 'lucide']);
    expect(colorThemePresets.every((preset) => preset.swatches.length === 3 && preset.label && preset.description)).toBe(true);
  });
});
