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

/** Parse `selector { --x: value }` blocks from a stylesheet into a selector → declarations map. */
function cssBlocks(file: string) {
  const text = readFileSync(resolve(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const found: Array<{ selectors: string[]; declarations: Record<string, string> }> = [];
  for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations: Record<string, string> = {};
    for (const [, name, value] of match[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) declarations[name!.trim()] = value!.trim();
    if (Object.keys(declarations).length) found.push({ selectors: match[1]!.split(',').map((selector) => selector.trim()), declarations });
  }
  return found;
}
const ratioOf = (foreground: Rgba, background: Rgba) => contrast(foreground[3] < 1 ? over(foreground, background) : foreground, background);

describe('time-of-day atmosphere keeps canvas text at WCAG AA', () => {
  const atmosphere = cssBlocks('./atmosphere.css');
  const tintsFor = (daypart: string, dark: boolean) => {
    const wanted = dark ? [`:root.dark[data-daypart='${daypart}']`, ...(daypart === 'day' ? [':root.dark'] : [])] : [`:root[data-daypart='${daypart}']`, ...(daypart === 'day' ? [':root'] : [])];
    const block = atmosphere.find((item) => item.selectors.some((selector) => wanted.includes(selector)));
    if (!block) throw new Error(`No atmosphere tints for ${daypart} (${dark ? 'dark' : 'light'})`);
    return ['--atmos-a', '--atmos-b', '--atmos-c'].map((name) => parseColor(block.declarations[name]!));
  };
  for (const { id } of colorThemePresets) {
    for (const dark of [false, true]) {
      for (const daypart of ['dawn', 'day', 'dusk', 'night']) {
        it(`${id} · ${dark ? 'dark' : 'light'} · ${daypart}`, () => {
          const palette = paletteFor(id, dark);
          const canvas = parseColor(palette['--canvas']!);
          const failures: string[] = [];
          // Worst case: every gradient layer at full strength stacked over the canvas.
          const stacked = tintsFor(daypart, dark).reduce((background, tint) => over(tint, background), canvas);
          for (const background of [canvas, stacked, ...tintsFor(daypart, dark).map((tint) => over(tint, canvas))]) {
            for (const name of ['--ink', '--muted', '--eyebrow-color']) {
              const ratio = ratioOf(parseColor(palette[name]!), background);
              if (ratio < 4.5) failures.push(`${name}: ${ratio.toFixed(2)}`);
            }
          }
          expect(failures).toEqual([]);
        });
      }
    }
  }
});

describe('tradition accents meet WCAG AA on every palette', () => {
  const readings = cssBlocks('./readings.css');
  const traditions = ['christian', 'buddhist', 'hindu', 'muslim', 'jain', 'red-road', 'reflective'];
  for (const tradition of traditions) {
    for (const dark of [false, true]) {
      it(`${tradition} · ${dark ? 'dark' : 'light'}`, () => {
        const selector = `${dark ? '.dark ' : ''}.tradition-${tradition}`;
        const accents = readings.find((block) => block.selectors.includes(selector))?.declarations;
        expect(accents, `missing ${selector}`).toBeDefined();
        const failures: string[] = [];
        for (const { id } of colorThemePresets) {
          const palette = paletteFor(id, dark);
          const surface = parseColor(palette['--surface']!);
          const wash = over(parseColor(accents!['--tradition-wash']!), surface);
          const ink = parseColor(accents!['--tradition-ink']!);
          for (const [label, background] of [['surface', surface], ['wash', wash]] as const) {
            const tradRatio = ratioOf(ink, background);
            if (tradRatio < 4.5) failures.push(`${id}: --tradition-ink on ${label} ${tradRatio.toFixed(2)}`);
            const inkRatio = ratioOf(parseColor(palette['--ink']!), background);
            if (inkRatio < 4.5) failures.push(`${id}: --ink on ${label} ${inkRatio.toFixed(2)}`);
          }
          // The accent marks borders and motifs: non-text contrast needs 3:1.
          const accentRatio = ratioOf(parseColor(accents!['--tradition-accent']!), surface);
          if (accentRatio < 3) failures.push(`${id}: --tradition-accent on surface ${accentRatio.toFixed(2)}`);
        }
        expect(failures).toEqual([]);
      });
    }
  }
});

describe('landscape header band keeps header text at WCAG AA', () => {
  const refresh = readFileSync(resolve(__dirname, './refresh.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const scrim = Number(refresh.match(/--band-scrim:\s*(\d+)%/)?.[1]) / 100;
  const tints = [...refresh.matchAll(/(\.dark )?\.landscape-band-(dawn|dusk|night) \.landscape-band__tint \{ background: (rgba\([^)]*\))/g)]
    .map((match) => ({ dark: Boolean(match[1]), color: parseColor(match[3]!) }));
  const brightness = Number(refresh.match(/\.dark \.landscape-band__art \{ filter: brightness\(([\d.]+)\)/)?.[1] ?? 1);
  const landscapes = ['sunrise-hills', 'still-lake', 'forest-path', 'ocean-dusk', 'soft-bokeh'];

  it('reads a scrim, tints and a dark-mode dimming from refresh.css', () => {
    expect(scrim).toBeGreaterThan(0.5);
    expect(tints.length).toBeGreaterThanOrEqual(4);
    expect(brightness).toBeLessThanOrEqual(1);
  });

  for (const landscape of landscapes) {
    for (const dark of [false, true]) {
      it(`${landscape} · ${dark ? 'dark' : 'light'}`, () => {
        const svg = readFileSync(resolve(__dirname, `../../public/assets/backgrounds/${landscape}.svg`), 'utf8');
        // Every colour the art paints, plus white (its blur/highlight layers can approach it).
        const art = [...new Set([...svg.matchAll(/#[0-9a-f]{6}\b/gi)].map((match) => match[0].toLowerCase()))].map(parseColor).concat([[255, 255, 255, 1]]);
        const failures: string[] = [];
        for (const { id } of colorThemePresets) {
          const palette = paletteFor(id, dark);
          const canvas = parseColor(palette['--canvas']!);
          for (const pixel of art) {
            const dimmed: Rgba = dark ? [pixel[0] * brightness, pixel[1] * brightness, pixel[2] * brightness, 1] : pixel;
            const washes = [dimmed, ...tints.filter((tint) => dark || !tint.dark).map((tint) => over(tint.color, dimmed))];
            for (const washed of washes) {
              const background = over([canvas[0], canvas[1], canvas[2], scrim], washed);
              for (const name of ['--ink', '--muted', '--eyebrow-color']) {
                const ratio = ratioOf(parseColor(palette[name]!), background);
                if (ratio < 4.5) failures.push(`${id} ${name} over ${pixel.slice(0, 3).join(',')}: ${ratio.toFixed(2)}`);
              }
            }
          }
        }
        expect([...new Set(failures)].slice(0, 12)).toEqual([]);
      });
    }
  }
});

describe('charm previews in refresh.css', () => {
  const css = readFileSync(resolve(__dirname, './refresh.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('dims the next charm, keeps captions at label size, and drops transitions when motion is reduced', () => {
    expect(css).toMatch(/\.today-next-charm \.charm-medallion \{ opacity: \.\d+; \}/);
    expect(css).toMatch(/\.today-next-charm small \{[^}]*font-size: var\(--text-label\)/);
    expect(css).toMatch(/\.reduce-motion \.recent-charms__item \{ transition: none; \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.recent-charms__item \{ transition: none; \} \}/);
  });
});
