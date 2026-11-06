import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colorThemePresets } from '../data/themes';

/**
 * Guards WCAG 2.2 AA contrast for every color theme in light and dark mode by
 * reading the palette custom properties straight from styles.css, so a palette
 * change that drops below AA fails CI instead of shipping.
 */
const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@(import|tailwind|config)[^;]*;/g, '');

type Rgba = [number, number, number, number];
const blocks: Array<{ selectors: string[]; declarations: Record<string, string> }> = [];
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const declarations: Record<string, string> = {};
  for (const [, name, value] of match[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) declarations[name!.trim()] = value!.trim();
  if (Object.keys(declarations).length) blocks.push({ selectors: match[1]!.split(',').map((selector) => selector.trim()), declarations });
}

function paletteFor(theme: string, dark: boolean, highContrast = false) {
  const wanted = new Set([':root']);
  if (dark) { wanted.add('.dark'); wanted.add(':root.dark'); }
  if (theme !== 'stillpoint') {
    wanted.add(`:root[data-color-theme='${theme}']`);
    if (dark) wanted.add(`:root.dark[data-color-theme='${theme}']`);
  }
  if (highContrast) {
    wanted.add('.high-contrast');
    if (dark) wanted.add('.dark.high-contrast');
    if (theme !== 'stillpoint') wanted.add(':root[data-color-theme].high-contrast');
    if (dark && theme !== 'stillpoint') wanted.add(':root.dark.high-contrast[data-color-theme]');
  }
  const palette: Record<string, string> = {};
  for (const block of blocks) if (block.selectors.some((selector) => wanted.has(selector))) Object.assign(palette, block.declarations);
  return palette;
}

function parseColor(value: string): Rgba {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((digit) => digit + digit).join('') : hex[1]!;
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)).concat(1) as Rgba;
  }
  const rgba = value.match(/^rgba?\(([^)]*)\)$/i);
  if (rgba) {
    const parts = rgba[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
  }
  throw new Error(`Unsupported color value: ${value}`);
}

const over = (foreground: Rgba, background: Rgba): Rgba => {
  const alpha = foreground[3];
  return [0, 1, 2].map((index) => foreground[index]! * alpha + background[index]! * (1 - alpha)).concat(1) as Rgba;
};
const luminance = ([red, green, blue]: Rgba) => [red, green, blue]
  .map((channel) => { const value = channel / 255; return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; })
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
const contrast = (first: Rgba, second: Rgba) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
};

const textPairs: Array<[string, string]> = [
  ['--ink', '--canvas'], ['--ink', '--surface'], ['--muted', '--canvas'], ['--muted', '--surface'],
  ['--primary-ink', '--primary'], ['--primary', '--surface'], ['--primary', '--canvas'],
  ['--eyebrow-color', '--surface'], ['--eyebrow-color', '--canvas'], ['--selected-ink', '--selected-bg'],
  ['--counter-ink', '--counter-hero-start'], ['--counter-ink', '--counter-hero-end'],
  ['--counter-accent', '--counter-hero-end'], ['--counter-muted', '--counter-hero-end'],
];
const nonTextPairs: Array<[string, string]> = [['--focus-ring', '--canvas'], ['--focus-ring', '--surface']];

describe('design token contrast (WCAG AA)', () => {
  for (const { id } of colorThemePresets) {
    for (const dark of [false, true]) {
      for (const highContrast of [false, true]) {
        const label = `${id} · ${dark ? 'dark' : 'light'}${highContrast ? ' · high contrast' : ''}`;
        it(`${label} meets 4.5:1 for text and 3:1 for focus indicators`, () => {
          const palette = paletteFor(id, dark, highContrast);
          const surface = parseColor(palette['--surface']!);
          const failures: string[] = [];
          const check = ([foregroundName, backgroundName]: [string, string], minimum: number) => {
            let background = parseColor(palette[backgroundName]!);
            if (background[3] < 1) background = over(background, surface);
            let foreground = parseColor(palette[foregroundName]!);
            if (foreground[3] < 1) foreground = over(foreground, background);
            const ratio = contrast(foreground, background);
            if (ratio < minimum) failures.push(`${foregroundName} on ${backgroundName}: ${ratio.toFixed(2)} < ${minimum}`);
          };
          textPairs.forEach((pair) => check(pair, 4.5));
          nonTextPairs.forEach((pair) => check(pair, 3));
          expect(failures).toEqual([]);
        });
      }
    }
  }
});

describe('motion tokens', () => {
  const tokens = readFileSync(resolve(__dirname, './tokens.css'), 'utf8');
  it('collapse every duration to 0ms for reduced motion (OS setting and in-app setting)', () => {
    const durationNames = [...tokens.matchAll(/(--motion-[a-z]+):\s*\d+ms/g)].map((match) => match[1]!);
    const unique = [...new Set(durationNames)];
    expect(unique.length).toBeGreaterThanOrEqual(5);
    const reducedBlocks = [...tokens.matchAll(/(?:prefers-reduced-motion: reduce\)\s*\{\s*:root|:root\.reduce-motion)\s*\{([^}]*)\}/g)].map((match) => match[1]!);
    expect(reducedBlocks).toHaveLength(2);
    for (const block of reducedBlocks) for (const name of unique) expect(block).toMatch(new RegExp(`${name}:\\s*0ms`));
  });
});
