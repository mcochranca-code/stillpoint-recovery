import type { MeetingListing } from '../data/meetings';

export type FellowshipFilter = 'all' | MeetingListing['fellowship'];
export type MeetingDayFilter = 'all' | number;

export interface MeetingFilters {
  fellowship: FellowshipFilter;
  day: MeetingDayFilter;
  city: string;
  query: string;
}

/** Apply local fellowship/day/city/text filters and return a stable meeting order. */
export function filterMeetingListings(
  listings: readonly MeetingListing[],
  filters: MeetingFilters,
): MeetingListing[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return listings
    .filter((meeting) => filters.fellowship === 'all' || meeting.fellowship === filters.fellowship)
    .filter((meeting) => filters.day === 'all' || meeting.day === filters.day)
    .filter((meeting) => filters.city === 'all' || meeting.city.toLocaleLowerCase() === filters.city.toLocaleLowerCase())
    .filter((meeting) => !query || [meeting.name, meeting.city, meeting.address, meeting.formatNotes]
      .some((value) => value.toLocaleLowerCase().includes(query)))
    .slice()
    .sort((a, b) => a.day - b.day || a.sortMinutes - b.sortMinutes || a.fellowship.localeCompare(b.fellowship) || a.name.localeCompare(b.name));
}
