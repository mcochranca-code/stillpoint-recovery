import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingListing } from '../data/meetings';

const mocks = vi.hoisted(() => ({
  shareHtmlCard: vi.fn(),
  downloadHtmlFile: vi.fn(),
  shareOrCopy: vi.fn(),
  downloadMeetingCalendarFile: vi.fn(),
  shareMeetingCalendarFile: vi.fn(),
}));

vi.mock('../domain/sharing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domain/sharing')>()),
  shareHtmlCard: mocks.shareHtmlCard,
  downloadHtmlFile: mocks.downloadHtmlFile,
  shareOrCopy: mocks.shareOrCopy,
}));
vi.mock('../domain/meeting-calendar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domain/meeting-calendar')>()),
  downloadMeetingCalendarFile: mocks.downloadMeetingCalendarFile,
  shareMeetingCalendarFile: mocks.shareMeetingCalendarFile,
}));

import { MeetingShareDialog } from './MeetingShareDialog';

const meeting: MeetingListing = {
  id: 'aa-modesto-mon',
  fellowship: 'AA',
  fellowshipLabel: 'Alcoholics Anonymous',
  day: 1,
  dayName: 'Monday',
  time: '7:00 PM',
  sortMinutes: 1140,
  name: 'Monday Night Hope',
  city: 'Modesto',
  county: 'Stanislaus',
  checkedAt: '2026-10-23',
  address: '123 Main St, Modesto, CA',
  mode: 'in-person',
  formatNotes: 'Open discussion',
  timeZoneNote: 'Pacific time',
  scopeNote: 'Central Valley intergroup',
  sourceTitle: 'Central Valley AA',
  sourceUrl: 'https://cviaa.org/aa/meetings/',
};

const online: MeetingListing = {
  ...meeting,
  id: 'na-online-tue',
  fellowship: 'NA',
  fellowshipLabel: undefined,
  name: 'Tuesday Online',
  mode: 'online',
  county: undefined,
  address: '',
  timeZoneNote: undefined,
  scopeNote: undefined,
  checkedAt: undefined,
  sourceTitle: undefined,
  sourceUrl: 'javascript:alert(1)',
};

function status() {
  return screen.getByRole('status');
}

