import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { EarnedCharm } from '../../domain/types';
import { RecentlyEarnedCharms } from './RecentlyEarnedCharms';

const award = (charmId: string, earnedAt: string): EarnedCharm => ({ id: `award:${charmId}`, charmId, earnedAt });

describe('RecentlyEarnedCharms', () => {
  it('renders nothing before any charm is collected', () => {
    const { container } = render(<MemoryRouter><RecentlyEarnedCharms awards={[]} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the latest three charms, newest first, each linking to the Journey Collection', () => {
    const awards = [
      award('quiet-mind', '2026-10-01T10:00:00.000Z'),
      award('seven-day-oak', '2026-11-05T10:00:00.000Z'),
      award('open-heart', '2026-10-20T10:00:00.000Z'),
      award('deep-roots', '2026-11-08T10:00:00.000Z'),
      award('retired-charm', '2026-11-09T10:00:00.000Z'),
    ];
    render(<MemoryRouter><RecentlyEarnedCharms awards={awards} /></MemoryRouter>);
    const section = screen.getByRole('region', { name: 'Recently earned' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual(['Deep Roots', 'Seven-Day Oak', 'Open Heart']);
    for (const item of items) {
      const link = within(item).getByRole('link');
      expect(link).toHaveAttribute('href', '/charms');
      expect(link.textContent).toMatch(/Collected /);
      expect(item.querySelector('.charm-medallion')).toHaveAttribute('aria-hidden', 'true');
      expect(item.querySelector('button')).toBeNull();
    }
    expect(within(section).getByRole('link', { name: /See all charms/ })).toHaveAttribute('href', '/charms');
  });
});
