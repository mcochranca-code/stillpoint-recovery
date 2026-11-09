import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Navigation from './Navigation';

beforeEach(() => { window.localStorage.clear(); });

function openMobileMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
  return screen.getByRole('navigation', { name: 'Mobile primary navigation' });
}

describe('Navigation', () => {
  it('keeps a floating Home control, mobile header actions, and enabled destinations in the side menu', () => {
    render(<MemoryRouter><Navigation communityNotesEnabled /></MemoryRouter>);
    const mobileNavigation = openMobileMenu();

    expect(document.querySelector('.mobile-home-fab')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Close navigation menu' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Settings and privacy' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Accessibility options' }).some((link) => link.getAttribute('href') === '/settings#appearance-accessibility')).toBe(true);
    const routeLabels = ['Progress', 'Current milestone token', 'Journal', 'Meditation', 'Meetings', 'Community Notes', 'Library'];
    for (const label of routeLabels) expect(within(mobileNavigation).getByRole('link', { name: label })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'Search Stillpoint' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeInTheDocument();
  });

  it('keeps Community Notes out of navigation until the local opt-in is enabled', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = openMobileMenu();
    expect(within(mobileNavigation).queryByRole('link', { name: 'Community Notes' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Community Notes' })).toBeNull();
  });

  it('opens and closes the hamburger side menu and closes it with Escape', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = openMobileMenu();
    const drawer = document.querySelector('.mobile-side-drawer') as HTMLElement;
    expect(drawer).toHaveAttribute('aria-hidden', 'false');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(mobileNavigation).toHaveAttribute('aria-label', 'Mobile primary navigation');
  });

  it('hides the mobile header on downward scroll and shows it again on upward scroll', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const header = document.querySelector('.mobile-header') as HTMLElement;
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 150 });
    fireEvent.scroll(window);
    expect(header).toHaveClass('is-hidden');
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 115 });
    fireEvent.scroll(window);
    expect(header).not.toHaveClass('is-hidden');
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
