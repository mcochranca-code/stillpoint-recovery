export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';
export type HtmlCardShareResult = 'shared' | 'cancelled' | 'unavailable';

export interface MilestoneShareOptions {
  message: string;
  label: string;
  dateLabel: string;
  includeLabel: boolean;
  includeDate: boolean;
}

function isAbortError(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'name' in error && (error as { name?: unknown }).name === 'AbortError';
}

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'stillpoint-file';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

/** Build plain-text milestone details using only the fields the user selected. */
export function buildMilestoneShareText(options: MilestoneShareOptions): string {
  const lines = [options.message.trim()].filter(Boolean);
  if (options.includeLabel && options.label.trim()) lines.push(`Milestone: ${options.label.trim()}`);
  if (options.includeDate && options.dateLabel.trim()) lines.push(`Date: ${options.dateLabel.trim()}`);
  return lines.join('\n');
}

/** Build a standalone milestone card with user-provided text escaped for HTML. */
export function buildMilestoneCardHtml(options: MilestoneShareOptions): string {
  const title = options.includeLabel && options.label.trim() ? options.label.trim() : 'A moment worth keeping';
  const message = escapeHtml(options.message.trim() || 'One day at a time, and this step is enough.').replace(/\r?\n/g, '<br>');
  const safeTitle = escapeHtml(title);
  const dateMarkup = options.includeDate && options.dateLabel.trim()
    ? `<p class="date">${escapeHtml(options.dateLabel.trim())}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Stillpoint Recovery — A moment worth keeping</title>
  <style>
    * { box-sizing: border-box; }
    body { min-height: 100svh; margin: 0; padding: 24px; display: grid; place-items: center; background: #e7eee7; color: #193c35; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .card { position: relative; isolation: isolate; display: flex; flex-direction: column; justify-content: space-between; width: min(100%, 620px); min-height: min(84svh, 760px); overflow: hidden; padding: clamp(28px, 7vw, 62px); border: 1px solid rgba(36,84,68,.18); border-radius: 30px; background: linear-gradient(150deg, #fffefa 4%, #f7f4ea 70%, #e7efe6); box-shadow: 0 24px 60px rgba(27,62,52,.15); }
    .sun { position: absolute; z-index: -2; top: -94px; right: -50px; width: 240px; height: 240px; border-radius: 50%; background: rgba(211,163,74,.2); }
    .landscape { position: absolute; z-index: -1; inset: auto 0 0; width: 100%; height: 38%; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .mark { width: 44px; height: 44px; flex: 0 0 auto; }
    .brand-name { display: grid; gap: 2px; }
    .brand-name strong { font: 600 19px Georgia, serif; letter-spacing: -.02em; }
    .brand-name small { color: #5c7068; font-size: 9px; font-weight: 700; letter-spacing: .17em; }
    .content { width: min(100%, 450px); margin: auto 0; padding: 45px 0 64px; }
    .eyebrow { margin: 0 0 14px; color: #52745b; font-size: 10px; font-weight: 750; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 0 0 21px; font: 400 clamp(34px, 7vw, 56px)/1.07 Georgia, serif; letter-spacing: -.04em; overflow-wrap: anywhere; }
    .message { margin: 0; color: #405e53; font: 400 clamp(16px, 2.8vw, 20px)/1.65 Georgia, serif; overflow-wrap: anywhere; }
    .date { display: inline-block; margin: 27px 0 0; padding: 9px 13px; border: 1px solid rgba(36,84,68,.18); border-radius: 999px; background: rgba(255,254,250,.78); color: #486355; font-size: 11px; letter-spacing: .05em; }
    .footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 18px; border-top: 1px solid rgba(36,84,68,.17); color: #486355; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
    @media (max-width: 520px) { body { padding: 12px; } .card { min-height: min(90svh, 720px); border-radius: 23px; padding: 27px; } .content { padding: 32px 0 52px; } .footer { font-size: 8px; } }
  </style>
</head>
<body>
  <article class="card" aria-label="Stillpoint Recovery milestone card">
    <div class="sun" aria-hidden="true"></div>
    <svg class="landscape" viewBox="0 0 620 280" preserveAspectRatio="none" aria-hidden="true"><path d="M0 142 Q122 44 246 122 T484 92 T740 110 V320 H0Z" fill="#c8d9c9"/><path d="M-40 188 Q106 92 226 168 T474 144 T720 172 V320 H-40Z" fill="#8eaf93"/><path d="M-24 226 Q128 156 259 213 T488 192 T720 220 V320 H-24Z" fill="#315f4b"/></svg>
    <div class="brand">
      <svg class="mark" viewBox="0 0 48 48" role="img" aria-label="Stillpoint seedling mark"><circle cx="24" cy="24" r="23" fill="#245444"/><circle cx="24" cy="24" r="18" fill="#f7f4ea"/><path d="M8 28 Q18 20 25 27 T41 25 V41 H8Z" fill="#a8c6a9"/><path d="M9 33 Q20 26 28 32 T41 30 V42 H9Z" fill="#6e9b7c"/><path d="M24 32 C23 26 24 19 24 12" fill="none" stroke="#153d35" stroke-width="2.2" stroke-linecap="round"/><path d="M24 22 C17 21 15 17 15 14 C21 14 24 17 24 22Z" fill="#245444"/><path d="M25 19 C26 14 30 11 35 12 C34 17 30 20 25 19Z" fill="#3c785b"/></svg>
      <span class="brand-name"><strong>Stillpoint</strong><small>RECOVERY</small></span>
    </div>
    <div class="content">
      <p class="eyebrow">One day at a time</p>
      <h1>${safeTitle}</h1>
      <p class="message">${message}</p>
      ${dateMarkup}
    </div>
    <footer class="footer"><span>Your progress is yours.</span><span>Stillpoint Recovery</span></footer>
  </article>
</body>
</html>`;
}

/** Create a share payload that points to the official NA daily-reading page. */
export function buildNaSharePayload(url: string): SharePayload {
  return {
    title: 'NA Just for Today — Narcotics Anonymous',
    text: 'Open the current Just for Today daily reading from Narcotics Anonymous World Services. The complete reading remains on its official site.',
    url,
  };
}

/** Share through the browser when possible, then fall back to clipboard copying. */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'unavailable';
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: payload.title, text: payload.text, ...(payload.url ? { url: payload.url } : {}) });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
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

/** Share a standalone HTML file when the browser supports sharing files. */
export async function shareHtmlCard(
  content: string,
  filename = 'stillpoint-milestone-card.html',
  title = 'Stillpoint Recovery milestone card',
): Promise<HtmlCardShareResult> {
  if (typeof navigator === 'undefined' || typeof File === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return 'unavailable';
  const file = new File([content], safeFilename(filename), { type: 'text/html' });
  try {
    if (!navigator.canShare({ files: [file] })) return 'unavailable';
    await navigator.share({ title, files: [file] });
    return 'shared';
  } catch (error) {
    return isAbortError(error) ? 'cancelled' : 'unavailable';
  }
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeFilename(filename);
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

/** Download text content through a temporary browser object URL. */
export function downloadTextFile(filename: string, content: string): void {
  downloadFile(filename, content, 'text/plain;charset=utf-8');
}

/** Download HTML content through a temporary browser object URL. */
export function downloadHtmlFile(filename: string, content: string): void {
  downloadFile(filename, content, 'text/html;charset=utf-8');
}
