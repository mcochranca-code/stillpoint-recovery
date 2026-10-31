import { describe, expect, it } from 'vitest';
import { milestoneTokenArtworkPalette } from './milestone-token-palette';

function luminance(hex: string) {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * (channels[0] ?? 0)) + (0.7152 * (channels[1] ?? 0)) + (0.0722 * (channels[2] ?? 0));
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

describe('AA medallion palette', () => {
  it('preserves the supplied red enamel and foil while using legible 30-day engraving', () => {
    const palette = milestoneTokenArtworkPalette('30-days', 'medallion');

    expect(palette).toMatchObject({ color: '#c8102e', foil: '#ff3b5c', ink: '#fff3e7' });
    expect(contrastRatio(palette.ink, palette.color)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps engraved text readable across the bundled AA medallion colorways', () => {
    const milestoneIds = [
      '24-hours',
      '30-days',
      '60-days',
      '90-days',
      'calendar-6-months',
      'calendar-9-months',
      'calendar-12-months',
      'calendar-18-months',
      'calendar-2-years',
    ];

    milestoneIds.forEach((id) => {
      const palette = milestoneTokenArtworkPalette(id, 'medallion');
      expect(contrastRatio(palette.ink, palette.color), id).toBeGreaterThanOrEqual(4.5);
    });
  });
});
