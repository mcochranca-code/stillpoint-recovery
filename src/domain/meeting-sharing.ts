import type { MeetingListing } from '../data/meetings';

export const MEETING_SHARE_LIMIT = 4;

export interface MeetingShareTheme {
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  surface: string;
  canvas: string;
  border: string;
  sage: string;
  gold: string;
}

const fallbackTheme: MeetingShareTheme = {
  ink: '#193c35',
  muted: '#5c7068',
  primary: '#245444',
  primarySoft: '#e7eee7',
  surface: '#fffefa',
  canvas: '#f7f4ea',
  border: '#d6ded7',
  sage: '#8eaf93',
  gold: '#d3a34a',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function cleanPublicText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/https?:\/\/\S+/gi, '[link omitted]')
    .replace(/\b(?:meeting\s*id|webinar\s*id|passcode|password|pin)\s*(?:(?:[:=#-]\s*)|(?:is\s+))?\S+/gi, '[access detail omitted]')
    .trim();
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || /(?:^|\.)zoom\.(?:us|com)$/i.test(url.hostname)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/passcode|password|meeting.?id|webinar.?id|\bpwd\b|token/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function safeAddress(value: string): string {
  const address = cleanPublicText(value);
  if (!address) return '';
  if (/zoom\.(?:us|com)\/j\/|(?:meeting|webinar)\s*id|passcode|password|\bpwd\b/i.test(address)) {
    return 'Online access details are intentionally omitted; check the official source.';
  }
  return address;
}

export const sanitizeMeetingShareText = cleanPublicText;
export const safeMeetingShareSourceUrl = safeSourceUrl;
export const safeMeetingShareAddress = safeAddress;

function validateTheme(theme: Partial<MeetingShareTheme> = {}): MeetingShareTheme {
  const safeColor = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    const color = value.trim();
    return /^(?:#[\da-f]{3,8}|(?:rgb|hsl|hwb|oklch|oklab|lab|lch|color-mix)\([\w\s,.%/+-]+\)|[a-z]{1,20})$/i.test(color)
      ? color
      : fallback;
  };
  return {
    ink: safeColor(theme.ink, fallbackTheme.ink),
    muted: safeColor(theme.muted, fallbackTheme.muted),
    primary: safeColor(theme.primary, fallbackTheme.primary),
    primarySoft: safeColor(theme.primarySoft, fallbackTheme.primarySoft),
    surface: safeColor(theme.surface, fallbackTheme.surface),
    canvas: safeColor(theme.canvas, fallbackTheme.canvas),
    border: safeColor(theme.border, fallbackTheme.border),
    sage: safeColor(theme.sage, fallbackTheme.sage),
    gold: safeColor(theme.gold, fallbackTheme.gold),
  };
}

function localityFor(meeting: MeetingListing): string {
  return [meeting.city, meeting.county].map(cleanPublicText).filter(Boolean).join(', ');
}

function modeFor(meeting: MeetingListing): string {
  return cleanPublicText(meeting.modalityLabel) || ({
    'in-person': 'In person',
    online: 'Online',
    hybrid: 'Hybrid',
  }[meeting.mode] ?? 'Meeting');
}

function sourceMarkup(meeting: MeetingListing): string {
  const url = safeSourceUrl(meeting.sourceUrl);
  const title = escapeHtml(cleanPublicText(meeting.sourceTitle) || 'Official meeting source');
  return url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${title}</a>`
    : `<span>${title}</span>`;
}

function cardMarkup(meeting: MeetingListing): string {
  const name = escapeHtml(cleanPublicText(meeting.name) || 'Peer-support meeting');
  const fellowship = escapeHtml(cleanPublicText(meeting.fellowshipLabel) || meeting.fellowship);
  const schedule = escapeHtml([cleanPublicText(meeting.dayName), cleanPublicText(meeting.time)].filter(Boolean).join(' · '));
  const mode = escapeHtml(modeFor(meeting));
  const locality = escapeHtml(localityFor(meeting));
  const address = escapeHtml(safeAddress(meeting.address));
  const scope = escapeHtml(cleanPublicText(meeting.scopeNote));
  const timezone = escapeHtml(cleanPublicText(meeting.timeZoneNote));
  const checked = meeting.checkedAt ? escapeHtml(meeting.checkedAt) : '';
  return `<article class="meeting">
    <div class="meeting-top"><span class="badge ${escapeHtml(meeting.fellowship.toLowerCase())}">${fellowship}</span><span class="mode">${mode}</span></div>
    <h2>${name}</h2>
    <p class="schedule">${schedule}</p>
    ${locality ? `<p><strong>Listed community:</strong> ${locality}</p>` : ''}
    ${address ? `<p><strong>Address / access:</strong> ${address}</p>` : ''}
    ${scope ? `<p><strong>Host city / directory scope:</strong> ${scope}</p>` : ''}
    ${timezone ? `<p><strong>Timezone / time note:</strong> ${timezone}</p>` : ''}
    ${checked ? `<p class="checked">Source snapshot checked ${checked}.</p>` : ''}
    <p class="source">Source: ${sourceMarkup(meeting)}</p>
  </article>`;
}

/** Build a standalone, mobile-friendly HTML card using the app's current theme tokens. */
export function buildMeetingShareCardHtml(
  meetings: readonly MeetingListing[],
  theme: Partial<MeetingShareTheme> = {},
): string {
  if (meetings.length < 1 || meetings.length > MEETING_SHARE_LIMIT) {
    throw new RangeError(`Select between 1 and ${MEETING_SHARE_LIMIT} meetings for one share card.`);
  }
  const colors = validateTheme(theme);
  const cards = meetings.map(cardMarkup).join('\n');
  const title = meetings.length === 1 ? 'A meeting to share' : `${meetings.length} meetings to share`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Stillpoint Recovery — ${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px; background: ${colors.canvas}; color: ${colors.ink}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .share-sheet { width: min(100%, 680px); margin: 0 auto; overflow: hidden; border: 1px solid ${colors.border}; border-radius: 24px; background: ${colors.surface}; box-shadow: 0 18px 48px rgba(25,60,53,.12); }
    .brand { display: flex; align-items: center; gap: 12px; padding: 22px 24px 17px; border-bottom: 1px solid ${colors.border}; background: ${colors.canvas}; }
    .mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: ${colors.primary}; color: ${colors.surface}; font: 700 21px Georgia, serif; }
    .brand-name { display: grid; gap: 2px; }
    .brand-name strong { font: 600 17px Georgia, serif; }
    .brand-name small { color: ${colors.muted}; font-size: 9px; font-weight: 750; letter-spacing: .17em; }
    .intro { padding: 20px 24px 6px; }
    .eyebrow { margin: 0 0 7px; color: ${colors.primary}; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font: 400 26px/1.2 Georgia, serif; }
    .list { display: grid; gap: 12px; padding: 16px 18px 20px; }
    .meeting { padding: 17px; border: 1px solid ${colors.border}; border-radius: 16px; background: ${colors.canvas}; }
    .meeting-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: ${colors.muted}; font-size: 11px; }
    .badge { min-width: 34px; padding: 5px 9px; border-radius: 999px; background: ${colors.primarySoft}; color: ${colors.primary}; text-align: center; font-size: 10px; font-weight: 850; }
    .badge.na, .badge.smart { background: color-mix(in srgb, ${colors.sage} 20%, transparent); color: ${colors.primary}; }
    .badge.fa { background: color-mix(in srgb, ${colors.gold} 24%, transparent); color: ${colors.ink}; }
    .mode { text-align: right; }
    .meeting h2 { margin: 11px 0 7px; font: 600 19px/1.32 Georgia, serif; overflow-wrap: anywhere; }
    .meeting p { margin: 8px 0 0; color: ${colors.muted}; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
    .meeting .schedule { color: ${colors.ink}; font-size: 14px; font-weight: 750; }
    .meeting p strong { color: ${colors.ink}; }
    .meeting .checked { font-size: 10px; }
    .meeting .source a { color: ${colors.primary}; text-underline-offset: 2px; }
    .note { margin: 0; padding: 15px 22px 20px; border-top: 1px solid ${colors.border}; color: ${colors.muted}; font-size: 10px; line-height: 1.5; }
    .note strong { color: ${colors.ink}; }
    @media (max-width: 420px) { body { padding: 9px; } .brand { padding: 17px; } .intro { padding: 17px 17px 5px; } .list { padding: 12px; } .meeting { padding: 14px; } }
  </style>
</head>
<body>
  <main class="share-sheet">
    <header class="brand"><span class="mark" aria-hidden="true">S</span><span class="brand-name"><strong>Stillpoint</strong><small>RECOVERY</small></span></header>
    <section class="intro"><p class="eyebrow">Local peer support</p><h1>${escapeHtml(title)}</h1></section>
    <section class="list" aria-label="Selected meeting details">${cards}</section>
    <footer class="note"><strong>Stillpoint Recovery</strong> · This is a dated, partial schedule snapshot. Confirm current time, venue and access with each official source before attending. Join links and credentials are not included.</footer>
  </main>
</body>
</html>`;
}

/** Include only selected public meeting fields in a plain-text share payload. */
export function buildMeetingShareText(meetings: readonly MeetingListing[]): string {
  if (meetings.length < 1 || meetings.length > MEETING_SHARE_LIMIT) {
    throw new RangeError(`Select between 1 and ${MEETING_SHARE_LIMIT} meetings for one share card.`);
  }
  const cards = meetings.map((meeting) => {
    const location = [localityFor(meeting), safeAddress(meeting.address)].filter(Boolean).join(' · ');
    const details = [
      `${cleanPublicText(meeting.name) || 'Peer-support meeting'} — ${cleanPublicText(meeting.fellowshipLabel) || meeting.fellowship}`,
      [cleanPublicText(meeting.dayName), cleanPublicText(meeting.time), cleanPublicText(meeting.timeZoneNote)].filter(Boolean).join(' · '),
      modeFor(meeting),
      location,
      cleanPublicText(meeting.scopeNote),
      meeting.sourceTitle ? `Source: ${cleanPublicText(meeting.sourceTitle)}` : '',
      safeSourceUrl(meeting.sourceUrl) ?? '',
    ].filter(Boolean);
    return details.join('\n');
  });
  return ['Stillpoint Recovery — meeting details', ...cards, 'A partial local snapshot; confirm the current schedule with the official source. Join links and credentials are not included.'].join('\n\n');
}
