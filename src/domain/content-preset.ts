import type { ContentPreset } from './types';

export const DEFAULT_CONTENT_PRESET: ContentPreset = 'faith-based';

export function isContentPreset(value: unknown): value is ContentPreset {
  return value === 'faith-based' || value === 'faith-neutral';
}

export function shouldShowFaithContent(preset: ContentPreset | undefined): boolean {
  return (preset ?? DEFAULT_CONTENT_PRESET) === 'faith-based';
}
