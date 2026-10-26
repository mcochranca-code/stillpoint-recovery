import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navigation from './Navigation';

describe('Navigation', () => {
  it('keeps every mobile destination and readable visible labels with full accessible names', () => {
    render(<MemoryRouter><Navigation /></MemoryRouter>);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    const routeLabels = ['Today', 'Progress', 'Journal', 'Meditation', 'Meetings', 'Library'];

    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(routeLabels.length);
    for (const label of routeLabels) {
      expect(within(mobileNavigation).getByRole('link', { name: label })).toBeTruthy();
    }
    expect(within(mobileNavigation).getByText('Meditate', { selector: 'span' })).toBeTruthy();
  });
});
