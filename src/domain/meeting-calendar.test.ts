import { describe, expect, it } from 'vitest';
import { meetingListings } from '../data/meetings';
import {
  buildGoogleCalendarUrl,
  buildMeetingCalendarIcs,
  meetingCalendarFilename,
  nextMeetingOccurrence,
} from './meeting-calendar';

describe('meeting calendar invites', () => {
  const meeting = meetingListings.find((item) => item.name === 'New Beginnings') ?? meetingListings[0]!;
  const saturdayBefore = new Date(2026, 10, 7, 10, 0, 0);

  it('chooses the next weekly occurrence and moves past today after its start time', () => {
    const next = nextMeetingOccurrence(meeting, saturdayBefore);
    expect(next.getDay()).toBe(meeting.day);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);

    const afterOccurrence = new Date(2026, 10, 8, 8, 0, 0);
    const following = nextMeetingOccurrence(meeting, afterOccurrence);
    expect(following.getDate()).toBe(15);
  });

  it('builds a recurring Google Calendar template without exposing private data', () => {
    const url = new URL(buildGoogleCalendarUrl(meeting, saturdayBefore));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toContain(meeting.name);
    expect(url.searchParams.get('recur')).toContain('FREQ=WEEKLY');
    expect(url.searchParams.get('details')).toContain('Official source:');
    expect(url.searchParams.get('details')).not.toMatch(/passcode|meeting id/i);
  });

  it('builds a multi-event iCalendar file with weekly recurrence and safe public details', () => {
    const ics = buildMeetingCalendarIcs([meeting], saturdayBefore);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=');
    expect(ics).toContain('TZID=America/Los_Angeles');
    expect(ics).toContain(`SUMMARY:${meeting.fellowship} — ${meeting.name}`);
    expect(ics).not.toMatch(/passcode|meeting id/i);
    expect(ics).toContain('END:VCALENDAR');
    expect(meetingCalendarFilename([meeting])).toMatch(/^stillpoint-.*\.ics$/);
  });
});
