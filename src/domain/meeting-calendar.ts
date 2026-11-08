import type { MeetingListing } from '../data/meetings';
import { downloadTextFile } from './sharing';

export const MEETING_CALENDAR_TIME_ZONE = 'America/Los_Angeles';
const MEETING_DURATION_MINUTES = 90;
const weekdayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

function parseMeetingTime(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Resolve the next local occurrence of a weekly meeting for a calendar invite. */
export function nextMeetingOccurrence(meeting: MeetingListing, now = new Date()): Date {
  const time = parseMeetingTime(meeting.time) ?? { hours: 12, minutes: 0 };
  const occurrence = new Date(now);
  occurrence.setHours(time.hours, time.minutes, 0, 0);
  let daysAhead = (meeting.day - occurrence.getDay() + 7) % 7;
  if (daysAhead === 0 && occurrence.getTime() <= now.getTime()) daysAhead = 7;
  occurrence.setDate(occurrence.getDate() + daysAhead);
  return occurrence;
}

function eventTitle(meeting: MeetingListing): string {
  return `${meeting.fellowshipLabel ?? meeting.fellowship} — ${meeting.name}`;
}

function eventLocation(meeting: MeetingListing): string {
  if (meeting.mode === 'online') return 'Online meeting — check the official listing for access details';
  return [meeting.address, meeting.city, meeting.county].filter(Boolean).join(', ');
}

function eventDescription(meeting: MeetingListing): string {
  const lines = [
    'Stillpoint Recovery meeting invite.',
    `${meeting.dayName} at ${meeting.time}${meeting.timeZoneNote ? ` · ${meeting.timeZoneNote}` : ''}.`,
    meeting.mode === 'online' ? 'Online access details are intentionally omitted; check the official source before attending.' : 'Confirm the current time, venue and access with the official source before attending.',
    meeting.sourceUrl ? `Official source: ${meeting.sourceUrl}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function googleDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function icsUtcDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

function sourceUrl(value: string): string {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function buildGoogleCalendarUrl(meeting: MeetingListing, now = new Date()): string {
  const start = nextMeetingOccurrence(meeting, now);
  const end = new Date(start.getTime() + MEETING_DURATION_MINUTES * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(meeting),
    dates: `${googleDate(start)}/${googleDate(end)}`,
    details: eventDescription(meeting),
    location: eventLocation(meeting),
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${weekdayCodes[meeting.day]}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildMeetingCalendarIcs(meetings: readonly MeetingListing[], now = new Date()): string {
  const events = meetings.map((meeting) => {
    const start = nextMeetingOccurrence(meeting, now);
    const end = new Date(start.getTime() + MEETING_DURATION_MINUTES * 60_000);
    const uid = `${meeting.id}@stillpoint-recovery`;
    const url = sourceUrl(meeting.sourceUrl);
    return [
      'BEGIN:VEVENT',
      `UID:${icsText(uid)}`,
      `DTSTAMP:${icsUtcDate(new Date())}`,
      `DTSTART;TZID=${MEETING_CALENDAR_TIME_ZONE}:${icsDate(start)}`,
      `DTEND;TZID=${MEETING_CALENDAR_TIME_ZONE}:${icsDate(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${weekdayCodes[meeting.day]}`,
      `SUMMARY:${icsText(eventTitle(meeting))}`,
      `LOCATION:${icsText(eventLocation(meeting))}`,
      `DESCRIPTION:${icsText(eventDescription(meeting))}`,
      ...(url ? [`URL:${icsText(url)}`] : []),
      'END:VEVENT',
    ].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stillpoint Recovery//Meeting Invites//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${MEETING_CALENDAR_TIME_ZONE}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function meetingCalendarFilename(meetings: readonly MeetingListing[]): string {
  const suffix = meetings.length === 1 ? meetings[0]?.name ?? 'meeting' : `${meetings.length}-meetings`;
  return `stillpoint-${suffix.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'meeting'}.ics`;
}

export function downloadMeetingCalendarFile(meetings: readonly MeetingListing[], now = new Date()): void {
  downloadTextFile(meetingCalendarFilename(meetings), buildMeetingCalendarIcs(meetings, now));
}

export type CalendarShareResult = 'shared' | 'cancelled' | 'unavailable';

/** Share an .ics file through the device share sheet when supported. */
export async function shareMeetingCalendarFile(meetings: readonly MeetingListing[], now = new Date()): Promise<CalendarShareResult> {
  if (typeof navigator === 'undefined' || typeof File === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return 'unavailable';
  const file = new File([buildMeetingCalendarIcs(meetings, now)], meetingCalendarFilename(meetings), { type: 'text/calendar;charset=utf-8' });
  try {
    if (!navigator.canShare({ files: [file] })) return 'unavailable';
    await navigator.share({ title: 'Stillpoint Recovery meeting invite', files: [file] });
    return 'shared';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'unavailable';
  }
}
