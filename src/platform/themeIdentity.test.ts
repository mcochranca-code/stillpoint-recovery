import { afterEach, describe, expect, it } from 'vitest';
import type { ColorTheme } from '../domain/types';
import { applyThemeIdentity } from './themeIdentity';

function addIdentityLinks() {
  document.head.innerHTML = '<link rel="icon" href="/assets/branding/app-icon.svg"><link rel="apple-touch-icon" href="/assets/branding/app-icon.svg"><link rel="manifest" href="/manifest.webmanifest">';
}

afterEach(() => { document.head.innerHTML = ''; });

describe('theme app identity', () => {
  it('selects the local icon and install manifest for the active palette', () => {
    addIdentityLinks();
    applyThemeIdentity('ocean');

    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe('/assets/branding/theme-icons/ocean.svg');
    expect(document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/assets/branding/theme-icons/ocean.svg');
    expect(document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.getAttribute('href')).toBe('/theme-manifests/ocean.webmanifest');
  });

  it('falls back to the default palette if an old or invalid preference is encountered', () => {
    addIdentityLinks();
    applyThemeIdentity('not-a-theme' as ColorTheme);
    expect(document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.getAttribute('href')).toBe('/theme-manifests/stillpoint.webmanifest');
  });
});
