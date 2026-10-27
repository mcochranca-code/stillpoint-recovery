import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, EyeOff, FileUp, HeartHandshake, ShieldCheck, Trash2 } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { clearAllLocalData, createBackup, downloadJsonBackup, importBackupText, inspectBackupText, MAX_BACKUP_FILE_BYTES } from '../../db/backup';
import { db } from '../../db/database';
import { colorThemePresets } from '../../data/themes';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';
import type { ThemeMode } from '../../domain/types';
import { getNotificationPermission, requestNotificationPermission, type NotificationPermissionStatus } from '../../platform/notificationPermissions';

function formatBytes(value: number): string {
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function backupStoreLabel(name: string): string {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

/** Render appearance, accessibility, privacy, backup, restore, and deletion settings. */
export function SettingsPage() {
  const { preferences, updatePreferences, notify } = useAppContext();
  const [contactsText, setContactsText] = useState('');
  const [resourcesText, setResourcesText] = useState('');
  const [storageUse, setStorageUse] = useState('Checking…');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionStatus>('unsupported');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContactsText((preferences?.trustedContacts ?? []).join('\n'));
  }, [preferences?.trustedContacts]);

  useEffect(() => {
    setResourcesText((preferences?.supportResources ?? []).join('\n'));
  }, [preferences?.supportResources]);

  useEffect(() => {
    if (!navigator.storage?.estimate) { setStorageUse('Storage estimate is not available in this browser.'); return; }
    void navigator.storage.estimate().then((estimate) => setStorageUse(estimate.usage ? `${formatBytes(estimate.usage)} used by this site` : 'Usage estimate available; no limit or encryption is implied.'))
      .catch(() => setStorageUse('Storage estimate is not available in this browser.'));
  }, []);
  useEffect(() => {
    let active = true;
    void getNotificationPermission().then((permission) => { if (active) setNotificationPermission(permission); });
    return () => { active = false; };
  }, []);

  if (!preferences) return <div className="empty-state">Loading settings…</div>;

  async function enableReminder(enabled: boolean) {
    if (!enabled) { await updatePreferences({ reminderEnabled: false }); notify('Reminders are turned off.'); return; }
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      await updatePreferences({ reminderEnabled: true });
      notify('A gentle reminder is enabled while this app is open. Delivery while closed depends on browser or device support.');
    } else if (permission === 'unsupported') {
      await updatePreferences({ reminderEnabled: false });
      notify('This browser or mobile host does not support notifications.');
    } else {
      await updatePreferences({ reminderEnabled: false });
      notify('Notifications were not enabled. You can change this in browser settings.');
    }
  }

  async function saveContacts() {
    const contacts = contactsText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20);
    try { await updatePreferences({ trustedContacts: contacts }); notify('Your trusted-contact list is saved locally. No one was contacted.'); }
    catch { notify('The trusted-contact list could not be saved. Check browser storage and try again.'); }
  }

  async function saveResources() {
    const resources = resourcesText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20);
    try { await updatePreferences({ supportResources: resources }); notify('Your support-resource notes are saved locally. They have not been verified or shared.'); }
    catch { notify('Support-resource notes could not be saved. Check browser storage and try again.'); }
  }

  async function exportBackup() {
    setBusy(true);
    try { downloadJsonBackup(await createBackup()); notify('Your local JSON backup has been downloaded. Keep it somewhere private.'); }
    catch { notify('The backup could not be created. Check browser storage and try again.'); }
    finally { setBusy(false); }
  }

  async function restoreBackup(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_FILE_BYTES) throw new Error('This backup is larger than the supported 15 MB limit.');
      const text = await file.text();
      const preview = await inspectBackupText(text);
      const storeSummary = preview.stores.filter((store) => store.recordsInFile > 0).map((store) => (
        `${backupStoreLabel(store.store)}: ${store.readyToImport} to restore/add, ${store.skippedDuplicates} duplicate(s) skipped, ${store.skippedInvalid} invalid record(s) skipped (${store.behavior}).`
      )).join('\n');
      const confirmation = [
        `Preview of ${file.name} · backup schema ${preview.schemaVersion}`,
        `${preview.recordsInFile} record(s) in the file; ${preview.readyToImport} eligible to restore/add; ${preview.skippedDuplicates} duplicate(s) will be skipped; ${preview.skippedInvalid} invalid record(s) will be skipped.`,
        '',
        storeSummary || 'No records are present in supported Stillpoint tables.',
        '',
        'Preferences and the recovery profile will replace their current values. Other records merge by ID; matching local records are kept, and no table is cleared.',
        'This preview has not changed local data. The JSON backup is unencrypted and may contain sensitive recovery information. Restore it now?',
      ].join('\n');
      if (!window.confirm(confirmation)) return;
      const result = await importBackupText(text);
      notify(`Backup restored: ${result.imported} records added or restored; ${result.skippedDuplicates} duplicate records and ${result.skippedInvalid} invalid records skipped.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The backup could not be restored.');
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  async function deleteAll() {
    if (!window.confirm('Permanently remove all Stillpoint data saved in this browser? This includes journals, recovery settings, charms, garden history, and meditation records.')) return;
    if (!window.confirm('This cannot be undone. Have you downloaded a backup if you want to keep any records?')) return;
    setBusy(true);
    try {
      await clearAllLocalData();
      await db.preferences.put(defaultPreferences());
      await db.recoveryProfiles.put(defaultRecoveryProfile());
      notify('All local recovery records have been removed. Setup will begin again.');
    } catch { notify('The local data could not be removed. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Your space, your settings</p><h1>Settings & privacy.</h1><p>Adjust what appears, how the app feels, and what stays on this device.</p></div><ShieldCheck size={25} aria-hidden="true" /></header>

      <section className="card"><div className="card-header"><div><p className="eyebrow">Make it comfortable</p><h2>Appearance & accessibility</h2></div></div>
        <div className="settings-grid">
          <label className="field-label" htmlFor="theme-setting">Appearance mode<select id="theme-setting" value={preferences.theme} onChange={(event) => void updatePreferences({ theme: event.target.value as ThemeMode })}><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label className="field-label" htmlFor="counter-setting">Counter display<select id="counter-setting" value={preferences.counterStyle} onChange={(event) => void updatePreferences({ counterStyle: event.target.value as 'days' | 'full' })}><option value="full">Days, hours, minutes and seconds</option><option value="days">Days only</option></select></label>
          <label className="field-label range-field" htmlFor="text-scale">Text size <span>{Math.round(preferences.textScale * 100)}%</span><input id="text-scale" type="range" min="0.85" max="1.3" step="0.05" value={preferences.textScale} onChange={(event) => void updatePreferences({ textScale: Number(event.target.value) })} /></label>
          <label className="field-label" htmlFor="time-format">Preferred time format<select id="time-format" value={preferences.timeFormat} onChange={(event) => void updatePreferences({ timeFormat: event.target.value as '12h' | '24h' })}><option value="12h">12-hour clock</option><option value="24h">24-hour clock</option></select></label>
        </div>
        <fieldset className="palette-switcher"><legend>Color palette</legend><p className="fine-print">Choose colors independently of light, dark, or system appearance.</p><div className="palette-options">{colorThemePresets.map((preset) => <label key={preset.id} className={`palette-option${preferences.colorTheme === preset.id ? ' selected' : ''}`}><input type="radio" name="color-theme" value={preset.id} checked={(preferences.colorTheme ?? 'stillpoint') === preset.id} onChange={() => void updatePreferences({ colorTheme: preset.id })} /><span className="palette-swatches" aria-hidden="true">{preset.swatches.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</span><strong>{preset.label}</strong><small>{preset.description}</small></label>)}</div></fieldset>
        <label className="toggle-row"><span><strong>High contrast</strong><small>Strengthen text and borders for legibility.</small></span><input type="checkbox" checked={preferences.highContrast} onChange={(event) => void updatePreferences({ highContrast: event.target.checked })} /></label>
        <label className="toggle-row"><span><strong>Reduce motion</strong><small>Minimize nonessential transitions and animated visuals.</small></span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => void updatePreferences({ reducedMotion: event.target.checked })} /></label>
        <label className="toggle-row"><span><strong>Hide meditation visuals</strong><small>Use written cues and session timing without the animation.</small></span><input type="checkbox" checked={preferences.hideMeditationVisual} onChange={(event) => void updatePreferences({ hideMeditationVisual: event.target.checked })} /></label>
        <label className="toggle-row"><span><strong>Live sobriety counter</strong><small>Update the exact timer continuously when it is shown.</small></span><input type="checkbox" checked={preferences.liveCounter} onChange={(event) => void updatePreferences({ liveCounter: event.target.checked })} /></label>
        <label className="toggle-row discreet-row"><span><strong><EyeOff size={15} /> Discreet display</strong><small>Hide exact sobriety duration and sensitive headings from casual view.</small></span><input type="checkbox" checked={preferences.discreetMode} onChange={(event) => void updatePreferences({ discreetMode: event.target.checked })} /></label>
        <div className="form-grid"><label className="field-label" htmlFor="garden-style">Living Garden style<select id="garden-style" value={preferences.gardenStyle} onChange={(event) => void updatePreferences({ gardenStyle: event.target.value as 'woodland' | 'desert-bloom' })}><option value="woodland">Woodland</option><option value="desert-bloom">Desert bloom</option></select></label></div>
      </section>

      <section className="card"><div className="card-header"><div><p className="eyebrow">Only if you choose</p><h2>Gentle reminders</h2><p>Neutral wording. No guilt or recovery details in notifications.</p></div></div>
        <label className="toggle-row"><span><strong>Daily meditation reminder</strong><small>{notificationPermission === 'unsupported' ? 'Not available on this browser or mobile host.' : 'Optional. While Stillpoint is open; reliable closed-app delivery varies by browser and device.'}</small></span><input type="checkbox" checked={preferences.reminderEnabled} disabled={notificationPermission === 'unsupported'} onChange={(event) => void enableReminder(event.target.checked)} /></label>
        <label className="field-label" htmlFor="reminder-time">Daily meditation reminder time</label><input id="reminder-time" type="time" value={preferences.reminderTime} onChange={(event) => void updatePreferences({ reminderTime: event.target.value })} />
      </section>

      <section className="card"><div className="card-header"><div><p className="eyebrow">People you choose</p><h2>Trusted contacts</h2><p>Keep a private contact list or outreach reminder. Stillpoint will never message or call anyone.</p></div><HeartHandshake size={20} aria-hidden="true" /></div>
        <label className="field-label" htmlFor="trusted-contacts">Names and contact details <span className="optional-label">One per line · max 20</span></label><textarea id="trusted-contacts" rows={4} maxLength={4000} value={contactsText} onChange={(event) => setContactsText(event.target.value)} placeholder="A trusted person, sponsor, friend, or support contact" /><button className="button button-secondary" onClick={() => void saveContacts()}>Save contacts locally</button>
        <div className="support-resource-editor"><h3>Recovery support resources</h3><p className="fine-print">Add names, meeting notes, phone numbers, or links you choose. Stillpoint does not verify or contact these resources.</p><label className="field-label" htmlFor="support-resources">Resource notes <span className="optional-label">One per line · max 20</span></label><textarea id="support-resources" rows={4} maxLength={4000} value={resourcesText} onChange={(event) => setResourcesText(event.target.value)} placeholder="A local meeting, provider, hotline, or other resource you trust" /><button className="button button-secondary" onClick={() => void saveResources()}>Save resources locally</button></div>
      </section>

      <section className="card"><div className="card-header"><div><p className="eyebrow">Your private playbook</p><h2>Personal Recovery Field Guide</h2><p>Review triggers, strategies and reflections you choose to record. This tool does not predict or diagnose anything.</p></div></div><Link to="/field-guide" className="button button-secondary">Open Field Guide</Link></section>

      <section className="card"><div className="card-header"><div><p className="eyebrow">Your information belongs to you</p><h2>Backup & restore</h2><p>To move between devices, download a backup here, transfer the JSON file using a private method you trust, then choose Restore from JSON on the other device. Stillpoint does not upload or sync the file.</p></div></div>
        <div className="backup-actions"><button className="button button-primary" disabled={busy} onClick={() => void exportBackup()}><Download size={16} /> Download JSON backup</button><button className="button button-secondary" disabled={busy} onClick={() => inputRef.current?.click()}><FileUp size={16} /> Restore from JSON</button><input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" aria-label="Select Stillpoint JSON backup" onChange={(event) => void restoreBackup(event.target.files?.[0])} /></div>
        <p className="fine-print">Restore previews record counts before confirmation. Preferences and the recovery profile replace their local values; other records merge by ID, duplicates are kept as-is, and existing records are not cleared.</p>
        <p className="fine-print">Backup files are ordinary, unencrypted JSON and may contain journals, recovery dates and other sensitive details. Keep them private and use a transfer method you trust.</p>
        <p className="fine-print">Date-only recovery dates are interpreted as local midnight on the date selected. Travel and time-zone changes may affect the local clock display; the saved start instant remains the source for elapsed time.</p>
        <p className="storage-note"><ShieldCheck size={16} /> Stored in this browser profile on this device · {storageUse} · not encrypted. Clearing site data, removing the browser profile, or uninstalling may erase it.</p>
      </section>

      <section className="card danger-zone"><div className="card-header"><div><p className="eyebrow">Only if you choose</p><h2>Delete local Stillpoint data</h2><p>Remove this app’s saved information from this browser. It cannot be recovered unless you have a backup.</p></div></div><button className="button button-danger" disabled={busy} onClick={() => void deleteAll()}><Trash2 size={16} /> Permanently delete all data</button></section>
      <p className="fine-print">Stillpoint is a personal recovery companion, not a clinical monitoring system or emergency service. Prayer and meditation do not replace medical care, professional treatment or peer support.</p>
    </div>
  );
}
