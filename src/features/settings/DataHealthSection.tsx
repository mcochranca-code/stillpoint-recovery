import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ClipboardCopy, Stethoscope } from 'lucide-react';
import { db } from '../../db/database';
import { quarantineRecords, repairRecords, scanLocalData, type IntegrityReport } from '../../db/integrity';
import { clearDiagnostics, formatDiagnostics, readDiagnostics, type DiagnosticEntry } from '../../platform/diagnostics';

/** `journalEntries` → `journal entries`. */
export function storeLabel(store: string): string {
  return store.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

interface DataHealthSectionProps {
  notify: (message: string) => void;
  disabled?: boolean;
}

/**
 * Settings → Data health. The check is read-only. Repair and quarantine each ask for confirmation,
 * keep the original records in a local quarantine that backups include, and never delete silently.
 */
export function DataHealthSection({ notify, disabled = false }: DataHealthSectionProps) {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [working, setWorking] = useState(false);
  const [entries, setEntries] = useState<DiagnosticEntry[]>(() => readDiagnostics());
  const quarantined = useLiveQuery(() => db.quarantine.count().catch(() => 0), []) ?? 0;
  const busy = disabled || working;

  async function scan(): Promise<IntegrityReport | null> {
    setWorking(true);
    try {
      const next = await scanLocalData();
      setReport(next);
      return next;
    } catch {
      notify('The data check could not finish. Your records were not changed.');
      return null;
    } finally {
      setEntries(readDiagnostics());
      setWorking(false);
    }
  }

  async function checkNow() {
    const next = await scan();
    if (!next) return;
    const { repairable, unreadable, readFailedStores } = next.totals;
    notify(repairable || unreadable || readFailedStores
      ? 'The data check found records that need attention. Nothing has been changed.'
      : 'Your local records look healthy.');
  }

  async function repair() {
    if (!report?.totals.repairable) return;
    if (!window.confirm(`Repair ${plural(report.totals.repairable, 'record')}? Missing or invalid fields will be filled with safe defaults. A copy of each original is kept in quarantine and included in your backups.`)) return;
    setWorking(true);
    try {
      const count = await repairRecords(report, { confirmed: true });
      notify(`${plural(count, 'record')} repaired. The originals are kept in quarantine.`);
    } catch {
      notify('The repair could not be completed, so nothing was changed. Please try again.');
    } finally {
      setWorking(false);
    }
    await scan();
  }

  async function quarantine() {
    if (!report?.totals.unreadable) return;
    if (!window.confirm(`Move ${plural(report.totals.unreadable, 'unreadable record')} to quarantine? They will no longer appear in the app, but they are kept unchanged on this device and included in your JSON backups.`)) return;
    setWorking(true);
    try {
      const count = await quarantineRecords(report, { confirmed: true });
      notify(`${plural(count, 'record')} moved to quarantine. Nothing was deleted.`);
    } catch {
      notify('The records could not be moved, so nothing was changed. Please try again.');
    } finally {
      setWorking(false);
    }
    await scan();
  }

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(formatDiagnostics(entries));
      notify('The diagnostics log was copied. It contains no journal text or record contents.');
    } catch {
      notify('The log could not be copied automatically. You can select the text and copy it instead.');
    }
  }

  function clearLog() {
    if (!window.confirm('Clear the diagnostics log on this device? This does not affect your recovery records.')) return;
    clearDiagnostics();
    setEntries([]);
    notify('The diagnostics log was cleared.');
  }

  const attention = report ? report.stores.filter((store) => store.repairable || store.unreadable || store.readFailed) : [];

  return (
    <section className="card" id="data-health" aria-labelledby="data-health-heading">
      <div className="card-header"><div><p className="eyebrow">Look after your records</p><h2 id="data-health-heading">Data health</h2><p>Check that the records saved on this device can be read. The check only reads; nothing changes unless you confirm it. Nothing is sent anywhere.</p></div><Stethoscope size={20} aria-hidden="true" /></div>
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => void checkNow()}><Activity size={16} aria-hidden="true" /> Check my data</button>
      <div aria-live="polite">
        {report && (
          <div className="data-health-results">
            <p><strong>{plural(report.totals.total, 'record')} checked.</strong> {report.totals.ok} look fine, {report.totals.repairable} can be repaired, {report.totals.unreadable} {report.totals.unreadable === 1 ? 'is' : 'are'} unreadable{report.totals.readFailedStores ? `, and ${plural(report.totals.readFailedStores, 'section')} could not be read` : ''}.</p>
            {attention.length > 0 && (
              <ul className="data-health-summary" aria-label="Sections that need attention">
                {attention.map((store) => (
                  <li key={store.store}>
                    {store.readFailed
                      ? `${storeLabel(store.store)}: could not be read (left unchanged)`
                      : `${storeLabel(store.store)}: ${store.repairable} repairable, ${store.unreadable} unreadable`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {report && (report.totals.repairable > 0 || report.totals.unreadable > 0) && (
        <div className="backup-actions">
          {report.totals.repairable > 0 && <button type="button" className="button button-primary" disabled={busy} onClick={() => void repair()}>Repair {plural(report.totals.repairable, 'record')}…</button>}
          {report.totals.unreadable > 0 && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void quarantine()}>Move {plural(report.totals.unreadable, 'unreadable record')} to quarantine…</button>}
        </div>
      )}
      <p className="fine-print">{quarantined ? `${plural(quarantined, 'record')} in quarantine on this device. They are included when you download a JSON backup.` : 'No records are in quarantine.'} Download a backup before repairing if you want an extra copy.</p>
      <details className="data-health-diagnostics">
        <summary>Diagnostics log ({plural(entries.length, 'entry', 'entries')})</summary>
        <p className="fine-print">A short local record of storage warnings and errors: event names, section names, error types, counts and times. It never contains journal text, recovery dates or other record contents, and it is never sent anywhere. You can copy it into a support conversation if you choose.</p>
        <pre className="data-health-log" tabIndex={0} aria-label="Diagnostics log entries">{formatDiagnostics(entries)}</pre>
        <div className="backup-actions">
          <button type="button" className="button button-secondary" onClick={() => void copyLog()}><ClipboardCopy size={16} aria-hidden="true" /> Copy log</button>
          <button type="button" className="button button-secondary" disabled={!entries.length} onClick={clearLog}>Clear log</button>
        </div>
      </details>
    </section>
  );
}
