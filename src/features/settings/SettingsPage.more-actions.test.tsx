import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/database';
import { defaultPreferences } from '../../db/repository';

const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  notify: vi.fn(),
  context: {} as never,
  getNotificationPermission: vi.fn(),
  requestNotificationPermission: vi.fn(),
  createBackup: vi.fn(),
  downloadJsonBackup: vi.fn(),
  inspectBackupText: vi.fn(),
  importBackupText: vi.fn(),
  clearAllLocalData: vi.fn(),
  writeLocalSignal: vi.fn(),
  readLocalSignal: vi.fn(),
  clearAllLocalSignals: vi.fn(),
  requestPersistentStorage: vi.fn(),
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: mocks.getNotificationPermission,
  requestNotificationPermission: mocks.requestNotificationPermission,
}));
vi.mock('../../db/backup', () => ({
  MAX_BACKUP_FILE_BYTES: 1000,
  createBackup: mocks.createBackup,
  downloadJsonBackup: mocks.downloadJsonBackup,
  inspectBackupText: mocks.inspectBackupText,
  importBackupText: mocks.importBackupText,
  clearAllLocalData: mocks.clearAllLocalData,
}));
vi.mock('../../platform/localSignals', () => ({
  readLocalSignal: mocks.readLocalSignal,
  writeLocalSignal: mocks.writeLocalSignal,
  clearAllLocalSignals: mocks.clearAllLocalSignals,
  requestPersistentStorage: mocks.requestPersistentStorage,
}));

import { SettingsPage } from './SettingsPage';

function renderPage() {
  return render(<MemoryRouter><SettingsPage /></MemoryRouter>);
}

function backupFile(contents = '{"ok":true}', name = 'stillpoint.json') {
  const file = new File([contents], name, { type: 'application/json' });
  // jsdom's File lacks Blob#text; supply it so the component reads the file as a browser would.
  Object.defineProperty(file, 'text', { value: async () => contents });
  return file;
}

