import { describe, expect, it, vi } from 'vitest';
import { buildMilestoneCardHtml, buildMilestoneShareText, buildNaSharePayload, shareHtmlCard, shareOrCopy } from './sharing';

function setNavigatorValue(key: 'share' | 'canShare' | 'clipboard', value: unknown): () => void {
  const previous = Object.getOwnPropertyDescriptor(navigator, key);
  Object.defineProperty(navigator, key, { configurable: true, value });
  return () => {
    if (previous) Object.defineProperty(navigator, key, previous);
    else Reflect.deleteProperty(navigator, key);
  };
}

const baseCardOptions = {
  message: 'A moment worth recognizing.',
  label: '90 days of recovery',
  dateLabel: 'October 18, 2026',
  includeLabel: false,
  includeDate: false,
};

describe('privacy-limited share content', () => {
  it('keeps the milestone message neutral and omits title/date by default', () => {
    const text = buildMilestoneShareText({ ...baseCardOptions, message: 'A moment worth recognizing.' });
    expect(text).toBe('A moment worth recognizing.');
    expect(text).not.toContain('90 days');
    expect(text).not.toContain('October 18');
  });

  it('adds only the milestone fields selected in the preview', () => {
    expect(buildMilestoneShareText({ ...baseCardOptions, includeLabel: true })).toBe('A moment worth recognizing.\nMilestone: 90 days of recovery');
  });

  it('builds a standalone HTML card that omits milestone name and date by default', () => {
    const html = buildMilestoneCardHtml(baseCardOptions);
    expect(html).toContain('A moment worth keeping');
    expect(html).toContain('A moment worth recognizing.');
    expect(html).not.toContain('90 days of recovery');
    expect(html).not.toContain('October 18, 2026');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain('<style>');
    expect(html).toContain('<svg');
  });

  it('adds only the selected name/date and escapes user-controlled HTML', () => {
    const html = buildMilestoneCardHtml({
      ...baseCardOptions,
      message: '<script>alert("private")</script> & one step',
      label: '<img src=x onerror=alert(1)>',
      includeLabel: true,
      includeDate: true,
    });
    expect(html).toContain('&lt;script&gt;alert(&quot;private&quot;)&lt;/script&gt; &amp; one step');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('October 18, 2026');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
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

  it('shares the HTML card as a file only when the browser reports file support', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const restoreShare = setNavigatorValue('share', nativeShare);
    const restoreCanShare = setNavigatorValue('canShare', canShare);
    try {
      const result = await shareHtmlCard('<!doctype html><p>Only previewed content</p>');
      expect(result).toBe('shared');
      expect(canShare).toHaveBeenCalledOnce();
      const firstCall = nativeShare.mock.calls[0];
      if (!firstCall) throw new Error('Expected the native share call.');
      const data = firstCall[0] as ShareData;
      const file = data.files?.[0];
      if (!file) throw new Error('Expected the HTML card file to be shared.');
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('stillpoint-milestone-card.html');
      const fileText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      expect(fileText).toBe('<!doctype html><p>Only previewed content</p>');
    } finally { restoreCanShare(); restoreShare(); }
  });

  it('does not copy or fall back to sharing when native card sharing is canceled', async () => {
    const nativeShare = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    const canShare = vi.fn().mockReturnValue(true);
    const restoreShare = setNavigatorValue('share', nativeShare);
    const restoreCanShare = setNavigatorValue('canShare', canShare);
    try {
      expect(await shareHtmlCard('<!doctype html></html>')).toBe('cancelled');
      expect(nativeShare).toHaveBeenCalledOnce();
    } finally { restoreCanShare(); restoreShare(); }
  });

  it('reports file sharing unavailable so the explicit caller can offer a local download', async () => {
    const restoreShare = setNavigatorValue('share', undefined);
    const restoreCanShare = setNavigatorValue('canShare', undefined);
    try {
      expect(await shareHtmlCard('<!doctype html></html>')).toBe('unavailable');
    } finally { restoreCanShare(); restoreShare(); }
  });

  it('treats native text-share cancellation as canceled, without copying instead', async () => {
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
