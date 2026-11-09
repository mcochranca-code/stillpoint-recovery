import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { charmDefinitions } from '../data/charms';
import { db } from '../db/database';
import { defaultPreferences, defaultRecoveryProfile } from '../db/repository';
import { CharmGallery } from './CharmGallery';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../app/AppContext', () => ({ useAppContext: () => ({ notify }) }));

function renderGallery() {
  return render(<MemoryRouter><CharmGallery /></MemoryRouter>);
}

function cardFor(name: string) {
  return screen.getByText(name, { selector: 'strong' }).closest('article') as HTMLElement;
}

describe('CharmGallery', () => {
  beforeEach(async () => {
    await Promise.all([db.preferences.clear(), db.recoveryProfiles.clear(), db.earnedCharms.clear()]);
    await db.preferences.put(defaultPreferences());
    await db.recoveryProfiles.put({ ...defaultRecoveryProfile(), intention: 'Stay present' });
    await db.earnedCharms.put({ id: 'award-1', charmId: 'first-light', earnedAt: '2026-11-01T12:00:00.000Z' });
  });

  afterEach(() => { vi.restoreAllMocks(); notify.mockReset(); });

  it('shows collected charms beside progress toward the rest, and filters by category', async () => {
    renderGallery();
    expect(await screen.findByText('First Light', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(`of ${charmDefinitions.length} collected`)).toBeInTheDocument();
    expect(within(cardFor('First Light')).getByText('Collected')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Open Heart progress' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Journaling' }));
    expect(screen.queryByText('First Light', { selector: 'strong' })).toBeNull();
    expect(screen.getByText('Open Heart', { selector: 'strong' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Show charms not yet collected/ }));
    expect(screen.getByText(/No collected charms in this category yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('First Light', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('Open Heart', { selector: 'strong' })).toBeNull();
  });

  it('adds, edits and removes a private memory for a collected charm', async () => {
    renderGallery();
    await screen.findByText('First Light', { selector: 'strong' });

    fireEvent.click(within(cardFor('First Light')).getByRole('button', { name: 'Add a private memory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(cardFor('First Light')).getByRole('button', { name: 'Add a private memory' }));
    fireEvent.change(screen.getByLabelText(/A private memory/), { target: { value: '  Sunrise walk  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Your private charm memory is saved on this device.'));
    expect(await screen.findByText('Sunrise walk')).toBeInTheDocument();
    expect((await db.earnedCharms.get('award-1'))?.memory).toBe('Sunrise walk');

    fireEvent.click(screen.getByRole('button', { name: 'Edit your private memory' }));
    expect(screen.getByLabelText(/A private memory/)).toHaveValue('Sunrise walk');
    fireEvent.change(screen.getByLabelText(/A private memory/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The private charm memory was removed.'));
    await waitFor(async () => expect((await db.earnedCharms.get('award-1'))?.memory).toBeUndefined());
  });

  it('hides a saved memory in discreet display and reports a storage failure', async () => {
    await db.preferences.put({ ...defaultPreferences(), discreetMode: true });
    await db.earnedCharms.update('award-1', { memory: 'Private detail' });
    renderGallery();
    expect(await screen.findByText('Details hidden while discreet display is on.')).toBeInTheDocument();
    expect(screen.queryByText('Private detail')).toBeNull();

    vi.spyOn(db.earnedCharms, 'update').mockRejectedValueOnce(new Error('quota'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit your private memory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save memory' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The charm memory could not be saved. Check browser storage and try again.'));
  });
});
