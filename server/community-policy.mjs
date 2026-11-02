import { createHash, randomUUID } from 'node:crypto';

export const MAX_COMMENT_CODE_POINTS = 120;
export const COMMENT_RETENTION_DAYS = 90;
export const MAX_COMMENTS_PER_BROWSER_PER_DAY = 3;
export const MAX_REPORTS_PER_BROWSER_PER_DAY = 10;
export const REPORT_HIDE_THRESHOLD = 3;

const readingKeyPattern = /^stillpoint:(\d{4}-\d{2}-\d{2}):([a-z0-9-]{1,64})$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const urlPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co)\b)/iu;
const emailPattern = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/iu;
const phonePattern = /(?:^|\D)\+?\d[\d\s().-]{7,}\d(?:$|\D)/u;
const handlePattern = /(?:^|\s)@[a-z0-9_]{2,}/iu;
const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const directHarmPatterns = [
  /\b(?:kill yourself|go kill yourself|go die|you should die|hope you die)\b/iu,
  /\byou(?:'re| are)\s+(?:a\s+)?(?:loser|idiot|stupid|worthless|pathetic)\b/iu,
  /\bi(?:'m| am)\s+going\s+to\s+(?:hurt|kill|attack)\s+you\b/iu,
];

export function isValidReadingKey(value) {
  if (typeof value !== 'string') return false;
  const match = readingKeyPattern.exec(value);
  if (!match) return false;
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === match[1];
}

export function isValidRandomToken(value) {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function validateCommentText(value) {
  if (typeof value !== 'string') return { ok: false, reason: 'Write a short note before posting.' };
  const text = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(text).length;
  if (length < 1) return { ok: false, reason: 'Write a short note before posting.' };
  if (length > MAX_COMMENT_CODE_POINTS) return { ok: false, reason: 'Keep your note to 120 characters or fewer.' };
  if (controlPattern.test(text)) return { ok: false, reason: 'Please remove control characters from your note.' };
  if (urlPattern.test(text) || emailPattern.test(text) || phonePattern.test(text) || handlePattern.test(text)) {
    return { ok: false, reason: 'Links, contact details, and social handles are not allowed in community notes.' };
  }
  if (directHarmPatterns.some((pattern) => pattern.test(text))) {
    return { ok: false, reason: 'This wording does not meet the community guidelines. Try a supportive, non-targeted note.' };
  }
  return { ok: true, text };
}

export function hashRandomToken(token) {
  if (!isValidRandomToken(token)) throw new TypeError('The anonymous browser token is invalid.');
  return createHash('sha256').update(token.toLowerCase(), 'utf8').digest('hex');
}

export function createId() {
  return randomUUID();
}
