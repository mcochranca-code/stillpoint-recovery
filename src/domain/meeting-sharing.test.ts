import { describe, expect, it } from 'vitest';
import { regionalMeetingListings } from '../data/regional-meetings';
import {
  buildMeetingShareCardHtml,
  buildMeetingShareText,
  MEETING_SHARE_LIMIT,
} from './meeting-sharing';

const meeting = regionalMeetingListings[0]!;

describe('meeting sharing', () => {
  it('builds a branded card with the selected listing fields and supplied app theme', () => {
    const html = buildMeetingShareCardHtml([meeting], {
      primary: 'rgb(33, 72, 61)',
      canvas: 'rgb(248, 246, 238)',
    });
    expect(html).toContain('Stillpoint Recovery');
    expect(html).toContain(meeting.name);
    expect(html).toContain(meeting.dayName);
    expect(html).toContain(meeting.time);
    expect(html).toContain('rgb(33, 72, 61)');
    expect(html).toContain('Confirm current time, venue and access');
    expect(html).toContain('Official meeting source');
    expect(html).not.toContain('formatNotes');
  });

  it('renders multiple selections and builds plain text from only selected meeting details', () => {
    const selected = regionalMeetingListings.slice(0, 2);
    const html = buildMeetingShareCardHtml(selected);
    const text = buildMeetingShareText(selected);
    expect(html).toContain('2 meetings to share');
    for (const item of selected) {
      expect(html).toContain(item.name);
      expect(text).toContain(item.name);
    }
    expect(text).toContain('Stillpoint Recovery — meeting details');
    expect(text).toContain('credentials are not included');
    expect(text).not.toContain('recovery records');
  });

  it('escapes user-visible listing text and omits direct join credentials and unsafe source URLs', () => {
    const riskyMeeting = {
      ...meeting,
      name: '<img src=x onerror=alert(1)>',
      city: 'Online https://zoom.us/j/123456789 passcode: secret',
      address: 'https://zoom.us/j/123456789?pwd=secret',
      sourceUrl: 'https://zoom.us/j/123456789?pwd=secret',
      time: '7:00 Meeting ID 123456789',
      timeZoneNote: 'Pacific time; meeting ID: 123456789; passcode: secret',
    };
    const html = buildMeetingShareCardHtml([riskyMeeting]);
    const text = buildMeetingShareText([riskyMeeting]);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('zoom.us/j/');
    expect(html).not.toContain('123456789');
    expect(html).not.toContain('secret');
    expect(text).not.toContain('zoom.us/j/');
    expect(text).not.toContain('123456789');
    expect(text).not.toContain('secret');
  });

  it('rejects empty and oversized share selections', () => {
    expect(() => buildMeetingShareCardHtml([])).toThrow(RangeError);
    expect(() => buildMeetingShareText(Array.from({ length: MEETING_SHARE_LIMIT + 1 }, () => meeting))).toThrow(RangeError);
  });
});
