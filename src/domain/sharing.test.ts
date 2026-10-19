import { describe, expect, it, vi } from 'vitest';
import { buildMilestoneShareText, buildNaSharePayload, shareOrCopy } from './sharing';

function setNavigatorValue(key: 'share' | 'clipboard', value: unknown): () => void {
  const previous = Object.getOwnPropertyDescriptor(navigator, key);
  Object.defineProperty(navigator, key, { configurable: true, value });
  return () => {
    if (previous) Object.defineProperty(navigator, key, previous);
    else Reflect.deleteProperty(navigator, key);
  };
}

describe('privacy-limited share content', () => {
  it('keeps the milestone message neutral and omits title/date by default', () => {
    const text = buildMilestoneShareText({
      message: 'A moment worth recognizing.',
      label: '90 days of recovery',
      dateLabel: 'October 18, 2026',
      includeLabel: false,
      includeDate: false,
    });
    expect(text).toBe('A moment worth recognizing.');
    expect(text).not.toContain('90 days');
    expect(text).not.toContain('October 18');
  });

  it('adds only the milestone fields selected in the preview', () => {
    expect(buildMilestoneShareText({
      message: 'A moment worth recognizing.',
      label: '90 days of recovery',
      dateLabel: 'October 18, 2026',
      includeLabel: true,
      includeDate: false,
    })).toBe('A moment worth recognizing.\nMilestone: 90 days of recovery');
  });

  it('shares the official NAWS URL without copying or embedding the copyrighted daily text', () => {
    const payload = buildNaSharePayload('https://na.org/daily-meditations/');
    expect(payload.url).toBe('https://na.org/daily-meditations/');
    expect(payload.title).toContain('Narcotics Anonymous');
    expect(payload.text).toContain('official site');
    expect(payload.text).not.toContain('READING BODY');
  });

  it('uses the native share sheet only after the caller invokes the share action', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const restoreShare = setNavigatorValue('share', nativeShare);
    try {
      const payload = buildNaSharePayload('https://na.org/daily-meditations/');
      const result = await shareOrCopy(payload);
      expect(result).toBe('shared');
      expect(nativeShare).toHaveBeenCalledWith({ title: payload.title, text: payload.text, url: payload.url });
    } finally { restoreShare(); }
  });

  it('copies only the preview and URL when native sharing is unavailable', async () => {
    const copied: string[] = [];
    const restoreShare = setNavigatorValue('share', undefined);
    const restoreClipboard = setNavigatorValue('clipboard', { writeText: async (value: string) => { copied.push(value); } });
    try {
      const result = await shareOrCopy({ title: 'NA Just for Today', text: 'Official reading link', url: 'https://na.org/daily-meditations/' });
      expect(result).toBe('copied');
      expect(copied).toEqual(['Official reading link\nhttps://na.org/daily-meditations/']);
    } finally { restoreClipboard(); restoreShare(); }
  });

  it('treats native-share cancellation as canceled, without copying instead', async () => {
    const nativeShare = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    const writeText = vi.fn();
    const restoreShare = setNavigatorValue('share', nativeShare);
    const restoreClipboard = setNavigatorValue('clipboard', { writeText });
    try {
      const result = await shareOrCopy({ title: 'Milestone', text: 'A moment worth recognizing.' });
      expect(result).toBe('cancelled');
      expect(writeText).not.toHaveBeenCalled();
    } finally { restoreClipboard(); restoreShare(); }
  });
});
