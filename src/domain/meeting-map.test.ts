import { describe, expect, it } from 'vitest';
import { stanislausMeetingListings } from '../data/meetings';
import { regionalMeetingListings } from '../data/regional-meetings';
import { meetingVenueCoordinateFor } from '../data/meeting-coordinates';
import { buildMeetingMapLocations } from './meeting-map';

describe('buildMeetingMapLocations', () => {
  it('includes only the 300 in-person records with exact precomputed address matches', () => {
    const locations = buildMeetingMapLocations(stanislausMeetingListings);
    const mapped = locations.flatMap((location) => location.meetings);
    const mappedIds = new Set(mapped.map((meeting) => meeting.id));

    expect(locations).toHaveLength(40);
    expect(mapped).toHaveLength(300);
    expect(mappedIds.size).toBe(300);
    expect(mapped.every((meeting) => meeting.mode === 'in-person')).toBe(true);
    expect(stanislausMeetingListings.filter((meeting) => meeting.mode === 'online')).toHaveLength(25);
    expect(stanislausMeetingListings.some((meeting) => meeting.mode === 'online' && mappedIds.has(meeting.id))).toBe(false);
  });

  it('groups listings at the same Census coordinate and orders meeting details', () => {
    const location = buildMeetingMapLocations(stanislausMeetingListings)
      .find((candidate) => candidate.address.startsWith('1660 HERNDON RD'));

    expect(location).toBeDefined();
    if (!location) throw new Error('Expected the exact Ceres address to have a map location.');
    expect(location.meetings.length).toBeGreaterThan(1);
    expect(location.meetings).toEqual([...location.meetings].sort((a, b) => a.day - b.day || a.sortMinutes - b.sortMinutes || a.name.localeCompare(b.name)));
  });

  it('maps verified regional AA, NA and FA venues across the three requested counties only when exact', () => {
    const locations = buildMeetingMapLocations(regionalMeetingListings);
    const mapped = locations.flatMap((location) => location.meetings);
    const mappedIds = new Set(mapped.map((meeting) => meeting.id));

    expect(locations).toHaveLength(23);
    expect(mapped).toHaveLength(28);
    expect(new Set(mapped.map((meeting) => meeting.county))).toEqual(new Set(['Fresno County', 'Mariposa County', 'Merced County']));
    expect(mappedIds.has('aa-mariposa-how-it-works-tue')).toBe(true);
    expect(mappedIds.has('fa-fresno-cv-church-christ')).toBe(true);
    expect(mappedIds.has('aa-mariposa-open-hall-mon')).toBe(false);
    expect(mappedIds.has('aa-mariposa-yosemite-chapel')).toBe(false);
  });

  it('normalizes case and repeated whitespace when looking up a verified source address', () => {
    expect(meetingVenueCoordinateFor({
      address: '  1064 WOODLAND AVE, MODESTO, CA 95351  ',
      city: 'modesto',
    })).toBeDefined();
  });

  it('omits online, non-exact, tied and unmatched addresses', () => {
    const excluded = stanislausMeetingListings.filter((meeting) => (
      meeting.mode === 'online'
      || meeting.address.includes('823 E. Orangeburg Rd')
      || meeting.address.includes('3957 Gratton Rd')
      || meeting.address.includes('5101 Yosemite Blvd')
      || meeting.address.includes('12600 Shurl St')
    ));
    const mappedIds = new Set(buildMeetingMapLocations(excluded).flatMap((location) => location.meetings.map((meeting) => meeting.id)));

    expect(excluded.length).toBeGreaterThan(0);
    expect(mappedIds.size).toBe(0);
  });
});
