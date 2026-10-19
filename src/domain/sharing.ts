export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export interface MilestoneShareOptions {
  message: string;
  label: string;
  dateLabel: string;
  includeLabel: boolean;
  includeDate: boolean;
}

export function buildMilestoneShareText(options: MilestoneShareOptions): string {
  const lines = [options.message.trim()].filter(Boolean);
  if (options.includeLabel && options.label.trim()) lines.push(`Milestone: ${options.label.trim()}`);
  if (options.includeDate && options.dateLabel.trim()) lines.push(`Date: ${options.dateLabel.trim()}`);
  return lines.join('\n');
}

export function buildNaSharePayload(url: string): SharePayload {
  return {
    title: 'NA Just for Today — Narcotics Anonymous',
    text: 'Open the current Just for Today daily reading from Narcotics Anonymous World Services. The complete reading remains on its official site.',
    url,
  };
}

export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'unavailable';
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: payload.title, text: payload.text, ...(payload.url ? { url: payload.url } : {}) });
      return 'shared';
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'name' in error && (error as { name?: unknown }).name === 'AbortError') return 'cancelled';
    }
  }

  if (navigator.clipboard?.writeText) {
    const content = [payload.text, payload.url].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(content);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}

export function downloadTextFile(filename: string, content: string): void {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeFilename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
