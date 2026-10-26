import type { MeetingListing } from '../data/meetings';
import type { MeetingReminderRecord } from './types';
export type { MeetingReminderRecord } from './types';

export interface ScheduledMeetingReminder {
  reminder: MeetingReminderRecord;
  meeting: MeetingListing;
  meetingStartsAt: Date;
  notifyAt: Date;
}

export function getNextDailyReminderAt(now: Date, time: string): Date | null {
  const match = /^(0\d|1\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const next = new Date(now);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function parseMeetingTime(value: string): { hour: number; minute: number } | null {
  const match = /^(1[0-2]|[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const twelveHour = Number(match[1]) % 12;
  return { hour: twelveHour + (match[3]?.toUpperCase() === 'PM' ? 12 : 0), minute: Number(match[2]) };
}

export function getNextMeetingStart(meeting: MeetingListing, after: Date): Date | null {
  const time = parseMeetingTime(meeting.time);
  if (!time || !Number.isInteger(meeting.day) || meeting.day < 0 || meeting.day > 6) return null;
  const occurrence = new Date(after);
  occurrence.setHours(0, 0, 0, 0);
  const daysAhead = (meeting.day - occurrence.getDay() + 7) % 7;
  occurrence.setDate(occurrence.getDate() + daysAhead);
  occurrence.setHours(time.hour, time.minute, 0, 0);
  if (occurrence.getTime() <= after.getTime()) occurrence.setDate(occurrence.getDate() + 7);
  return occurrence;
}

export function getNextMeetingReminder(
  reminders: readonly MeetingReminderRecord[],
  listings: readonly MeetingListing[],
  now: Date,
): ScheduledMeetingReminder | null {
  const listingById = new Map(listings.map((meeting) => [meeting.id, meeting]));
  let soonest: ScheduledMeetingReminder | null = null;

  for (const reminder of reminders) {
    const meeting = listingById.get(reminder.meetingId);
    if (!meeting) continue;
    let meetingStartsAt = getNextMeetingStart(meeting, now);
    if (!meetingStartsAt) continue;
    if (reminder.lastNotifiedOccurrenceAt === meetingStartsAt.toISOString()) {
      meetingStartsAt = getNextMeetingStart(meeting, meetingStartsAt);
      if (!meetingStartsAt) continue;
    }
    const plannedNotifyAt = meetingStartsAt.getTime() - reminder.leadMinutes * 60_000;
    const notifyAt = new Date(Math.max(now.getTime(), plannedNotifyAt));
    const candidate = { reminder, meeting, meetingStartsAt, notifyAt };
    if (!soonest || candidate.notifyAt.getTime() < soonest.notifyAt.getTime()) soonest = candidate;
  }

  return soonest;
}
