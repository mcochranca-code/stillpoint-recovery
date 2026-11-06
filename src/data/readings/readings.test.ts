import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allReadings, findReading, readingsByTradition } from '.';
import { reflections } from '../reflections';
import { RECOVERY_THEME_LABELS, TRADITION_IDS } from '../../domain/traditions';

/** Teachers whose own writings are under copyright: their words must never be quoted. */
const COPYRIGHTED_AUTHORS = ['Pema Chödrön', 'Pema Chodron', 'Thich Nhat Hanh', 'Thích Nhất Hạnh'];
const QUOTE_MARKS = /["“”«»„]/;
const NEW_TRADITIONS = ['buddhist', 'hindu', 'muslim', 'jain', 'red-road'] as const;

describe('daily reading content schema', () => {
  it('gives every entry a source, citation, translation or attribution, license, prompt and recovery theme', () => {
    for (const entry of allReadings) {
      expect(entry.id, entry.id).toMatch(/^[a-z0-9-]+$/);
      expect(TRADITION_IDS).toContain(entry.tradition);
      for (const field of ['source', 'citation', 'translation', 'licenseNote', 'text', 'reflectionPrompt'] as const) {
        expect(entry[field].trim(), `${entry.id}.${field}`).not.toBe('');
      }
      expect(['public-domain', 'original-mit']).toContain(entry.license);
      expect(Object.keys(RECOVERY_THEME_LABELS)).toContain(entry.recoveryTheme);
    }
  });

  it('uses unique IDs that never collide with the original Stillpoint reflections', () => {
    const ids = allReadings.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const reflectionIds = new Set(reflections.map((item) => item.id));
    expect(ids.filter((id) => reflectionIds.has(id))).toEqual([]);
    expect(findReading(ids[0]!)?.id).toBe(ids[0]);
  });

  it('ships at least 14 entries for each new tradition and keeps the Christian scripture', () => {
    for (const tradition of NEW_TRADITIONS) expect(readingsByTradition[tradition].length, tradition).toBeGreaterThanOrEqual(14);
    expect(readingsByTradition.reflective.length).toBeGreaterThanOrEqual(14);
    expect(readingsByTradition.christian.map((entry) => entry.id)).toEqual(expect.arrayContaining(['romans-15-13', 'psalm-51-10']));
  });

  it('touches several recovery themes in every tradition', () => {
    for (const tradition of TRADITION_IDS) {
      expect(new Set(readingsByTradition[tradition].map((entry) => entry.recoveryTheme)).size, tradition).toBeGreaterThanOrEqual(5);
    }
  });

  it('only quotes verbatim text from public-domain translations published before 1931', () => {
    for (const entry of allReadings.filter((item) => item.kind === 'verbatim')) {
      expect(entry.license, entry.id).toBe('public-domain');
      const years = [...`${entry.translation} ${entry.licenseNote}`.matchAll(/\b(1[5-9]\d\d)\b/g)].map((match) => Number(match[1]));
      expect(years.length, `${entry.id} names a publication year`).toBeGreaterThan(0);
      expect(Math.min(...years), entry.id).toBeLessThan(1931);
    }
  });

  it('labels paraphrases and original reflections as Stillpoint’s own wording', () => {
    for (const entry of allReadings.filter((item) => item.kind !== 'verbatim')) {
      expect(entry.license, entry.id).toBe('original-mit');
      expect(entry.translation, entry.id).toMatch(/Original (paraphrase|reflection)/);
    }
  });

  it('never quotes copyrighted teachers: their themes appear only as quote-free original reflections', () => {
    for (const entry of allReadings) {
      const mentions = COPYRIGHTED_AUTHORS.some((author) => [entry.text, entry.source, entry.translation, entry.inspiredBy ?? ''].some((field) => field.includes(author)));
      if (!mentions) continue;
      expect(entry.kind, entry.id).toBe('original');
      expect(entry.license, entry.id).toBe('original-mit');
      expect(entry.inspiredBy, entry.id).toBeTruthy();
      expect(entry.translation, entry.id).toMatch(/^Original reflection by Stillpoint, inspired by the teachings of/);
      expect(QUOTE_MARKS.test(entry.text), `${entry.id} contains quotation marks`).toBe(false);
      expect(COPYRIGHTED_AUTHORS.some((author) => entry.text.includes(author)), `${entry.id} names the teacher inside the reflection text`).toBe(false);
      expect(entry.furtherReading?.length, entry.id).toBeGreaterThan(0);
    }
    expect(allReadings.filter((entry) => entry.inspiredBy).length).toBeGreaterThanOrEqual(6);
  });

  it('keeps Red Road entries original, ceremony-free and pointed toward Native-led resources', () => {
    for (const entry of readingsByTradition['red-road']) {
      expect(entry.kind, entry.id).toBe('original');
      expect(entry.translation).toMatch(/does not speak for any nation/);
      expect(entry.text.toLowerCase()).not.toMatch(/\b(smudg|sweat lodge|sacred pipe|sun dance|vision quest|peyote|ceremony)/);
    }
  });

  it('lists every source and translation in CONTENT_SOURCES.md', () => {
    const doc = readFileSync(resolve(__dirname, '../../../CONTENT_SOURCES.md'), 'utf8');
    for (const name of ['King James Version', 'Max Müller', 'Edwin Arnold', 'Marmaduke Pickthall', 'Hermann Jacobi', 'George Long', 'Srimad Bhagavatam', 'Hadith', 'Tattvārtha', 'Pema Chödrön', 'Thich Nhat Hanh', 'White Bison', 'Wellbriety']) {
      expect(doc, name).toContain(name);
    }
  });
});
