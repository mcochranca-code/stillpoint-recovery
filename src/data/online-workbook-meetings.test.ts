import { describe, expect, it } from 'vitest';
import { onlineWorkbookCoverage } from './online-workbook-coverage';
import { onlineWorkbookMeetingListings } from './online-workbook-meetings';
import { onlineWorkbookDuplicateRowCount, nonDuplicateOnlineWorkbookListings } from './meetings';
import { buildMeetingMapLocations } from '../domain/meeting-map';

describe('October 26, 2026 partial online/Zoom workbook snapshot', () => {
  it('bundles every source row with stable IDs, source links, exact listed times and seven-county coverage', () => {
    expect(onlineWorkbookMeetingListings).toHaveLength(157);
    expect(onlineWorkbookCoverage.rowsImported).toBe(157);
    expect(onlineWorkbookCoverage.snapshotDate).toBe('2026-10-26');
    expect(onlineWorkbookCoverage.countyCoverage).toHaveLength(7);
    expect(new Set(onlineWorkbookMeetingListings.map((meeting) => meeting.id)).size).toBe(157);
    expect(onlineWorkbookMeetingListings.every((meeting) => (
      meeting.checkedAt === '2026-10-26'
      && meeting.dayName
      && meeting.time
      && meeting.timeZoneNote
      && meeting.modalityLabel
      && meeting.verificationNote
      && meeting.scopeNote
      && meeting.sourceTitle
      && new URL(meeting.sourceUrl).hostname
    ))).toBe(true);
    expect(Object.fromEntries([...new Set(onlineWorkbookMeetingListings.map((meeting) => meeting.county!))]
      .sort()
      .map((county) => [county, onlineWorkbookMeetingListings.filter((meeting) => meeting.county === county).length]))).toEqual({
      'Alameda County': 17,
      'Fresno County': 41,
      'Los Angeles County': 16,
      'Mariposa County': 11,
      'Merced County': 32,
      'Stanislaus County': 30,
      'Tulare County': 10,
    });
    expect(new Set(onlineWorkbookMeetingListings.map((meeting) => meeting.fellowship))).toEqual(new Set(['AA', 'NA', 'FA', 'SMART']));
  });

  it('omits direct Zoom join credentials from the public bundle and states the access limitation', () => {
    const bundled = JSON.stringify(onlineWorkbookMeetingListings);
    expect(bundled).not.toMatch(/zoom\.us\/j\//i);
    expect(bundled).not.toMatch(/(?:meeting\s*id|passcode|password)\s*[:=]\s*[\w-]{5,}/i);
    expect(onlineWorkbookMeetingListings.every((meeting) => !/zoom\.us|zoom\.com/i.test(meeting.sourceUrl))).toBe(true);
    expect(onlineWorkbookCoverage.credentialNotice).toMatch(/intentionally not bundled/i);
    expect(onlineWorkbookCoverage.completenessNote).toMatch(/partial/i);
  });

  it('keeps exact repeats from earlier snapshots once and maps only exact physical hybrid venues', () => {
    expect(onlineWorkbookDuplicateRowCount).toBe(
      onlineWorkbookMeetingListings.length - nonDuplicateOnlineWorkbookListings.length,
    );
    expect(onlineWorkbookDuplicateRowCount).toBeGreaterThan(0);
    expect(nonDuplicateOnlineWorkbookListings.length).toBeGreaterThan(0);
    const mapped = buildMeetingMapLocations(onlineWorkbookMeetingListings).flatMap((location) => location.meetings);
    expect(mapped.every((meeting) => meeting.mode === 'hybrid')).toBe(true);
    expect(onlineWorkbookMeetingListings.filter((meeting) => meeting.mode === 'online').length).toBe(119);
    expect(onlineWorkbookMeetingListings.filter((meeting) => meeting.mode === 'hybrid').length).toBe(38);
  });
});