describe('SettingsPage actions', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) if (typeof mock === 'function' && 'mockReset' in mock) mock.mockReset();
    mocks.updatePreferences.mockResolvedValue(undefined);
    mocks.getNotificationPermission.mockResolvedValue('default');
    mocks.readLocalSignal.mockReturnValue(null);
    mocks.requestPersistentStorage.mockResolvedValue(true);
    mocks.context = {
      preferences: { ...defaultPreferences(), trustedContacts: ['Sam 555-0100'], supportResources: ['Tuesday meeting'] },
      updatePreferences: mocks.updatePreferences,
      notify: mocks.notify,
    } as never;
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows a loading state until preferences are available', () => {
    mocks.context = { preferences: undefined, updatePreferences: mocks.updatePreferences, notify: mocks.notify } as never;
    renderPage();
    expect(screen.getByText('Loading settings…')).toBeInTheDocument();
  });

  it('prefills and saves trimmed trusted contacts and support resources', async () => {
    renderPage();
    const contacts = screen.getByLabelText(/Names and contact details/);
    expect(contacts).toHaveValue('Sam 555-0100');
    expect(screen.getByLabelText(/Resource notes/)).toHaveValue('Tuesday meeting');

    fireEvent.change(contacts, { target: { value: '  Sam  \n\nAlex\n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save contacts locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your trusted-contact list is saved locally. No one was contacted.'));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ trustedContacts: ['Sam', 'Alex'] });

    fireEvent.change(screen.getByLabelText(/Resource notes/), { target: { value: 'Hotline\n  Clinic ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save resources locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your support-resource notes are saved locally. They have not been verified or shared.'));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ supportResources: ['Hotline', 'Clinic'] });
  });

  it('explains when contacts or resources cannot be saved', async () => {
    mocks.updatePreferences.mockRejectedValue(new Error('quota'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save contacts locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The trusted-contact list could not be saved. Check browser storage and try again.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save resources locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Support-resource notes could not be saved. Check browser storage and try again.'));
  });

  it('saves appearance selects, toggles and reminder time', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Appearance mode'), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText('Counter display'), { target: { value: 'days' } });
    fireEvent.change(screen.getByLabelText('Preferred time format'), { target: { value: '24h' } });
    fireEvent.change(screen.getByLabelText('Living Garden style'), { target: { value: 'desert-bloom' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /High contrast/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hide meditation visuals/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Live sobriety counter/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Discreet display/ }));
    fireEvent.change(screen.getByLabelText('Daily reminder time'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('radio', { name: /Slate/ }));

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ counterStyle: 'days' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ timeFormat: '24h' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ gardenStyle: 'desert-bloom' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ highContrast: true });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ hideMeditationVisual: true });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ discreetMode: true });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderTime: '07:30' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ colorTheme: expect.any(String) }));
    expect(mocks.updatePreferences.mock.calls.some(([patch]) => 'liveCounter' in patch)).toBe(true);
  });

  it('turns Community Notes off with a confirmation message', async () => {
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), communityNotesEnabled: true } } as never;
    renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: /Show Community Notes/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ communityNotesEnabled: false });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Community Notes are hidden on this device.'));
  });

  it('enables reminders only when notification permission is granted', async () => {
    mocks.requestNotificationPermission.mockResolvedValue('granted');
    renderPage();
    const reminder = screen.getByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(reminder).toBeEnabled());
    fireEvent.click(reminder);
    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderEnabled: true }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining('A gentle reminder is enabled'));
  });

  it('keeps reminders off when permission is denied', async () => {
    mocks.requestNotificationPermission.mockResolvedValue('denied');
    renderPage();
    const reminder = screen.getByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(reminder).toBeEnabled());
    fireEvent.click(reminder);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Notifications were not enabled. You can change this in browser settings.'));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderEnabled: false });
  });

  it('reports unsupported notifications discovered on request', async () => {
    mocks.requestNotificationPermission.mockResolvedValue('unsupported');
    renderPage();
    const reminder = screen.getByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(reminder).toBeEnabled());
    fireEvent.click(reminder);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('This browser or mobile host does not support notifications.'));
  });

  it('turns an enabled reminder off without requesting permission', async () => {
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), reminderEnabled: true } } as never;
    renderPage();
    const reminder = screen.getByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(reminder).toBeEnabled());
    fireEvent.click(reminder);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Reminders are turned off.'));
    expect(mocks.requestNotificationPermission).not.toHaveBeenCalled();
  });

  it('shows the storage estimate when the browser provides one', async () => {
    vi.stubGlobal('navigator', { ...navigator, storage: { estimate: vi.fn().mockResolvedValue({ usage: 2048 }) } });
    renderPage();
    expect(await screen.findByText(/2\.0 KB used by this site/)).toBeInTheDocument();
  });

  it('falls back when the storage estimate fails', async () => {
    vi.stubGlobal('navigator', { ...navigator, storage: { estimate: vi.fn().mockRejectedValue(new Error('nope')) } });
    renderPage();
    expect(await screen.findByText(/Storage estimate is not available in this browser\./)).toBeInTheDocument();
  });

  it('downloads a backup and records when it happened', async () => {
    mocks.createBackup.mockResolvedValue({ schemaVersion: 1 });
    renderPage();
    expect(screen.getByText('No backup downloaded from this device yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Download JSON backup/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Your local JSON backup has been downloaded. Keep it somewhere private.'));
    expect(mocks.downloadJsonBackup).toHaveBeenCalledWith({ schemaVersion: 1 });
    expect(mocks.writeLocalSignal).toHaveBeenCalledWith('lastBackupAt', expect.any(String));
    expect(mocks.requestPersistentStorage).toHaveBeenCalled();
    expect(screen.getByText(/Last backup downloaded from this device/)).toBeInTheDocument();
  });

  it('tells the user when a backup cannot be created', async () => {
    mocks.createBackup.mockRejectedValue(new Error('broken'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Download JSON backup/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The backup could not be created. Check browser storage and try again.'));
    expect(screen.getByRole('button', { name: /Download JSON backup/ })).toBeEnabled();
  });

  it('previews a restore and imports after confirmation', async () => {
    mocks.inspectBackupText.mockResolvedValue({
      schemaVersion: 3, recordsInFile: 4, readyToImport: 3, skippedDuplicates: 1, skippedInvalid: 0,
      stores: [
        { store: 'journalEntries', recordsInFile: 4, readyToImport: 3, skippedDuplicates: 1, skippedInvalid: 0, behavior: 'merge' },
        { store: 'earnedCharms', recordsInFile: 0, readyToImport: 0, skippedDuplicates: 0, skippedInvalid: 0, behavior: 'merge' },
      ],
    });
    mocks.importBackupText.mockResolvedValue({ imported: 3, skippedDuplicates: 1, skippedInvalid: 0 });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.change(screen.getByLabelText('Select Stillpoint JSON backup'), { target: { files: [backupFile()] } });

    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Backup restored: 3 records added or restored; 1 duplicate records and 0 invalid records skipped.'));
    const message = confirm.mock.calls[0]?.[0] ?? '';
    expect(message).toContain('Preview of stillpoint.json · backup schema 3');
    expect(message).toContain('Journal Entries: 3 to restore/add');
    expect(message).not.toContain('Earned Charms');
    expect(mocks.importBackupText).toHaveBeenCalledWith('{"ok":true}');
  });

  it('does not import when the restore preview is cancelled', async () => {
    mocks.inspectBackupText.mockResolvedValue({ schemaVersion: 3, recordsInFile: 0, readyToImport: 0, skippedDuplicates: 0, skippedInvalid: 0, stores: [] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    fireEvent.change(screen.getByLabelText('Select Stillpoint JSON backup'), { target: { files: [backupFile()] } });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0]?.[0]).toContain('No records are present in supported Stillpoint tables.');
    expect(mocks.importBackupText).not.toHaveBeenCalled();
  });

  it('rejects an oversized backup and surfaces inspection errors', async () => {
    renderPage();
    const input = screen.getByLabelText('Select Stillpoint JSON backup');
    fireEvent.change(input, { target: { files: [backupFile('x'.repeat(2000))] } });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('This backup is larger than the supported 15 MB limit.'));
    expect(mocks.inspectBackupText).not.toHaveBeenCalled();

    mocks.inspectBackupText.mockRejectedValue('not an error');
    fireEvent.change(input, { target: { files: [backupFile()] } });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The backup could not be restored.'));
  });

  it('ignores an empty file selection', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Select Stillpoint JSON backup'), { target: { files: [] } });
    expect(mocks.inspectBackupText).not.toHaveBeenCalled();
  });

  it('deletes all data only after two confirmations', async () => {
    await db.preferences.put({ ...defaultPreferences(), onboardingComplete: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(true).mockReturnValueOnce(true);
    mocks.clearAllLocalData.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Permanently delete all data/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('All local recovery records have been removed. Setup will begin again.'));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(mocks.clearAllLocalSignals).toHaveBeenCalled();
    expect(await db.preferences.get('preferences')).toMatchObject({ onboardingComplete: false });
    expect(await db.recoveryProfiles.get('recovery-profile')).toMatchObject({ startAt: null });
  });

  it('stops deleting when either confirmation is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    const button = screen.getByRole('button', { name: /Permanently delete all data/ });
    fireEvent.click(button);
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
    fireEvent.click(button);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(3));
    expect(mocks.clearAllLocalData).not.toHaveBeenCalled();
  });

  it('reports when local data cannot be deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mocks.clearAllLocalData.mockRejectedValue(new Error('locked'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Permanently delete all data/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The local data could not be removed. Please try again.'));
  });
});
