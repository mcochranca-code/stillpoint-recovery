import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navigation from './Navigation';

describe('Navigation', () => {
  it('keeps every mobile destination and readable visible labels with full accessible names', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const routeLabels = ['Today', 'Progress', 'Current milestone token', 'Journal', 'Meditation', 'Meetings', 'Library'];

    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(routeLabels.length);
    for (const label of routeLabels) {
      expect(within(mobileNavigation).getByRole('link', { name: label })).toBeTruthy();
    }
    expect(within(mobileNavigation).getByText('Tokens', { selector: 'span' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Search Stillpoint' })).toBeTruthy();
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeTruthy();
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
