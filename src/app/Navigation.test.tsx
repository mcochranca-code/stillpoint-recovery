import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Navigation from './Navigation';

beforeEach(() => { window.localStorage.clear(); });

describe('Navigation', () => {
  it('keeps Home separate and every other destination in the mobile navigation', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const mobileWrap = document.querySelector('.mobile-nav-wrap');
    const routeLabels = ['Progress', 'Current milestone token', 'Journal', 'Meditation', 'Meetings', 'Community', 'Library'];

    expect(mobileWrap).not.toBeNull();
    expect(within(mobileWrap as HTMLElement).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(routeLabels.length);
    for (const label of routeLabels) expect(within(mobileNavigation).getByRole('link', { name: label })).toBeInTheDocument();
    expect(within(mobileNavigation).getByText('Tokens', { selector: 'span' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'Search Stillpoint' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeInTheDocument();
  });

  it('keeps Home visible when destinations are hidden and restores the destination row on Show', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const mobileWrap = document.querySelector('.mobile-nav-wrap') as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: 'Hide mobile navigation' }));
    expect(mobileNavigation).toHaveAttribute('aria-hidden', 'true');
    expect(mobileNavigation).toHaveAttribute('inert');
    expect(within(mobileWrap).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show mobile navigation' }));
    expect(mobileNavigation).toHaveAttribute('aria-hidden', 'false');
    expect(mobileNavigation).not.toHaveAttribute('inert');
  });

  it('offers animated expand/close states for mobile navigation labels', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const wrapper = document.querySelector('.mobile-nav-wrap') as HTMLElement;
    const toggle = screen.getByRole('button', { name: 'Expand mobile navigation' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(wrapper).toHaveClass('expanded');
    expect(screen.getByRole('button', { name: 'Close expanded mobile navigation' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close expanded mobile navigation' }));
    expect(wrapper).not.toHaveClass('expanded');
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
