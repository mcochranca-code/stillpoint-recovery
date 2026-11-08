import type { ColorTheme } from '../domain/types';

export interface ColorThemePreset {
  id: ColorTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}

export const colorThemePresets: readonly ColorThemePreset[] = [
  { id: 'stillpoint', label: 'Stillpoint', description: 'Warm ivory, sage, and forest', swatches: ['#f7f4ea', '#7fa58a', '#245444'] },
  { id: 'catppuccin', label: 'Catppuccin', description: 'Lavender-gray, mauve, and green', swatches: ['#eff1f5', '#7c2fe0', '#40a02b'] },
  { id: 'monokai', label: 'Monokai', description: 'Warm ivory, charcoal, and leaf green', swatches: ['#f2f0e5', '#668227', '#272822'] },
  { id: 'obsidian', label: 'Obsidian', description: 'Cool gray, graphite, and teal', swatches: ['#f1f4f8', '#334155', '#0f766e'] },
  { id: 'lucide', label: 'Lucide', description: 'Clear sky, blue, and teal', swatches: ['#eff6ff', '#2563eb', '#0f766e'] },
];
