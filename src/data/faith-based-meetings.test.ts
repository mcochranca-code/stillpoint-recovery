import { describe, expect, it } from 'vitest';
import { buildMeetingMapLocations } from '../domain/meeting-map';
import { buildMeetingShareCardHtml, buildMeetingShareText } from '../domain/meeting-sharing';
import { filterMeetingListings } from '../domain/meetings';
import { faithBasedMeetingListings } from './faith-based-meetings';

describe('user-provided Faith-Based meeting snapshot', () => {
  it('imports only fixed-schedule rows and never carries over the demo verification claim', () => {
    expect(faithBasedMeetingListings).toHaveLength(39);
    expect(faithBasedMeetingListings.every((meeting) => meeting.fellowship === 'FAITH')).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => meeting.day >= 0 && meeting.day <= 6)).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => /\d{1,2}:\d{2} (AM|PM)/.test(meeting.time))).toBe(true);
    expect(new Set(faithBasedMeetingListings.map((meeting) => meeting.id)).size).toBe(39);
    expect(faithBasedMeetingListings.every((meeting) => meeting.checkedAt === undefined)).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => meeting.sourceUrl === '')).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => meeting.sourceTitle?.includes('User-provided Faith-Based Recovery Directory demo'))).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => meeting.verificationNote?.includes('not independently rechecked'))).toBe(true);
    expect(faithBasedMeetingListings.every((meeting) => meeting.mapEligible === false)).toBe(true);
    expect(faithBasedMeetingListings.some((meeting) => meeting.name === 'Celebrate Recovery Official Online Zoom')).toBe(false);
  });

  it('filters by the Faith-Based category and retains the source’s broad region label', () => {
    const centralValley = filterMeetingListings(faithBasedMeetingListings, {
      fellowship: 'FAITH', day: 'all', county: 'Central Valley', city: 'all', query: '', format: 'all',
    });
    expect(centralValley).toHaveLength(32);
    expect(centralValley.some((meeting) => meeting.name === 'The Bridge' && meeting.city === 'Fresno')).toBe(true);
  });

  it('does not create map pins for any imported Faith-Based row', () => {
    expect(buildMeetingMapLocations(faithBasedMeetingListings)).toEqual([]);
  });

  it('keeps unverified provenance visible in share formats without fabricating a source link', () => {
    const meeting = faithBasedMeetingListings[0];
    if (!meeting) throw new Error('Expected at least one imported Faith-Based meeting.');
    const card = buildMeetingShareCardHtml([meeting]);
    const text = buildMeetingShareText([meeting]);

    expect(card).toContain('UNVERIFIED — User-provided Faith-Based Recovery Directory demo');
    expect(card).not.toContain('<a href=');
    expect(text).toContain('Source: UNVERIFIED — User-provided Faith-Based Recovery Directory demo');
    expect(text).not.toContain('https://');
  });
});
