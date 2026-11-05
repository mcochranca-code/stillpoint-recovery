import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Navigation from './Navigation';

describe('Navigation', () => {
  beforeEach(() => {
    window.localStorage.removeItem('stillpoint-mobile-nav-expanded-v1');
    window.localStorage.removeItem('stillpoint-mobile-nav-hidden-v1');
    window.localStorage.removeItem('stillpoint-desktop-sidebar-collapsed-v1');
  });

  it('keeps every mobile destination and readable visible labels with full accessible names', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const routeLabels = ['Home', 'Progress', 'Current milestone token', 'Journal', 'Meditation', 'Meetings', 'Community Notes', 'Library'];

    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(routeLabels.length);
    for (const label of routeLabels) {
      expect(within(mobileNavigation).getByRole('link', { name: label })).toBeTruthy();
    }
    expect(within(mobileNavigation).getByText('Tokens', { selector: 'span' })).toBeTruthy();
    expect(within(mobileNavigation).getByText('Community', { selector: 'span' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Search Stillpoint' })).toBeTruthy();
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeTruthy();
  });

  it('can hide and show the mobile navigation separately from its labels', () => {
    const firstRender = render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const visibilityToggle = screen.getByRole('button', { name: 'Hide mobile navigation' });

    expect(visibilityToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(visibilityToggle);
    expect(screen.getByRole('button', { name: 'Show mobile navigation' })).toHaveAttribute('aria-expanded', 'false');
    expect(mobileNavigation).toHaveAttribute('hidden');
    expect(window.localStorage.getItem('stillpoint-mobile-nav-hidden-v1')).toBe('true');
    firstRender.unmount();

    const secondRender = render(<MemoryRouter><Navigation /></MemoryRouter>);
    const restoredNavigation = secondRender.container.querySelector('#mobile-primary-navigation');
    const showToggle = screen.getByRole('button', { name: 'Show mobile navigation' });
    expect(showToggle).toHaveAttribute('aria-expanded', 'false');
    expect(restoredNavigation).toHaveAttribute('hidden');
    fireEvent.click(showToggle);
    expect(restoredNavigation).not.toHaveAttribute('hidden');
    expect(window.localStorage.getItem('stillpoint-mobile-nav-hidden-v1')).toBe('false');
  });

  it('provides an accessible desktop sidebar collapse toggle', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const sidebar = screen.getByRole('complementary', { name: 'Main navigation' });
    const toggle = within(sidebar).getByRole('button', { name: 'Collapse sidebar navigation' });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    const expandToggle = within(sidebar).getByRole('button', { name: 'Expand sidebar navigation' });
    expect(expandToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandToggle);
    expect(within(sidebar).getByRole('button', { name: 'Collapse sidebar navigation' })).toHaveAttribute('aria-expanded', 'true');
  });
});
