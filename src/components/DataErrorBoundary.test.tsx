import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../tests/axe';
import { DataErrorBoundary } from './DataErrorBoundary';
import { DIAGNOSTICS_STORAGE_KEY, readDiagnostics } from '../platform/diagnostics';

const state = { broken: true };

function Fragile() {
  if (state.broken) throw new TypeError('Cannot read journal body "my private words"');
  return <p>Screen is fine</p>;
}

beforeEach(() => {
  state.broken = true;
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom reports errors React catches in development; keep the expected ones out of the test output.
  window.addEventListener('error', silence);
});

afterEach(() => {
  window.removeEventListener('error', silence);
});

function silence(event: ErrorEvent) {
  event.preventDefault();
}

describe('DataErrorBoundary', () => {
  it('shows a calm, accessible fallback instead of a blank app and logs only the error name', async () => {
    const { container } = render(<MemoryRouter><DataErrorBoundary resetKey="/journal"><Fragile /></DataErrorBoundary></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('This screen could not be shown');
    expect(screen.getByRole('link', { name: 'Open Data health' })).toHaveAttribute('href', '/settings#data-health');
    expect(readDiagnostics()).toEqual([expect.objectContaining({ event: 'render-error', errorName: 'TypeError' })]);
    expect(window.localStorage.getItem(DIAGNOSTICS_STORAGE_KEY)).not.toContain('private');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('tries the screen again on request and clears itself when the route changes', () => {
    const view = render(<MemoryRouter><DataErrorBoundary resetKey="/journal"><Fragile /></DataErrorBoundary></MemoryRouter>);
    state.broken = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try this screen again' }));
    expect(screen.getByText('Screen is fine')).toBeInTheDocument();

    state.broken = true;
    view.rerender(<MemoryRouter><DataErrorBoundary resetKey="/journal"><Fragile /></DataErrorBoundary></MemoryRouter>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    state.broken = false;
    view.rerender(<MemoryRouter><DataErrorBoundary resetKey="/progress"><Fragile /></DataErrorBoundary></MemoryRouter>);
    expect(screen.getByText('Screen is fine')).toBeInTheDocument();
  });
});
