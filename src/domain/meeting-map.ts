import type { MeetingListing } from '../data/meetings';
import { meetingVenueCoordinateFor } from '../data/meeting-coordinates';

export interface MeetingMapLocation {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  meetings: MeetingListing[];
}

/** Return only exact, precomputed in-person locations and group shared coordinates. */
export function buildMeetingMapLocations(listings: readonly MeetingListing[]): MeetingMapLocation[] {
  const grouped = new Map<string, MeetingMapLocation>();

  for (const meeting of listings) {
    if (meeting.mode !== 'in-person') continue;
    const coordinate = meetingVenueCoordinateFor(meeting);
    if (!coordinate) continue;

    const id = `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
    const existing = grouped.get(id);
    if (existing) {
      existing.meetings.push(meeting);
      continue;
    }

    grouped.set(id, {
      id,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      city: coordinate.sourceCity,
      address: coordinate.matchedAddress.split(',')[0]?.trim() ?? coordinate.matchedAddress,
      meetings: [meeting],
    });
  }

  return [...grouped.values()]
    .map((location) => ({
      ...location,
      meetings: [...location.meetings].sort((a, b) => a.day - b.day || a.sortMinutes - b.sortMinutes || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.city.localeCompare(b.city) || a.address.localeCompare(b.address));
}
