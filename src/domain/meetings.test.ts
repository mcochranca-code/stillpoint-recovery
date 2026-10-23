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

  it('returns an empty list for a query with no matches', () => {
    expect(filterMeetingListings(sample, { ...base, query: 'not a meeting' })).toEqual([]);
  });
});
