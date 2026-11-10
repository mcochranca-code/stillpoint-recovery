import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';

const mocks = vi.hoisted(() => ({
  downloadJsonBackup: vi.fn(),
  exportReadableData: vi.fn(),
  retryOpenLocalDatabase: vi.fn(),
  resetLocalDatabase: vi.fn(),
}));

vi.mock('../../db/backup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db/backup')>()),
  downloadJsonBackup: mocks.downloadJsonBackup,
}));
vi.mock('../../db/storageHealth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/storageHealth')>();
  mocks.exportReadableData.mockImplementation(actual.exportReadableData);
  mocks.retryOpenLocalDatabase.mockImplementation(actual.retryOpenLocalDatabase);
  mocks.resetLocalDatabase.mockImplementation(actual.resetLocalDatabase);
  return {
    ...actual,
    exportReadableData: (...args: Parameters<typeof actual.exportReadableData>) => mocks.exportReadableData(...args),
    retryOpenLocalDatabase: (...args: Parameters<typeof actual.retryOpenLocalDatabase>) => mocks.retryOpenLocalDatabase(...args),
    resetLocalDatabase: (...args: Parameters<typeof actual.resetLocalDatabase>) => mocks.resetLocalDatabase(...args),
  };
});

import { db } from '../../db/database';
import { createBackup } from '../../db/backup';
import { RecoveryScreen } from './RecoveryScreen';

const at = '2026-10-17T12:00:00.000Z';
const journal = (id: string) => ({ id, type: 'free-writing' as const, title: 'Note', body: 'Private words', createdAt: at, updatedAt: at, tags: [], gratitude: [] });
const failure = { kind: 'version' as const, errorName: 'VersionError' };

function backupFile(text: string, name = 'stillpoint.json') {
  const file = new File([text], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}

function renderScreen(onRetry = vi.fn()) {
  const view = render(<RecoveryScreen failure={failure} onRetry={onRetry} />);
  return { ...view, onRetry };
}

beforeEach(async () => {
  mocks.downloadJsonBackup.mockReset();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  if (!db.isOpen()) await db.open();
  db.close();
});

describe('RecoveryScreen', () => {
  it('explains the problem calmly, keeps data untouched and has no accessibility violations', async () => {
    const { container } = renderScreen();
    const heading = screen.getByRole('heading', { level: 1, name: 'Your local space needs a moment' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/written by a newer or different version/)).toBeInTheDocument();
    expect(screen.getByText(/has not cleared or replaced anything/)).toBeInTheDocument();
    expect(screen.getByText(/Technical detail for support: VersionError/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('retries opening storage when asked', () => {
    const { onRetry } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('downloads whatever can still be read as a backup', async () => {
    await db.journalEntries.put(journal('journal:1'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Download what can be read' }));
    await waitFor(() => expect(mocks.downloadJsonBackup).toHaveBeenCalledTimes(1));
    expect(mocks.downloadJsonBackup.mock.calls[0]?.[0].tables.journalEntries).toEqual([journal('journal:1')]);
    expect(await screen.findByText('A backup of your local records was downloaded. Keep the file private.')).toBeInTheDocument();
  });

  it('says which sections were left out of a partial export, and when nothing could be read', async () => {
    mocks.exportReadableData.mockResolvedValueOnce({ payload: { tables: {} }, readStores: [], unreadableStores: ['journalEntries', 'earnedCharms'] });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Download what can be read' }));
    expect(await screen.findByText(/2 section\(s\) could not be read/)).toBeInTheDocument();

    mocks.exportReadableData.mockRejectedValueOnce(new Error('nothing'));
    fireEvent.click(screen.getByRole('button', { name: 'Download what can be read' }));
    expect(await screen.findByText(/Nothing could be read from local storage/)).toBeInTheDocument();
  });

  it('needs a typed confirmation before resetting, offers export first, and can be backed out of', async () => {
    await db.journalEntries.put(journal('journal:gone'));
    const { onRetry } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Reset local data…' }));
    expect(await screen.findByRole('heading', { name: 'Reset local data (last resort)' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Download what can be read first' })).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Permanently reset local data' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'res' } });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my data' }));
    expect(screen.queryByRole('heading', { name: 'Reset local data (last resort)' })).toBeNull();
    expect(mocks.resetLocalDatabase).not.toHaveBeenCalled();
    expect(await db.journalEntries.count()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reset local data…' }));
    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'reset' } });
    expect(screen.getByRole('button', { name: 'Permanently reset local data' })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Permanently reset local data' })); });
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
    expect(mocks.resetLocalDatabase).toHaveBeenCalledWith({ confirmed: true });
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('reports a reset that could not finish', async () => {
    mocks.resetLocalDatabase.mockRejectedValueOnce(new Error('blocked'));
    const { onRetry } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Reset local data…' }));
    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'RESET' } });
    fireEvent.click(screen.getByRole('button', { name: 'Permanently reset local data' }));
    expect(await screen.findByText(/could not be reset/)).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('restores a backup only after confirmation', async () => {
    await db.journalEntries.put(journal('journal:restored'));
    const text = JSON.stringify(await createBackup());
    await db.journalEntries.clear();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { onRetry } = renderScreen();
    const input = screen.getByLabelText('Select a Stillpoint JSON backup to restore');

    fireEvent.change(input, { target: { files: [backupFile(text)] } });
    expect(await screen.findByText('Restore cancelled. Nothing was changed.')).toBeInTheDocument();
    expect(await db.journalEntries.count()).toBe(0);

    fireEvent.change(input, { target: { files: [backupFile(text)] } });
    expect(await screen.findByText(/Backup restored: \d+ record\(s\) added or restored\./)).toBeInTheDocument();
    expect(await db.journalEntries.get('journal:restored')).toBeDefined();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('explains restore problems without changing anything', async () => {
    renderScreen();
    const input = screen.getByLabelText('Select a Stillpoint JSON backup to restore');
    fireEvent.change(input, { target: { files: [] } });

    fireEvent.change(input, { target: { files: [backupFile('not json')] } });
    expect(await screen.findByText('The selected file is not valid JSON.')).toBeInTheDocument();

    const big = backupFile('{}');
    Object.defineProperty(big, 'size', { value: 16_000_000 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText(/larger than the supported 15 MB limit/)).toBeInTheDocument();

    mocks.retryOpenLocalDatabase.mockRejectedValueOnce(new Error('still closed'));
    fireEvent.change(input, { target: { files: [backupFile('{}')] } });
    expect(await screen.findByText(/Restoring needs local storage to open first/)).toBeInTheDocument();
  });
});
