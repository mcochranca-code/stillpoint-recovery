import { describe, expect, it } from 'vitest';
import { hashRandomToken, isValidReadingKey, isValidRandomToken, validateCommentText } from './community-policy.mjs';

const token = 'ea817b3a-1f42-49a3-8c61-a769ff1f56bc';

describe('community comment policy', () => {
  it('accepts date-scoped original readings and only the exact independent notes-board key', () => {
    expect(isValidReadingKey('stillpoint:2026-11-01:reflection-001')).toBe(true);
    expect(isValidReadingKey('stillpoint:community-notes')).toBe(true);
    expect(isValidReadingKey('stillpoint:community-notes:reflection-001')).toBe(false);
    expect(isValidReadingKey('na:2026-11-01:jft')).toBe(false);
    expect(isValidReadingKey('stillpoint:2026-02-31:reflection-001')).toBe(false);
    expect(isValidReadingKey('stillpoint:2026-11-01:../../settings')).toBe(false);
  });

  it('counts Unicode code points rather than UTF-16 code units', () => {
    expect(validateCommentText('🌱'.repeat(120))).toMatchObject({ ok: true });
    expect(validateCommentText('🌱'.repeat(121))).toMatchObject({ ok: false });
  });

  it('normalizes surrounding whitespace and rejects empty input', () => {
    expect(validateCommentText('  A kind thought.  ')).toEqual({ ok: true, text: 'A kind thought.' });
    expect(validateCommentText(' \n ')).toMatchObject({ ok: false });
  });

  it('rejects contact details, URLs and social handles', () => {
    for (const text of ['Visit https://example.com', 'Write me at name@example.com', 'Call me at 209-555-0101', 'Ask @someone']) {
      expect(validateCommentText(text)).toMatchObject({ ok: false });
    }
  });

  it('blocks a few direct targeted-harm phrases while allowing ordinary personal reflection', () => {
    expect(validateCommentText('You are worthless')).toMatchObject({ ok: false });
    expect(validateCommentText('I felt worthless yesterday, but I reached out')).toMatchObject({ ok: true });
  });

  it('accepts and hashes only random UUID tokens without preserving the raw token', () => {
    expect(isValidRandomToken(token)).toBe(true);
    expect(isValidRandomToken('my-account-name')).toBe(false);
    const digest = hashRandomToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(token);
  });
});
