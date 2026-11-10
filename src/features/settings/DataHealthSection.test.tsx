import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';
import { db } from '../../db/database';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import { DIAGNOSTICS_STORAGE_KEY, logDiagnostic, readDiagnostics } from '../../platform/diagnostics';
import { DataHealthSection, storeLabel } from './DataHealthSection';
import type { JournalEntry } from '../../domain/types';

const at = '2026-10-17T12:00:00.000Z';
const entry = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, type: 'free-writing', title: 'A note', body: 'Private words', createdAt: at, updatedAt: at, tags: [], gratitude: [], ...overrides,
}) as unknown as JournalEntry;

const notify = vi.fn();

async function seed() {
  await db.preferences.put(defaultPreferences());
  await db.recoveryProfiles.put(defaultRecoveryProfile());
  await db.journalEntries.bulkPut([
    entry('journal:ok'),
    entry('journal:partial', { gratitude: undefined }),
    entry('journal:broken', { type: 'not-a-type' }),
  ]);
}

async function check() {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Check my data' })); });
  return screen.findByText(/records? checked\./);
}

beforeEach(async () => {
  notify.mockReset();
  window.localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
  await db.delete();
  await db.open();
});

afterEach(() => {
  db.close();
});

describe('Settings → Data health', () => {
  it('labels stores in plain words', () => {
    expect(storeLabel('journalEntries')).toBe('journal entries');
  });

  it('reports healthy data without offering any change', async () => {
    await db.preferences.put(defaultPreferences());
    render(<DataHealthSection notify={notify} />);
    await check();
    expect(screen.getByText(/1 record checked\./)).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('Your local records look healthy.');
    expect(screen.queryByRole('button', { name: /Repair/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /quarantine/ })).toBeNull();
  });

  it('shows ok, repairable and unreadable counts and has no accessibility violations', async () => {
    await seed();
    const { container } = render(<DataHealthSection notify={notify} />);
    await check();
    expect(screen.getByText(/5 records checked\./).parentElement).toHaveTextContent('3 look fine, 1 can be repaired, 1 is unreadable.');
    const list = screen.getByRole('list', { name: 'Sections that need attention' });
    expect(within(list).getByText('journal entries: 1 repairable, 1 unreadable')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('The data check found records that need attention. Nothing has been changed.');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('repairs only after confirmation', async () => {
    await seed();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DataHealthSection notify={notify} />);
    await check();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Repair 1 record…' })); });
    expect((await db.journalEntries.get('journal:partial'))?.gratitude).toBeUndefined();
    expect(await db.quarantine.count()).toBe(0);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Repair 1 record…' })); });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('1 record repaired. The originals are kept in quarantine.'));
    expect((await db.journalEntries.get('journal:partial'))?.gratitude).toEqual([]);
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Repair/ })).toBeNull());
    expect(await screen.findByText(/1 record in quarantine on this device/)).toBeInTheDocument();
  });

  it('moves unreadable records to quarantine only after confirmation', async () => {
    await seed();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DataHealthSection notify={notify} />);
    await check();
    const button = () => screen.getByRole('button', { name: 'Move 1 unreadable record to quarantine…' });

    await act(async () => { fireEvent.click(button()); });
    expect(await db.journalEntries.get('journal:broken')).toBeDefined();

    await act(async () => { fireEvent.click(button()); });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('1 record moved to quarantine. Nothing was deleted.'));
    expect(await db.journalEntries.get('journal:broken')).toBeUndefined();
    expect(await db.quarantine.get('journalEntries:journal:broken')).toBeDefined();
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/kept unchanged on this device and included in your JSON backups/);
  });

  it('reports a failed repair or quarantine and a failed scan without changing records', async () => {
    await seed();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DataHealthSection notify={notify} />);
    await check();
    // Both actions first write the original into quarantine; make that write fail once each.
    const tablePrototype = Object.getPrototypeOf(db.quarantine) as { put: (...args: unknown[]) => Promise<unknown> };
    const put = vi.spyOn(tablePrototype, 'put');
    put.mockRejectedValueOnce(new Error('disk'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Repair 1 record…' })); });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The repair could not be completed, so nothing was changed. Please try again.'));
    put.mockRejectedValueOnce(new Error('disk'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move 1 unreadable record to quarantine…' })).toBeEnabled());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move 1 unreadable record to quarantine…' })); });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The records could not be moved, so nothing was changed. Please try again.'));
    put.mockRestore();
    expect(await db.journalEntries.count()).toBe(3);
    expect((await db.journalEntries.get('journal:partial'))?.gratitude).toBeUndefined();
    expect(await db.quarantine.count()).toBe(0);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Check my data' })).toBeEnabled());
    vi.spyOn(db, 'table').mockImplementation(() => { throw new Error('closed'); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Check my data' })); });
    expect(await screen.findByText(/19 sections could not be read/)).toBeInTheDocument();
  });

  it('shows, copies and clears the diagnostics log only with confirmation', async () => {
    logDiagnostic({ level: 'warning', event: 'integrity-scan', store: 'journalEntries', count: 2 });
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DataHealthSection notify={notify} />);

    fireEvent.click(screen.getByText('Diagnostics log (1 entry)'));
    expect(screen.getByLabelText('Diagnostics log entries')).toHaveTextContent('integrity-scan store=journalEntries count=2');

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy log' })); });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('integrity-scan store=journalEntries count=2'));
    expect(notify).toHaveBeenCalledWith('The diagnostics log was copied. It contains no journal text or record contents.');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy log' })); });
    expect(notify).toHaveBeenCalledWith('The log could not be copied automatically. You can select the text and copy it instead.');

    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(readDiagnostics()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }));
    expect(readDiagnostics()).toHaveLength(0);
    expect(screen.getByText('Diagnostics log (0 entries)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear log' })).toBeDisabled();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });
});
