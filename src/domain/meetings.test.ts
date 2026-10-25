import { describe, expect, it } from 'vitest';
import type { MeetingListing } from '../data/meetings';
import { filterMeetingListings } from './meetings';

const sample: MeetingListing[] = [
  { id: 'na-tue', fellowship: 'NA', day: 2, dayName: 'Tuesday', time: '7:00 PM', sortMinutes: 1140, name: 'Open Path', city: 'Turlock', address: '10 Main St', mode: 'in-person', formatNotes: 'Open topic', sourceUrl: 'https://example.org/na' },
  { id: 'aa-mon-late', fellowship: 'AA', day: 1, dayName: 'Monday', time: '6:00 PM', sortMinutes: 1080, name: 'Northside Fellowship', city: 'Modesto', address: '20 Oak Ave', mode: 'in-person', formatNotes: 'Open', sourceUrl: 'https://example.org/aa' },
  { id: 'aa-mon-early', fellowship: 'AA', day: 1, dayName: 'Monday', time: '9:00 AM', sortMinutes: 540, name: 'Early Steps', city: 'Modesto', address: '30 Pine Ave', mode: 'in-person', formatNotes: 'Book study', sourceUrl: 'https://example.org/aa' },
];

const base = { fellowship: 'all' as const, day: 'all' as const, city: 'all', query: '' };

describe('filterMeetingListings', () => {
  it('filters by fellowship, weekday and city', () => {
    expect(filterMeetingListings(sample, { ...base, fellowship: 'AA', day: 1, city: 'modesto' }).map((item) => item.id))
      .toEqual(['aa-mon-early', 'aa-mon-late']);
  });

  it('searches names, addresses and format notes and sorts by weekday and local time', () => {
    expect(filterMeetingListings(sample, { ...base, query: 'pine' }).map((item) => item.id)).toEqual(['aa-mon-early']);
    expect(filterMeetingListings(sample, base).map((item) => item.id)).toEqual(['aa-mon-early', 'aa-mon-late', 'na-tue']);
    expect(filterMeetingListings(sample, { ...base, query: 'open topic' }).map((item) => item.id)).toEqual(['na-tue']);
  });

  it('filters and searches Zoom only when the source format note explicitly names it', () => {
    const zoomListing: MeetingListing = { id: 'na-zoom', fellowship: 'NA', day: 0, dayName: 'Sunday', time: '8:00 AM', sortMinutes: 480, name: 'Virtual Sunrise', city: 'Modesto', address: 'Online meeting — Zoom meeting ID', mode: 'online', formatNotes: '1hr Click Here To Join', sourceUrl: 'https://example.org/na' };
    const genericOnline: MeetingListing = { id: 'na-online', fellowship: 'NA', day: 0, dayName: 'Sunday', time: '9:00 AM', sortMinutes: 540, name: 'Virtual Hope', city: 'Modesto', address: 'Online', mode: 'online', formatNotes: 'Online meeting', sourceUrl: 'https://example.org/na' };
    const listings = [...sample, zoomListing, genericOnline];

    expect(filterMeetingListings(listings, { ...base, format: 'zoom' }).map((item) => item.id)).toEqual(['na-zoom']);
    expect(filterMeetingListings(listings, { ...base, format: 'online' }).map((item) => item.id)).toEqual(['na-zoom', 'na-online']);
    expect(filterMeetingListings(listings, { ...base, query: 'Zoom' }).map((item) => item.id)).toEqual(['na-zoom']);
  });

  it('supports the Food Addicts fellowship value when a vetted listing is provided', () => {
    const foodAddicts: MeetingListing = { id: 'fa-sample', fellowship: 'FA', day: 4, dayName: 'Thursday', time: '6:00 PM', sortMinutes: 1080, name: 'FA sample', city: 'Modesto', address: '40 Elm St', mode: 'in-person', formatNotes: '', sourceUrl: 'https://www.foodaddicts.org/find-a-meeting' };
    expect(filterMeetingListings([...sample, foodAddicts], { ...base, fellowship: 'FA' }).map((item) => item.id)).toEqual(['fa-sample']);
  });

  it('applies inclusive local time boundaries', () => {
    expect(filterMeetingListings(sample, { ...base, startAfterMinutes: 1080, startBeforeMinutes: 1080 }).map((item) => item.id))
      .toEqual(['aa-mon-late']);
    expect(filterMeetingListings(sample, { ...base, startAfterMinutes: 600, startBeforeMinutes: 1100 }).map((item) => item.id))
      .toEqual(['aa-mon-late']);
  });

  it('supports a range that crosses midnight', () => {
    const afterMidnight: MeetingListing = { id: 'na-night', fellowship: 'NA', day: 5, dayName: 'Friday', time: '1:00 AM', sortMinutes: 60, name: 'Night group', city: 'Modesto', address: 'Online', mode: 'online', formatNotes: '', sourceUrl: 'https://example.org/na' };
    expect(filterMeetingListings([afterMidnight, ...sample], { ...base, startAfterMinutes: 1320, startBeforeMinutes: 180 }).map((item) => item.id))
      .toEqual(['na-night']);
  });

  it('returns an empty list for a query with no matches', () => {
    expect(filterMeetingListings(sample, { ...base, query: 'not a meeting' })).toEqual([]);
  });
});
