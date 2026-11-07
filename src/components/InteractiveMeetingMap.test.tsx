import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InteractiveMeetingMap from './InteractiveMeetingMap';
import type { MeetingMapLocation } from '../domain/meeting-map';
import { distanceInMiles } from '../domain/meeting-map';
import { axeViolations } from '../../tests/axe';

const meeting = (id: string, name: string) => ({
  id, name, fellowship: 'AA', mode: 'in-person', day: 1, dayName: 'Monday', time: '7:00 PM', sortMinutes: 1140,
  city: 'Modesto', address: '1 Main St', sourceUrl: 'https://example.org/listing', sourceTitle: 'Example intergroup',
}) as unknown as MeetingMapLocation['meetings'][number];

const locations: MeetingMapLocation[] = [
  { id: 'a', latitude: 37.64, longitude: -120.99, city: 'Modesto', address: '1 Main St', meetings: [meeting('m1', 'Morning Light')] },
  { id: 'b', latitude: 37.49, longitude: -120.85, city: 'Turlock', address: '2 Oak Ave', meetings: [meeting('m2', 'Evening Calm'), meeting('m3', 'Step Study')] },
];

afterEach(() => { vi.unstubAllGlobals(); });

describe('InteractiveMeetingMap', () => {
  it('renders focusable labelled pins and a keyboard list alternative with inline details', async () => {
    const geolocation = { getCurrentPosition: vi.fn() };
    vi.stubGlobal('navigator', { ...navigator, geolocation });
    const { container } = render(<InteractiveMeetingMap locations={locations} />);

    const pins = container.querySelectorAll('.meeting-map-pin');
    expect(pins).toHaveLength(2);
    for (const pin of pins) {
      expect(pin).toHaveAttribute('role', 'button');
      expect(pin).toHaveAttribute('tabindex', '0');
      expect(pin.getAttribute('aria-label')).toMatch(/meetings?\. Press Enter for details\.$/);
    }

    const list = screen.getByRole('list');
    const buttons = within(list).getAllByRole('button');
    buttons[0]!.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.click(buttons[1]!);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    const details = screen.getByRole('region', { name: 'Selected venue' });
    expect(within(details).getByText(/Evening Calm/)).toBeInTheDocument();
    expect(within(details).getAllByRole('link')[0]).toHaveAttribute('rel', 'noopener noreferrer');

    // Privacy: no position is requested until the person asks for it.
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('asks for a position only on explicit opt-in, orders venues by distance and forgets it on request', () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback, _error?: PositionErrorCallback, _options?: PositionOptions) => success({ coords: { latitude: 37.5, longitude: -120.86, accuracy: 500 } } as GeolocationPosition)),
    };
    vi.stubGlobal('navigator', { ...navigator, geolocation });
    render(<InteractiveMeetingMap locations={locations} />);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Show my approximate position' }));
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geolocation.getCurrentPosition.mock.calls[0]![2]).toMatchObject({ enableHighAccuracy: false });
    const ordered = within(screen.getByRole('list')).getAllByRole('button');
    expect(ordered[0]).toHaveTextContent('Turlock');
    expect(ordered[0]).toHaveTextContent(/about \d+(\.\d)? mi away/);

    fireEvent.click(screen.getByRole('button', { name: 'Remove my position' }));
    expect(within(screen.getByRole('list')).getAllByRole('button')[0]).toHaveTextContent('Modesto');
  });

  it('computes great-circle distance', () => {
    expect(distanceInMiles({ latitude: 37.6391, longitude: -120.9969 }, { latitude: 37.4947, longitude: -120.8466 })).toBeCloseTo(12.9, 0);
  });
});
