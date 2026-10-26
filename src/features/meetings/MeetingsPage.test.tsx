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
    const fresnoAa = screen.getByRole('link', { name: /AA · Greater Fresno Area Intergroup/ });
    const mariposaAa = screen.getByRole('link', { name: /AA · Mariposa Fellowship/ });
    const na = screen.getByRole('link', { name: /NA · SVGNA local schedule/ });
    const fresnoNa = screen.getByRole('link', { name: /NA · Central California NA/ });
    const fa = screen.getByRole('link', { name: /FA · Food Addicts live finder/ });
    expectExternalLink(aa, 'https://cviaa.org/aa/meetings/');
    expectExternalLink(fresnoAa, 'https://www.fresnoaa.org/meetings/');
    expectExternalLink(mariposaAa, 'https://www.aamariposafellowship.org/page3.html');
    expectExternalLink(na, 'https://svgna.org/svgna-meeting-schedule');
    expectExternalLink(fresnoNa, 'http://www.centralcalna.org/na-meetings.html');
    expectExternalLink(fa, 'https://www.foodaddicts.org/find-a-meeting');
    expect(screen.getByText(/Stanislaus AA\/NA snapshot was checked Oct 23, 2026/)).toBeTruthy();
    expect(screen.getByText(/233-row workbook snapshot and a separate 157-row online\/hybrid schedule snapshot, both dated October 26, 2026/)).toBeTruthy();
    expect(screen.getAllByText(/not an exhaustive/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not request your location, record attendance/)).toBeTruthy();
  });

  it('discloses online snapshot limitations and lets users find broad-scope entries without publishing join credentials', () => {
    render(<MeetingsPage />);
    fireEvent.click(screen.getByText(/Online \/ hybrid snapshot: 157 source rows/));
    expect(screen.getByText(/partial, date-stamped source snapshot/i)).toBeTruthy();
    expect(screen.getByText(/Direct Zoom invite URLs, meeting IDs, passcodes/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('County'), { target: { value: 'Fresno County' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'AA' } });
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'online' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'Women with GUTS' } });
    expect(screen.getByRole('heading', { name: 'Women with GUTS' })).toBeTruthy();
    expect(screen.getByText(/National\/broad online—not county-hosted/)).toBeTruthy();
    expect(screen.getByText(/direct Zoom invitations are intentionally not bundled/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /zoom\.us\/j\//i })).toBeNull();
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
    expect(screen.getAllByRole('heading', { name: 'Sunday Sunrise Virtual' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zoom meeting ID/).length).toBeGreaterThan(0);
    expect(screen.queryByText('No source-labeled Zoom listings match these filters.')).toBeNull();

    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'online' } });
    expect(screen.getAllByRole('heading', { name: 'Sunday Sunrise Virtual' }).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'Zoom' } });
    expect(screen.getAllByRole('heading', { name: 'Sunday Sunrise Virtual' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'True Solutions' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'zoom' } });
    fireEvent.change(screen.getByLabelText('Search group, city, address or platform'), { target: { value: 'not a group' } });
    expect(screen.getByRole('heading', { name: 'No source-labeled Zoom listings match these filters.' })).toBeTruthy();
  });

  it('includes a local Fresno FA listing and retains the official live finder link', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('County'), { target: { value: 'Fresno County' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'FA' } });
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'in-person' } });
    expect(screen.getByRole('heading', { name: 'Central Valley Church of Christ, Room 6' })).toBeTruthy();
    expect(screen.getByText(/checked Oct 26, 2026/)).toBeTruthy();
    const liveFinder = screen.getByRole('link', { name: /FA · Food Addicts live finder/ });
    expectExternalLink(liveFinder, 'https://www.foodaddicts.org/find-a-meeting');
    expectExternalLink(screen.getByRole('link', { name: 'Official listing' }), 'https://www.foodaddicts.org/meeting/1250');
  });

  it('exposes SMART Recovery and hybrid formats from the offline workbook', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('County'), { target: { value: 'Merced County' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'SMART' } });
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Meeting format'), { target: { value: 'hybrid' } });
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
  });

  it('explains that a missing county/fellowship sample does not mean no meetings exist', () => {
    render(<MeetingsPage />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('County'), { target: { value: 'Mariposa County' } });
    fireEvent.change(screen.getByLabelText('Fellowship'), { target: { value: 'NA' } });
    expect(screen.getByRole('heading', { name: 'No bundled NA snapshot is available for Mariposa County.' })).toBeTruthy();
    expect(screen.getByText(/not the presence or absence of local meetings/)).toBeTruthy();
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
    expect(Number(map.getAttribute('data-location-count'))).toBeGreaterThan(63);
    expect(screen.getByText('Mapped counties: Alameda County · Fresno County · Los Angeles County · Mariposa County · Merced County · Stanislaus County · Tulare County')).toBeTruthy();
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
