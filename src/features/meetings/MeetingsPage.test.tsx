import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeetingsPage } from './MeetingsPage';

describe('MeetingsPage', () => {
  it('shows dated AA and NA source links with no-referrer safeguards and local-privacy copy', () => {
    render(<MeetingsPage />);
    const aa = screen.getByRole('link', { name: /AA · Central Valley Intergroup/ });
    const na = screen.getByRole('link', { name: /NA · SVGNA local schedule/ });
    expect(aa.getAttribute('href')).toBe('https://cviaa.org/aa/meetings/');
    expect(na.getAttribute('href')).toBe('https://svgna.org/svgna-meeting-schedule');
    for (const link of [aa, na]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
    }
    expect(screen.getByText(/Local snapshot checked Oct 23, 2026/)).toBeTruthy();
    expect(screen.getByText(/does not request your location, record attendance/)).toBeTruthy();
  });

  it('filters the local snapshot by fellowship, day, city and search text', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'NA' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Turlock' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or format'), { target: { value: 'true solutions' } });
    expect(screen.getByRole('heading', { name: 'True Solutions' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Northside Fellowship' })).toBeNull();
  });

  it('provides a clear empty state and can restore today’s list', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Search group, city, address or format'), { target: { value: 'no match here' } });
    expect(screen.getByText('No listings match those filters.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show today’s meetings' }));
    expect(screen.queryByText('No listings match those filters.')).toBeNull();
  });
});
