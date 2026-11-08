import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Navigation from './Navigation';

describe('Navigation', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps every enabled mobile destination behind the hamburger with a pinned Settings control', () => {
    render(<MemoryRouter><Navigation communityNotesEnabled /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Open mobile navigation' }));

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const routeLabels = ['Home', 'Progress', 'Current milestone token', 'Journal', 'Meditation', 'Meetings', 'Community Notes', 'Library'];

    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(routeLabels.length);
    for (const label of routeLabels) {
      expect(within(mobileNavigation).getByRole('link', { name: label })).toBeTruthy();
    }
    expect(within(mobileNavigation).getByText('Tokens', { selector: 'span' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Search Stillpoint' })).toBeTruthy();
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings and privacy (pinned)' })).toBeTruthy();
  });

  it('keeps Community Notes out of navigation until the local opt-in is enabled', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Open mobile navigation' }));

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    expect(within(mobileNavigation).queryByRole('link', { name: 'Community Notes' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Community Notes' })).toBeNull();
  });

  it('opens and closes the mobile hamburger menu without affecting pinned Settings', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = document.getElementById('mobile-primary-navigation');
    if (!mobileNavigation) throw new Error('Mobile navigation was not rendered.');
    const openButton = screen.getByRole('button', { name: 'Open mobile navigation' });

    expect(mobileNavigation).toHaveAttribute('hidden');
    fireEvent.click(openButton);
    expect(screen.getByRole('button', { name: 'Close mobile navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(mobileNavigation).not.toHaveAttribute('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Close mobile navigation' }));
    expect(screen.getByRole('button', { name: 'Open mobile navigation' })).toHaveAttribute('aria-expanded', 'false');
    expect(mobileNavigation).toHaveAttribute('hidden');
    expect(screen.getByRole('link', { name: 'Settings and privacy (pinned)' })).toBeTruthy();
  });

  it('provides an accessible desktop sidebar collapse toggle', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const sidebar = screen.getByRole('complementary', { name: 'Main navigation' });
    const toggle = within(sidebar).getByRole('button', { name: 'Collapse sidebar navigation' });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(within(sidebar).getByRole('button', { name: 'Expand sidebar navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
});
