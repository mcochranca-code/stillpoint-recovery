import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellRing, Download, MonitorSmartphone } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { getTodayCheckIn } from '../../db/checkIns';
import { createBackup, downloadJsonBackup } from '../../db/backup';
import { db } from '../../db/database';
import { pickTodayNudge, shouldNudgeBackup, shouldOfferInstall, shouldOfferReminder, snoozeUntil } from '../../domain/engagement';
import { canPromptInstall, isRunningStandalone, promptInstall, subscribeInstallPrompt } from '../../platform/installPrompt';
import { readLocalSignal, requestPersistentStorage, writeLocalSignal } from '../../platform/localSignals';
import { getNotificationPermission, requestNotificationPermission, type NotificationPermissionStatus } from '../../platform/notificationPermissions';

/**
 * At most one optional, dismissible card on Today, each shown only after a
 * meaningful moment: a reminder offer after the first check-in, a backup nudge
 * once there is something worth keeping, and an install offer on a return visit.
 */
export function TodayNudge() {
  const { preferences, updatePreferences, notify } = useAppContext();
  const [permission, setPermission] = useState<NotificationPermissionStatus>('unsupported');
  const [reminderTime, setReminderTime] = useState(preferences?.reminderTime ?? '19:00');
  const [busy, setBusy] = useState(false);
  const [signalsVersion, setSignalsVersion] = useState(0);
  const canInstall = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false);
  const checkedInToday = Boolean(useLiveQuery(() => getTodayCheckIn(), []));
  const activeDays = useLiveQuery(() => db.dailyActivity.count(), []) ?? 0;
  const savedRecords = useLiveQuery(async () => (await db.journalEntries.count()) + (await db.meditationSessions.where('status').equals('completed').count()), []) ?? 0;

  useEffect(() => {
    let active = true;
    void Promise.resolve(getNotificationPermission()).then((value) => { if (active) setPermission(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const now = new Date();
  void signalsVersion;
  const nudge = pickTodayNudge({
    reminder: shouldOfferReminder({ reminderEnabled: Boolean(preferences?.reminderEnabled), permission, checkedInToday, snoozedUntil: readLocalSignal('reminderOfferSnoozedUntil'), now }),
    backup: shouldNudgeBackup({ savedRecords, lastBackupAt: readLocalSignal('lastBackupAt'), snoozedUntil: readLocalSignal('backupNudgeSnoozedUntil'), now }),
    install: shouldOfferInstall({ canPrompt: canInstall, isStandalone: isRunningStandalone(), activeDays, snoozedUntil: readLocalSignal('installOfferSnoozedUntil'), now }),
  });
  if (!nudge) return null;

  const snooze = (key: 'reminderOfferSnoozedUntil' | 'backupNudgeSnoozedUntil' | 'installOfferSnoozedUntil') => {
    writeLocalSignal(key, snoozeUntil(new Date()));
    setSignalsVersion((value) => value + 1);
  };

  async function enableReminder() {
    setBusy(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        await updatePreferences({ reminderEnabled: true, reminderTime });
        notify('A gentle daily reminder is on. You can change or turn it off in Settings.');
      } else {
        snooze('reminderOfferSnoozedUntil');
        notify('Reminders were not turned on. That’s completely fine—you can choose again in Settings.');
      }
    } finally { setBusy(false); }
  }

  async function backUpNow() {
    setBusy(true);
    try {
      downloadJsonBackup(await createBackup());
      writeLocalSignal('lastBackupAt', new Date().toISOString());
      setSignalsVersion((value) => value + 1);
      void requestPersistentStorage();
      notify('Your private backup has been downloaded. Keep the file somewhere only you can reach.');
    } catch {
      notify('The backup could not be created. Check browser storage and try again.');
    } finally { setBusy(false); }
  }

  async function install() {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        void requestPersistentStorage();
        notify('Stillpoint is installed on this device. Your data stays right here.');
      } else snooze('installOfferSnoozedUntil');
    } finally { setBusy(false); }
  }

  if (nudge === 'reminder') return (
    <section className="card today-nudge" aria-labelledby="today-nudge-title">
      <span className="today-nudge__icon" aria-hidden="true"><BellRing size={19} /></span>
      <div className="today-nudge__copy">
        <p className="eyebrow">Only if it would help</p>
        <h2 id="today-nudge-title">Would a gentle daily reminder help?</h2>
        <p className="muted">One neutral note a day, with no recovery details in it. Your browser will ask for permission first.</p>
        <div className="today-nudge__row">
          <label className="field-label" htmlFor="nudge-reminder-time">Reminder time</label>
          <input id="nudge-reminder-time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
        </div>
        <div className="action-row">
          <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => void enableReminder()}>Turn on reminder</button>
          <button type="button" className="button button-quiet button-small" onClick={() => snooze('reminderOfferSnoozedUntil')}>Not now</button>
        </div>
      </div>
    </section>
  );

  if (nudge === 'backup') return (
    <section className="card today-nudge" aria-labelledby="today-nudge-title">
      <span className="today-nudge__icon" aria-hidden="true"><Download size={19} /></span>
      <div className="today-nudge__copy">
        <p className="eyebrow">Your words are worth keeping</p>
        <h2 id="today-nudge-title">Keep a private copy of what you’ve saved.</h2>
        <p className="muted">Everything lives only in this browser. A backup file protects it if site data is cleared or you change devices. The file is not encrypted, so store it somewhere private.</p>
        <div className="action-row">
          <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => void backUpNow()}><Download size={14} aria-hidden="true" /> Download backup</button>
          <button type="button" className="button button-quiet button-small" onClick={() => snooze('backupNudgeSnoozedUntil')}>Not now</button>
        </div>
      </div>
    </section>
  );

  return (
    <section className="card today-nudge" aria-labelledby="today-nudge-title">
      <span className="today-nudge__icon" aria-hidden="true"><MonitorSmartphone size={19} /></span>
      <div className="today-nudge__copy">
        <p className="eyebrow">Keep it close</p>
        <h2 id="today-nudge-title">Add Stillpoint to this device.</h2>
        <p className="muted">Open it like an app, use it offline, and help your browser keep your saved data. Still no account and nothing sent anywhere.</p>
        <div className="action-row">
          <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => void install()}>Install Stillpoint</button>
          <button type="button" className="button button-quiet button-small" onClick={() => snooze('installOfferSnoozedUntil')}>Not now</button>
        </div>
      </div>
    </section>
  );
}
