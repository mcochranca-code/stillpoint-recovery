import type { MeetingListing } from '../data/meetings';

export type FellowshipFilter = 'all' | MeetingListing['fellowship'];
export type MeetingDayFilter = 'all' | number;
export type MeetingFormatFilter = 'all' | 'in-person' | 'online' | 'zoom';

export interface MeetingFilters {
  fellowship: FellowshipFilter;
  day: MeetingDayFilter;
  city: string;
  query: string;
  format?: MeetingFormatFilter;
  startAfterMinutes?: number | null;
  startBeforeMinutes?: number | null;
}

function matchesTimeRange(minutes: number, after: number | null | undefined, before: number | null | undefined) {
  if (after == null && before == null) return true;
  if (after == null) return minutes <= before!;
  if (before == null) return minutes >= after;
  if (after <= before) return minutes >= after && minutes <= before;
  return minutes >= after || minutes <= before;
}

/** Apply local fellowship/day/city/format/text/time filters and return a stable meeting order. */
export function filterMeetingListings(
  listings: readonly MeetingListing[],
  filters: MeetingFilters,
): MeetingListing[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return listings
    .filter((meeting) => filters.fellowship === 'all' || meeting.fellowship === filters.fellowship)
    .filter((meeting) => filters.day === 'all' || meeting.day === filters.day)
    .filter((meeting) => filters.city === 'all' || meeting.city.toLocaleLowerCase() === filters.city.toLocaleLowerCase())
    .filter((meeting) => {
      const format = filters.format ?? 'all';
      if (format === 'all') return true;
      if (format === 'zoom') return meeting.mode === 'online' && /\bzoom\b/i.test(`${meeting.address} ${meeting.formatNotes}`);
      return meeting.mode === format;
    })
    .filter((meeting) => matchesTimeRange(meeting.sortMinutes, filters.startAfterMinutes, filters.startBeforeMinutes))
    .filter((meeting) => !query || [meeting.name, meeting.city, meeting.address, meeting.formatNotes]
      .some((value) => value.toLocaleLowerCase().includes(query)))
    .slice()
    .sort((a, b) => a.day - b.day || a.sortMinutes - b.sortMinutes || a.fellowship.localeCompare(b.fellowship) || a.name.localeCompare(b.name));
}
