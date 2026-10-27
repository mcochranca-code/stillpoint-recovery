import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TodayQuickStart } from './TodayQuickStart';

describe('TodayQuickStart', () => {
  it('offers optional links to the existing meditation, meetings, and journal routes', () => {
    render(<MemoryRouter><TodayQuickStart /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'What would help right now?' })).toBeTruthy();
    const navigation = screen.getByRole('navigation', { name: 'Quick ways to begin' });
    const links = within(navigation).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(within(navigation).getByRole('link', { name: /Take a quiet pause/ }).getAttribute('href')).toBe('/meditation');
    expect(within(navigation).getByRole('link', { name: /Find a meeting/ }).getAttribute('href')).toBe('/meetings');
    expect(within(navigation).getByRole('link', { name: /Write a few lines/ }).getAttribute('href')).toBe('/journal');
    expect(screen.getByText('Choose a starting point, or explore at your own pace.')).toBeTruthy();
  });
});
