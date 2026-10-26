import { describe, expect, it } from 'vitest';
import { getNextDailyReminderAt, getNextMeetingReminder, getNextMeetingStart, type MeetingReminderRecord } from './reminders';
import type { MeetingListing } from '../data/meetings';

const mondayMeeting: MeetingListing = {
  id: 'aa-modesto-test', fellowship: 'AA', day: 1, dayName: 'Monday', time: '7:00 PM', sortMinutes: 1140,
  name: 'Sample group', city: 'Modesto', address: 'Local address', mode: 'in-person', formatNotes: '',
  sourceUrl: 'https://example.org/meeting',
};
const savedReminder: MeetingReminderRecord = {
  id: mondayMeeting.id, meetingId: mondayMeeting.id, leadMinutes: 30, createdAt: '2026-10-01T12:00:00.000Z',
};

function localDate(day: number, hour: number, minute = 0) {
  const value = new Date(2026, 9, day, hour, minute, 0, 0);
  return value;
}

describe('local browser reminder timing', () => {
  it('schedules a daily reminder today if its selected local time is still ahead', () => {
    expect(getNextDailyReminderAt(localDate(19, 18), '19:00')?.getTime()).toBe(localDate(19, 19).getTime());
  });

  it('moves a daily reminder to tomorrow after the selected time has passed', () => {
    expect(getNextDailyReminderAt(localDate(19, 19), '19:00')?.getTime()).toBe(localDate(20, 19).getTime());
  });

  it('rejects malformed reminder times', () => {
    expect(getNextDailyReminderAt(localDate(19, 18), '7 PM')).toBeNull();
  });

  it('chooses the next local weekly occurrence and subtracts the selected lead time', () => {
    const now = localDate(19, 18); // Monday in the test calendar.
    const next = getNextMeetingReminder([savedReminder], [mondayMeeting], now);
    expect(next?.meetingStartsAt.getTime()).toBe(localDate(19, 19).getTime());
    expect(next?.notifyAt.getTime()).toBe(localDate(19, 18, 30).getTime());
  });

  it('uses the next week when the same-day meeting has already started', () => {
    const next = getNextMeetingStart(mondayMeeting, localDate(19, 19, 1));
    expect(next?.getTime()).toBe(localDate(26, 19).getTime());
  });

  it('can notify immediately when Stillpoint opens inside the selected lead window', () => {
    const next = getNextMeetingReminder([savedReminder], [mondayMeeting], localDate(19, 18, 45));
    expect(next?.notifyAt.getTime()).toBe(localDate(19, 18, 45).getTime());
    expect(next?.meetingStartsAt.getTime()).toBe(localDate(19, 19).getTime());
  });

  it('does not notify the same weekly occurrence twice and instead selects the next week', () => {
    const occurrence = localDate(19, 19).toISOString();
    const next = getNextMeetingReminder([{ ...savedReminder, lastNotifiedOccurrenceAt: occurrence }], [mondayMeeting], localDate(19, 18));
    expect(next?.meetingStartsAt.getTime()).toBe(localDate(26, 19).getTime());
  });

  it('ignores stale reminders whose meeting is no longer in the bundled snapshot', () => {
    expect(getNextMeetingReminder([{ ...savedReminder, meetingId: 'missing' }], [mondayMeeting], localDate(19, 18))).toBeNull();
  });
});