describe('MeetingShareDialog', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it('previews one meeting with its public details and a Google Calendar link', () => {
    render(<MeetingShareDialog meetings={[meeting]} onClose={() => undefined} />);
    const dialog = screen.getByRole('dialog', { name: 'Share selected meeting' });
    const preview = within(dialog).getByRole('article', { name: 'Monday Night Hope share preview' });
    expect(preview).toHaveTextContent('Alcoholics Anonymous');
    expect(preview).toHaveTextContent('In person · Monday · 7:00 PM');
    expect(preview).toHaveTextContent('Modesto, Stanislaus');
    expect(preview).toHaveTextContent('Central Valley intergroup');
    expect(preview).toHaveTextContent('Pacific time');
    expect(within(preview).getByRole('link', { name: 'Central Valley AA' })).toHaveAttribute('href', 'https://cviaa.org/aa/meetings/');
    expect(screen.getByRole('link', { name: /Google Calendar/ })).toHaveAttribute('href', expect.stringContaining('calendar.google.com'));
  });

  it('previews several meetings, falls back for missing labels, and drops unsafe source links', () => {
    render(<MeetingShareDialog meetings={[meeting, online, { ...online, id: 'hybrid', mode: 'hybrid', name: 'Hybrid Hall' }, { ...online, id: 'labelled', modalityLabel: 'Phone', name: 'Phone Line' }]} onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Share selected meetings' })).toBeInTheDocument();
    expect(screen.getByText('4 meetings to share')).toBeInTheDocument();
    const onlinePreview = screen.getByRole('article', { name: 'Tuesday Online share preview' });
    expect(onlinePreview).toHaveTextContent('Online · Monday');
    expect(onlinePreview).toHaveTextContent('NA');
    expect(onlinePreview).toHaveTextContent('Official meeting source');
    expect(within(onlinePreview).queryByRole('link')).toBeNull();
    expect(screen.getByRole('article', { name: 'Hybrid Hall share preview' })).toHaveTextContent('Hybrid ·');
    expect(screen.getByRole('article', { name: 'Phone Line share preview' })).toHaveTextContent('Phone ·');
    expect(screen.queryByRole('link', { name: /Google Calendar/ })).toBeNull();
  });

  it('reports each calendar-invite outcome and downloads when sharing is unavailable', async () => {
    render(<MeetingShareDialog meetings={[meeting]} onClose={() => undefined} />);
    const share = screen.getByRole('button', { name: /Share calendar invite/ });

    mocks.shareMeetingCalendarFile.mockResolvedValueOnce('shared');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('The calendar invite was handed to your device share sheet.'));

    mocks.shareMeetingCalendarFile.mockResolvedValueOnce('cancelled');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('Sharing canceled. Nothing was sent or downloaded.'));

    mocks.shareMeetingCalendarFile.mockResolvedValueOnce('unavailable');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('so the calendar invite was downloaded as an iCal file.'));
    expect(mocks.downloadMeetingCalendarFile).toHaveBeenCalledWith([meeting]);

    fireEvent.click(screen.getByRole('button', { name: /Download iCal invite/ }));
    expect(status()).toHaveTextContent('The calendar invite was downloaded as an iCal file. It contains the selected recurring meeting schedule');
    expect(mocks.downloadMeetingCalendarFile).toHaveBeenCalledTimes(2);
  });

  it('shares or downloads the branded card', async () => {
    render(<MeetingShareDialog meetings={[meeting]} onClose={() => undefined} />);
    const share = screen.getByRole('button', { name: /Share card/ });

    mocks.shareHtmlCard.mockResolvedValueOnce('shared');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('The branded card was handed to your device share sheet.'));
    expect(mocks.shareHtmlCard).toHaveBeenCalledWith(expect.stringContaining('Monday Night Hope'), 'stillpoint-meeting-card.html', 'Stillpoint Recovery meeting card');

    mocks.shareHtmlCard.mockResolvedValueOnce('cancelled');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('Sharing canceled. Nothing was sent or downloaded.'));

    mocks.shareHtmlCard.mockResolvedValueOnce('unavailable');
    fireEvent.click(share);
    await waitFor(() => expect(status()).toHaveTextContent('so the standalone card was downloaded to this device.'));

    fireEvent.click(screen.getByRole('button', { name: /Download card/ }));
    expect(status()).toHaveTextContent('The standalone branded HTML card was downloaded locally.');
    expect(mocks.downloadHtmlFile).toHaveBeenCalledTimes(2);
  });

  it('reports each text-share outcome', async () => {
    render(<MeetingShareDialog meetings={[meeting]} onClose={() => undefined} />);
    const share = screen.getByRole('button', { name: /Share text/ });
    const outcomes: Array<[string, string]> = [
      ['shared', 'Only the meeting details shown in the preview were handed to your device share sheet.'],
      ['copied', 'The meeting details were copied to this device’s clipboard.'],
      ['cancelled', 'Sharing canceled. Nothing was sent.'],
      ['unavailable', 'Native sharing and clipboard are unavailable in this browser.'],
    ];
    for (const [result, message] of outcomes) {
      mocks.shareOrCopy.mockResolvedValueOnce(result);
      fireEvent.click(share);
      await waitFor(() => expect(status()).toHaveTextContent(message));
    }
    expect(mocks.shareOrCopy).toHaveBeenCalledWith({ title: 'Stillpoint Recovery meeting details', text: expect.stringContaining('Monday Night Hope') });
  });

  it('closes from the close buttons and from a backdrop click, but not from inside the card', () => {
    const onClose = vi.fn();
    const { container } = render(<MeetingShareDialog meetings={[meeting]} onClose={onClose} />);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(container.querySelector('.dialog-backdrop') as Element);
    fireEvent.click(screen.getByRole('button', { name: 'Close meeting share preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
