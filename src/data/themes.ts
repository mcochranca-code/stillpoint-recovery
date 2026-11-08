import paletteData from './theme-presets.json';
import type { ColorTheme } from '../domain/types';

export interface ColorThemePreset {
  id: ColorTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}

export const colorThemePresets = paletteData as unknown as readonly ColorThemePreset[];
