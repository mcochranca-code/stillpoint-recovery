import { describe, expect, it } from 'vitest';
import { meetingListings, nonDuplicateOnlineWorkbookListings } from './meetings';
import { regionalMeetingListings } from './regional-meetings';

describe('regional offline meeting sample', () => {
  it('includes a dated, source-linked sample for the verified county/fellowship pairs', () => {
    expect(regionalMeetingListings.length).toBe(41);
    expect(regionalMeetingListings.every((meeting) => meeting.checkedAt === '2026-10-26')).toBe(true);
    expect(regionalMeetingListings.every((meeting) => /^https?:\/\//.test(meeting.sourceUrl))).toBe(true);

    const count = (county: string, fellowship: string) => regionalMeetingListings.filter(
      (meeting) => meeting.county === county && meeting.fellowship === fellowship,
    ).length;

    expect(count('Fresno County', 'AA')).toBe(8);
    expect(count('Fresno County', 'NA')).toBe(8);
    expect(count('Fresno County', 'FA')).toBe(1);
    expect(count('Mariposa County', 'AA')).toBe(8);
    expect(count('Mariposa County', 'NA')).toBe(0);
    expect(count('Mariposa County', 'FA')).toBe(0);
    expect(count('Merced County', 'AA')).toBe(8);
    expect(count('Merced County', 'NA')).toBe(8);
    expect(count('Merced County', 'FA')).toBe(0);
  });

  it('combines the regional and workbook snapshots with the existing Stanislaus list without duplicate IDs', () => {
    const ids = meetingListings.map((meeting) => meeting.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(meetingListings).toHaveLength(607 + nonDuplicateOnlineWorkbookListings.length);
  });
});
