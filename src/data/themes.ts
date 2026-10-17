import type { ColorTheme } from '../domain/types';

export interface ColorThemePreset {
  id: ColorTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}

export const colorThemePresets: readonly ColorThemePreset[] = [
  { id: 'stillpoint', label: 'Stillpoint', description: 'Warm ivory, sage, and forest', swatches: ['#f7f4ea', '#7fa58a', '#245444'] },
  { id: 'catppuccin', label: 'Catppuccin', description: 'Soft mauve, periwinkle, and cream', swatches: ['#eff1f5', '#8839ef', '#ea76cb'] },
  { id: 'monokai', label: 'Monokai', description: 'Leaf green, warm charcoal, and coral', swatches: ['#272822', '#a6e22e', '#f92672'] },
  { id: 'obsidian', label: 'Obsidian', description: 'Deep graphite, cool slate, and violet', swatches: ['#0b0f14', '#334155', '#a78bfa'] },
  { id: 'lucide', label: 'Lucide', description: 'Clear sky, blue, and soft lavender', swatches: ['#eff6ff', '#2563eb', '#a78bfa'] },
];
