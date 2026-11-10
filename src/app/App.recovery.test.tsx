import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ openLocalDatabase: vi.fn(), retryOpenLocalDatabase: vi.fn() }));

vi.mock('../db/storageHealth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/storageHealth')>();
  return {
    ...actual,
    openLocalDatabase: () => mocks.openLocalDatabase(),
    retryOpenLocalDatabase: () => mocks.retryOpenLocalDatabase(),
  };
});

import App from './App';
import { db } from '../db/database';
import { DIAGNOSTICS_STORAGE_KEY, readDiagnostics } from '../platform/diagnostics';

function renderApp() {
  return render(<MemoryRouter><App /></MemoryRouter>);
}

beforeEach(async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  await db.delete();
  mocks.openLocalDatabase.mockReset();
  mocks.retryOpenLocalDatabase.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  db.close();
});

describe('App startup when local storage fails to open', () => {
  it('shows the recovery screen instead of crashing, logs only the error name, and recovers on retry', async () => {
    mocks.openLocalDatabase.mockRejectedValueOnce(new DOMException('A newer version is installed', 'VersionError'));
    renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: 'Your local space needs a moment' })).toBeInTheDocument();
    expect(screen.getByText(/written by a newer or different version/)).toBeInTheDocument();
    expect(readDiagnostics()).toEqual([expect.objectContaining({ event: 'storage-open-failed', errorName: 'VersionError', level: 'error' })]);
    expect(window.localStorage.getItem(DIAGNOSTICS_STORAGE_KEY)).not.toContain('newer version');

    mocks.retryOpenLocalDatabase.mockImplementationOnce(async () => {
      await db.open();
      const { ensureDefaults } = await import('../db/repository');
      await ensureDefaults();
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Your local space needs a moment' })).toBeNull());
    expect(mocks.retryOpenLocalDatabase).toHaveBeenCalledTimes(1);
  });

  it('stays on the recovery screen with an updated reason when a retry also fails', async () => {
    mocks.openLocalDatabase.mockRejectedValueOnce(new DOMException('gone', 'MissingAPIError'));
    mocks.retryOpenLocalDatabase.mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    renderApp();
    expect(await screen.findByText(/private browsing windows/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    expect(await screen.findByText(/short on storage space/)).toBeInTheDocument();
  });

  it('opens normally and continues to setup when storage is healthy', async () => {
    mocks.openLocalDatabase.mockImplementationOnce(async () => {
      await db.open();
      const { ensureDefaults } = await import('../db/repository');
      await ensureDefaults();
    });
    renderApp();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Your local space needs a moment' })).toBeNull());
    await waitFor(() => expect(document.querySelector('.loading-screen')).toBeNull());
    expect(await db.preferences.get('preferences')).toBeDefined();
  });
});
