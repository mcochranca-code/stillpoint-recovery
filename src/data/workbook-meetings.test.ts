import { describe, expect, it } from 'vitest';
import { meetingListings, nonDuplicateOnlineWorkbookListings, nonDuplicateRegionalMeetingListings } from './meetings';
import { workbookMeetingListings } from './workbook-meetings';
import { workbookMeetingCoverage } from './workbook-meeting-coverage';
import { buildMeetingMapLocations } from '../domain/meeting-map';

describe('October 26, 2026 offline workbook snapshot', () => {
  it('bundles all 233 source rows with stable IDs and the complete required provenance', () => {
    expect(workbookMeetingListings).toHaveLength(233);
    expect(new Set(workbookMeetingListings.map((meeting) => meeting.id)).size).toBe(233);
    expect(workbookMeetingListings.every((meeting) => meeting.checkedAt === '2026-10-26')).toBe(true);
    expect(workbookMeetingListings.every((meeting) => (
      meeting.sourceTitle && meeting.sourceUrl.startsWith('https://') && meeting.fellowshipLabel
      && meeting.modalityLabel && meeting.formatNotes && meeting.timeZoneNote && meeting.verificationNote
    ))).toBe(true);
    expect(workbookMeetingListings.every((meeting) => meeting.dayName && meeting.time && Number.isInteger(meeting.sortMinutes))).toBe(true);
  });

  it('preserves the workbook county row counts and supports AA, NA, FA and SMART', () => {
    const counts = Object.fromEntries([...new Set(workbookMeetingListings.map((meeting) => meeting.county!))]
      .sort()
      .map((county) => [county, workbookMeetingListings.filter((meeting) => meeting.county === county).length]));
    expect(counts).toEqual({
      'Alameda County': 50,
      'Fresno County': 18,
      'Los Angeles County': 50,
      'Mariposa County': 24,
      'Merced County': 78,
      'Stanislaus County': 3,
      'Tulare County': 10,
    });
    expect(new Set(workbookMeetingListings.map((meeting) => meeting.fellowship))).toEqual(new Set(['AA', 'NA', 'FA', 'SMART']));
  });

  it('keeps the incomplete-enumeration notice and the auditable Census exact-match counts', () => {
    expect(workbookMeetingCoverage.snapshotDate).toBe('2026-10-26');
    expect(workbookMeetingCoverage.rowsImported).toBe(233);
    expect(workbookMeetingCoverage.completenessNote.toLowerCase()).toContain('not an exhaustive');
    expect(workbookMeetingCoverage.geocoding.uniqueAddressQueries).toBe(85);
    expect(workbookMeetingCoverage.geocoding.matchExact).toBe(55);
    expect(workbookMeetingCoverage.geocoding.matchNonExact).toBe(27);
    expect(workbookMeetingCoverage.geocoding.noMatch).toBe(3);
    expect(workbookMeetingCoverage.geocoding.distinctExactLocations).toBe(52);
  });

  it('shows every exact physical/hybrid workbook coordinate and no online-only coordinate', () => {
    const locations = buildMeetingMapLocations(workbookMeetingListings);
    const mapped = locations.flatMap((location) => location.meetings);
    expect(locations).toHaveLength(workbookMeetingCoverage.geocoding.distinctExactLocations);
    expect(mapped.every((meeting) => meeting.mode !== 'online')).toBe(true);
    expect(new Set(mapped.map((meeting) => `${meeting.city}|${meeting.address}`)).size)
      .toBe(workbookMeetingCoverage.geocoding.matchExact);
  });

  it('deduplicates existing regional sample rows only when a workbook row has the same schedule', () => {
    expect(nonDuplicateRegionalMeetingListings).toHaveLength(39);
    expect(meetingListings).toHaveLength(335 + 39 + 233 + nonDuplicateOnlineWorkbookListings.length);
    expect(new Set(meetingListings.map((meeting) => meeting.id)).size).toBe(meetingListings.length);
  });
});
