import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  preferencesPut: vi.fn(),
  profilesPut: vi.fn(),
  requestPersistentStorage: vi.fn(),
}));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: mocks.getNotificationPermission,
  requestNotificationPermission: mocks.requestNotificationPermission,
}));
vi.mock('../../db/backup', () => ({
  MAX_BACKUP_FILE_BYTES: 15 * 1024 * 1024,
  createBackup: mocks.createBackup,
  downloadJsonBackup: mocks.downloadJsonBackup,
  inspectBackupText: mocks.inspectBackupText,
  importBackupText: mocks.importBackupText,
  clearAllLocalData: mocks.clearAllLocalData,
}));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: { ...actual.db, preferences: { put: mocks.preferencesPut }, recoveryProfiles: { put: mocks.profilesPut } } };
});
vi.mock('../../platform/localSignals', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../platform/localSignals')>()),
  requestPersistentStorage: mocks.requestPersistentStorage,
}));

import { SettingsPage } from './SettingsPage';

function renderPage() {
  return render(<MemoryRouter><SettingsPage /></MemoryRouter>);
}

function backupFile(text = '{"ok":true}', name = 'stillpoint.json') {
  const file = new File([text], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}

const preview = {
  schemaVersion: 3,
  recordsInFile: 4,
  readyToImport: 3,
  skippedDuplicates: 1,
  skippedInvalid: 0,
  stores: [
    { store: 'journalEntries', recordsInFile: 4, readyToImport: 3, skippedDuplicates: 1, skippedInvalid: 0, behavior: 'merge by ID' },
    { store: 'charms', recordsInFile: 0, readyToImport: 0, skippedDuplicates: 0, skippedInvalid: 0, behavior: 'merge by ID' },
  ],
};

describe('SettingsPage actions', () => {
  const originalStorage = navigator.storage;

  beforeEach(() => {
    localStorage.clear();
    for (const mock of Object.values(mocks)) if (typeof mock === 'function' && 'mockReset' in mock) mock.mockReset();
    mocks.updatePreferences.mockResolvedValue(undefined);
    mocks.getNotificationPermission.mockResolvedValue('default');
    mocks.requestNotificationPermission.mockResolvedValue('granted');
    mocks.requestPersistentStorage.mockResolvedValue(true);
    mocks.context = {
      preferences: { ...defaultPreferences(), trustedContacts: ['Sponsor · 555-0100'], supportResources: ['Tuesday meeting'] },
      updatePreferences: mocks.updatePreferences,
      notify: mocks.notify,
    } as never;
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: () => Promise.resolve({ usage: 2048 }) } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: originalStorage });
  });

  it('shows a loading state until preferences are available', () => {
    mocks.context = { ...(mocks.context as object), preferences: undefined } as never;
    renderPage();
    expect(screen.getByText('Loading settings…')).toBeInTheDocument();
  });

  it('reports local storage use in readable units, or that no estimate exists', async () => {
    const { unmount } = renderPage();
    expect(await screen.findByText(/2\.0 KB used by this site/)).toBeInTheDocument();
    unmount();

    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: () => Promise.resolve({ usage: 3 * 1024 * 1024 }) } });
    const second = renderPage();
    expect(await screen.findByText(/3\.0 MB used by this site/)).toBeInTheDocument();
    second.unmount();

    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: () => Promise.resolve({ usage: 512 }) } });
    const third = renderPage();
    expect(await screen.findByText(/512 bytes used by this site/)).toBeInTheDocument();
    third.unmount();

    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: () => Promise.resolve({}) } });
    const fourth = renderPage();
    expect(await screen.findByText(/Usage estimate available; no limit or encryption is implied/)).toBeInTheDocument();
    fourth.unmount();

    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: () => Promise.reject(new Error('blocked')) } });
    const fifth = renderPage();
    expect(await screen.findByText(/Storage estimate is not available in this browser/)).toBeInTheDocument();
    fifth.unmount();

    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    renderPage();
    expect(await screen.findByText(/Storage estimate is not available in this browser/)).toBeInTheDocument();
  });

  it('saves each appearance and display preference that is changed', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Appearance mode'), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText('Counter display'), { target: { value: 'days' } });
    fireEvent.change(screen.getByLabelText('Preferred time format'), { target: { value: '24h' } });
    fireEvent.change(screen.getByLabelText('Living Garden style'), { target: { value: 'desert-bloom' } });
    fireEvent.change(screen.getByLabelText('Daily reminder time'), { target: { value: '08:30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /High contrast/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hide meditation visuals/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Live sobriety counter/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Discreet display/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Slate/ }));

    expect(mocks.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ counterStyle: 'days' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ timeFormat: '24h' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ gardenStyle: 'desert-bloom' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderTime: '08:30' });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ highContrast: !defaultPreferences().highContrast });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ hideMeditationVisual: !defaultPreferences().hideMeditationVisual });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ liveCounter: !defaultPreferences().liveCounter });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ discreetMode: !defaultPreferences().discreetMode });
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ colorTheme: expect.any(String) });
  });

  it('turns Community Notes back off when it was enabled', async () => {
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), communityNotesEnabled: true } } as never;
    renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: /Show Community Notes/ }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ communityNotesEnabled: false });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Community Notes are hidden on this device.'));
  });

  it('hides Christian extras again when they were on', async () => {
    mocks.context = {
      ...(mocks.context as object),
      preferences: { ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['christian'] }, christianExtras: true },
    } as never;
    renderPage();
    fireEvent.click(screen.getByLabelText(/Show Christian extras/));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ christianExtras: false });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Christian extras are hidden on this device.'));
  });

  it('enables a daily reminder only after notification permission is granted', async () => {
    renderPage();
    const toggle = await screen.findByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderEnabled: true }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringMatching(/gentle reminder is enabled/));
  });

  it('keeps reminders off when permission is denied or unsupported, and turns them off on request', async () => {
    mocks.requestNotificationPermission.mockResolvedValueOnce('denied');
    const { unmount } = renderPage();
    let toggle = await screen.findByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Notifications were not enabled. You can change this in browser settings.'));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ reminderEnabled: false });
    unmount();

    mocks.requestNotificationPermission.mockResolvedValueOnce('unsupported');
    const second = renderPage();
    toggle = await screen.findByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('This browser or mobile host does not support notifications.'));
    second.unmount();

    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), reminderEnabled: true } } as never;
    renderPage();
    toggle = await screen.findByRole('checkbox', { name: /Daily reminder/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Reminders are turned off.'));
    expect(mocks.requestNotificationPermission).toHaveBeenCalledTimes(2);
  });

  it('saves trusted contacts and support resources as trimmed lists, and reports a storage failure', async () => {
    renderPage();
    expect(screen.getByLabelText(/Names and contact details/)).toHaveValue('Sponsor · 555-0100');
    expect(screen.getByLabelText(/Resource notes/)).toHaveValue('Tuesday meeting');

    fireEvent.change(screen.getByLabelText(/Names and contact details/), { target: { value: '  Sam \n\n Alex  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save contacts locally' }));
    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledWith({ trustedContacts: ['Sam', 'Alex'] }));
    expect(mocks.notify).toHaveBeenCalledWith('Your trusted-contact list is saved locally. No one was contacted.');

    fireEvent.change(screen.getByLabelText(/Resource notes/), { target: { value: 'Clinic\n  Hotline ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save resources locally' }));
    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledWith({ supportResources: ['Clinic', 'Hotline'] }));
    expect(mocks.notify).toHaveBeenCalledWith('Your support-resource notes are saved locally. They have not been verified or shared.');

    mocks.updatePreferences.mockRejectedValue(new Error('quota'));
    fireEvent.click(screen.getByRole('button', { name: 'Save contacts locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The trusted-contact list could not be saved. Check browser storage and try again.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save resources locally' }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Support-resource notes could not be saved. Check browser storage and try again.'));
  });

  it('downloads a backup, records when it happened, and reports a failure', async () => {
    mocks.createBackup.mockResolvedValue({ app: 'stillpoint' });
    renderPage();
    expect(screen.getByText('No backup downloaded from this device yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Download JSON backup/ }));
    await waitFor(() => expect(mocks.downloadJsonBackup).toHaveBeenCalledWith({ app: 'stillpoint' }));
    expect(mocks.notify).toHaveBeenCalledWith('Your local JSON backup has been downloaded. Keep it somewhere private.');
    expect(mocks.requestPersistentStorage).toHaveBeenCalled();
    expect(await screen.findByText(/Last backup downloaded from this device:/)).toBeInTheDocument();

    mocks.createBackup.mockRejectedValue(new Error('no db'));
    fireEvent.click(screen.getByRole('button', { name: /Download JSON backup/ }));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The backup could not be created. Check browser storage and try again.'));
  });

  it('previews a backup before restoring it, and restores only after confirmation', async () => {
    mocks.inspectBackupText.mockResolvedValue(preview);
    mocks.importBackupText.mockResolvedValue({ imported: 3, skippedDuplicates: 1, skippedInvalid: 0 });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    const input = screen.getByLabelText('Select Stillpoint JSON backup');

    fireEvent.change(input, { target: { files: [backupFile()] } });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    const message = String(confirm.mock.calls[0]?.[0]);
    expect(message).toContain('Preview of stillpoint.json · backup schema 3');
    expect(message).toContain('Journal Entries: 3 to restore/add, 1 duplicate(s) skipped, 0 invalid record(s) skipped (merge by ID).');
    expect(message).not.toContain('Charms:');
    expect(mocks.importBackupText).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [backupFile()] } });
    await waitFor(() => expect(mocks.importBackupText).toHaveBeenCalledWith('{"ok":true}'));
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('Backup restored: 3 records added or restored; 1 duplicate records and 0 invalid records skipped.'));
  });

  it('says when a backup has no supported records, and rejects files that are too large or invalid', async () => {
    mocks.inspectBackupText.mockResolvedValueOnce({ ...preview, stores: [] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    const input = screen.getByLabelText('Select Stillpoint JSON backup');

    fireEvent.change(input, { target: { files: [backupFile()] } });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(String(confirm.mock.calls[0]?.[0])).toContain('No records are present in supported Stillpoint tables.');

    const large = backupFile();
    Object.defineProperty(large, 'size', { value: 16 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [large] } });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('This backup is larger than the supported 15 MB limit.'));

    mocks.inspectBackupText.mockRejectedValueOnce('not an error');
    fireEvent.change(input, { target: { files: [backupFile()] } });
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The backup could not be restored.'));

    fireEvent.change(input, { target: { files: [] } });
    expect(mocks.inspectBackupText).toHaveBeenCalledTimes(2);
  });

  it('opens the file picker from the restore button', () => {
    renderPage();
    const input = screen.getByLabelText('Select Stillpoint JSON backup') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /Restore from JSON/ }));
    expect(click).toHaveBeenCalled();
  });

  it('deletes all local data only after two confirmations, then resets setup', async () => {
    mocks.clearAllLocalData.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');
    renderPage();
    const remove = screen.getByRole('button', { name: /Permanently delete all data/ });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(remove);
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
    fireEvent.click(remove);
    expect(mocks.clearAllLocalData).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fireEvent.click(remove);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('All local recovery records have been removed. Setup will begin again.'));
    expect(mocks.clearAllLocalData).toHaveBeenCalledTimes(1);
    expect(mocks.preferencesPut).toHaveBeenCalled();
    expect(mocks.profilesPut).toHaveBeenCalled();

    mocks.clearAllLocalData.mockRejectedValue(new Error('locked'));
    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true);
    fireEvent.click(remove);
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('The local data could not be removed. Please try again.'));
  });
});
