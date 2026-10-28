import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navigation from '../app/Navigation';

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderNavigation(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navigation />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe('Quick Find', () => {
  it('opens from the mobile navigation and shows grouped local suggestions', () => {
    renderNavigation();
    fireEvent.click(screen.getByRole('button', { name: 'Search Stillpoint' }));

    const dialog = screen.getByRole('dialog', { name: 'Quick Find' });
    expect(within(dialog).getByRole('searchbox', { name: 'Search Stillpoint pages and actions' })).toBeTruthy();
    expect(within(dialog).getByRole('heading', { name: 'Quick actions' })).toBeTruthy();
    expect(within(dialog).getByText(/Your writing and recovery records are not searched, stored, or sent/)).toBeTruthy();
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'meeting' } });
    expect(within(dialog).getByRole('heading', { name: 'Pages' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: /Meeting finder/ })).toBeTruthy();
  });

  it('filters only built-in destinations and actions as the user types', () => {
    renderNavigation();
    fireEvent.click(screen.getByRole('button', { name: 'Open Quick Find' }));
    const dialog = screen.getByRole('dialog', { name: 'Quick Find' });
    const search = within(dialog).getByRole('searchbox');

    fireEvent.change(search, { target: { value: 'tokens' } });
    expect(within(dialog).getByRole('link', { name: /Journey Collection/ })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: /Explore progress charms/ })).toBeTruthy();
    expect(within(dialog).queryByRole('link', { name: /Living Garden/ })).toBeNull();

    fireEvent.change(search, { target: { value: 'private_entry_content_90531' } });
    expect(within(dialog).getByText('No matches.')).toBeTruthy();
  });

  it('opens with Ctrl+K and supports arrow-key movement through results', () => {
    renderNavigation();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Quick Find' });
    const search = within(dialog).getByRole('searchbox');

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    const firstResult = within(dialog).getByRole('link', { name: /I need a moment/ });
    expect(document.activeElement).toBe(firstResult);

    fireEvent.keyDown(firstResult, { key: 'ArrowDown' });
    const secondResult = within(dialog).getByRole('link', { name: /Find a meeting/ });
    expect(document.activeElement).toBe(secondResult);

    fireEvent.keyDown(secondResult, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(firstResult);
  });

  it('closes with Escape and restores focus to the launcher', () => {
    renderNavigation();
    const launcher = screen.getByRole('button', { name: 'Search Stillpoint' });
    launcher.focus();
    fireEvent.click(launcher);
    expect(screen.getByRole('dialog', { name: 'Quick Find' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Quick Find' })).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('navigates to a selected destination and closes the dialog', () => {
    renderNavigation();
    fireEvent.click(screen.getByRole('button', { name: 'Search Stillpoint' }));
    const dialog = screen.getByRole('dialog', { name: 'Quick Find' });
    fireEvent.click(within(dialog).getByRole('link', { name: /Find a meeting/ }));

    expect(screen.getByTestId('current-path').textContent).toBe('/meetings');
    expect(screen.queryByRole('dialog', { name: 'Quick Find' })).toBeNull();
  });
});
