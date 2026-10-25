import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MeetingsPage } from './MeetingsPage';

vi.mock('../../components/InteractiveMeetingMap', () => ({
  default: ({ locations }: { locations: unknown[] }) => <div role="region" aria-label="Interactive meeting map" data-location-count={locations.length} />,
}));

function expectExternalLink(link: HTMLElement, href: string) {
  expect(link.getAttribute('href')).toBe(href);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
}

describe('MeetingsPage', () => {
  it('shows official AA, NA and Food Addicts source links with privacy safeguards', () => {
    render(<MeetingsPage />);
    const aa = screen.getByRole('link', { name: /AA · Central Valley Intergroup/ });
    const na = screen.getByRole('link', { name: /NA · SVGNA local schedule/ });
    const fa = screen.getByRole('link', { name: /FA · Food Addicts live finder/ });
    expectExternalLink(aa, 'https://cviaa.org/aa/meetings/');
    expectExternalLink(na, 'https://svgna.org/svgna-meeting-schedule');
    expectExternalLink(fa, 'https://www.foodaddicts.org/find-a-meeting');
    expect(screen.getByText(/Local AA\/NA snapshot checked Oct 23, 2026/)).toBeTruthy();
    expect(screen.getByText(/does not request your location, record attendance/)).toBeTruthy();
  });

  it('filters the local snapshot by fellowship, day, city and search text', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'NA' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Turlock' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'true solutions' } });
    expect(screen.getByRole('heading', { name: 'True Solutions' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Northside Fellowship' })).toBeNull();
  });

  it('filters local listings by an inclusive meeting start-time range', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'NA' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Turlock' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'true solutions' } });
    fireEvent.change(screen.getByLabelText('Start time after'), { target: { value: '17:30' } });
    fireEvent.change(screen.getByLabelText('Start time before'), { target: { value: '18:30' } });
    expect(screen.getByRole('heading', { name: 'True Solutions' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Start time after'), { target: { value: '18:01' } });
    expect(screen.queryByRole('heading', { name: 'True Solutions' })).toBeNull();
    expect(screen.getByText(/time 18:01–18:30/)).toBeTruthy();
  });

  it('filters and searches the source-labeled Zoom listing without inferring other online platforms', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'zoom' } });
    expect(screen.getByRole('heading', { name: 'Sunday Sunrise Virtual' })).toBeTruthy();
    expect(screen.getByText(/Zoom meeting ID/)).toBeTruthy();
    expect(screen.queryByText('No source-labeled Zoom listings match these filters.')).toBeNull();

    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'online' } });
    expect(screen.getByRole('heading', { name: 'Sunday Sunrise Virtual' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'Zoom' } });
    expect(screen.getByRole('heading', { name: 'Sunday Sunrise Virtual' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'True Solutions' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'zoom' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'not a group' } });
    expect(screen.getByRole('heading', { name: 'No source-labeled Zoom listings match these filters.' })).toBeTruthy();
  });

  it('shows the official live FA finder rather than implying an empty snapshot means no meetings', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'FA' } });
    expect(screen.getByRole('heading', { name: 'No Food Addicts listings are bundled in this local snapshot.' })).toBeTruthy();
    const finder = screen.getByRole('link', { name: /Open Food Addicts official finder/ });
    expectExternalLink(finder, 'https://www.foodaddicts.org/find-a-meeting');
  });

  it('loads the map only after explicit opt-in and unmounts it when hidden', async () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    expect(screen.queryByRole('region', { name: 'Interactive meeting map' })).toBeNull();
    const loadButton = screen.getByRole('button', { name: 'Load interactive map' });
    expect(loadButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText(/Tiles load from OpenStreetMap only after you choose the map/)).toBeTruthy();

    fireEvent.click(loadButton);
    const map = await screen.findByRole('region', { name: 'Interactive meeting map' });
    expect(map.getAttribute('data-location-count')).toBe('40');
    fireEvent.click(screen.getByRole('button', { name: 'Hide interactive map' }));
    expect(screen.queryByRole('region', { name: 'Interactive meeting map' })).toBeNull();
  });

  it('provides a clear empty state and can restore today’s list', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'no match here' } });
    expect(screen.getByText('No listings match those filters.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show today’s meetings' }));
    expect(screen.queryByText('No listings match those filters.')).toBeNull();
  });
});
