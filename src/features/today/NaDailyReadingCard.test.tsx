import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NA_JUST_FOR_TODAY_URL, NaDailyReadingCard } from './NaDailyReadingCard';

const longLocalDate = () => new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});

describe('NA Just for Today card', () => {
  it('links to the official reader without reproducing NA text and labels the current local date', () => {
    render(<NaDailyReadingCard />);

    expect(screen.getByRole('heading', { name: 'NA Just for Today' })).toBeTruthy();
    const link = screen.getByRole('link', {
      name: /open today's official narcotics anonymous just for today reading at na\.org/i,
    });
    expect(link.getAttribute('href')).toBe(NA_JUST_FOR_TODAY_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(`Today on this device: ${longLocalDate()}`)).toBeTruthy();
    expect(screen.getByText(/links to NA\.org rather than copying the copyrighted reading/i)).toBeTruthy();
  });

  it('refreshes its date label at local midnight while the card remains mounted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 23, 59, 30));
    const view = render(<NaDailyReadingCard />);

    try {
      expect(screen.getByText('Today on this device: Thursday, January 1, 2026')).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
      expect(screen.getByText('Today on this device: Friday, January 2, 2026')).toBeTruthy();
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });
});
