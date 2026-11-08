import { colorThemePresets } from '../data/themes';
import type { ColorTheme } from '../domain/types';

/** Point browser and future PWA saves at the locally selected palette identity. */
export function applyThemeIdentity(colorTheme: ColorTheme): void {
  const theme = colorThemePresets.some((preset) => preset.id === colorTheme) ? colorTheme : 'stillpoint';
  const iconPath = `/assets/branding/theme-icons/${theme}.svg`;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (favicon) favicon.href = iconPath;
  if (touchIcon) touchIcon.href = iconPath;
  if (manifest) manifest.href = `/theme-manifests/${theme}.webmanifest`;
}
