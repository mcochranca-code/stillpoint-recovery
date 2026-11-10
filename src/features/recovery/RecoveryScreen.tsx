import { useEffect, useId, useRef, useState } from 'react';
import { Download, FileUp, Leaf, RotateCw, Trash2 } from 'lucide-react';
import { downloadJsonBackup, importBackupText, inspectBackupText, MAX_BACKUP_FILE_BYTES } from '../../db/backup';
import { describeStorageFailure, exportReadableData, resetLocalDatabase, retryOpenLocalDatabase, type StorageFailure } from '../../db/storageHealth';
import { logDiagnostic } from '../../platform/diagnostics';

export const RESET_CONFIRMATION_WORD = 'RESET';

interface RecoveryScreenProps {
  failure: StorageFailure;
  /** Ask the app to open local storage again (remounts the data layer). */
  onRetry: () => void;
}

/**
 * Shown instead of the app when local storage cannot be opened. Every action here is explicit:
 * nothing is cleared or replaced unless the person chooses it, and reset needs a typed confirmation.
 */
export function RecoveryScreen({ failure, onRetry }: RecoveryScreenProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resetHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmId = useId();

  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => { if (resetOpen) resetHeadingRef.current?.focus(); }, [resetOpen]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    finally { setBusy(false); }
  }

  const exportReadable = () => run(async () => {
    try {
      const result = await exportReadableData();
      downloadJsonBackup(result.payload);
      setStatus(result.unreadableStores.length
        ? `A backup with what could be read was downloaded. ${result.unreadableStores.length} section(s) could not be read and are not in it. Keep the file private.`
        : 'A backup of your local records was downloaded. Keep the file private.');
    } catch {
      setStatus('Nothing could be read from local storage, so no backup was created. Your records have not been changed.');
    }
  });

  const restore = (file?: File) => run(async () => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_FILE_BYTES) throw new Error('This backup is larger than the supported 15 MB limit.');
      try { await retryOpenLocalDatabase(); }
      catch { throw new Error('Restoring needs local storage to open first. Try again later, or export what can be read and reset as a last resort before restoring.'); }
      const text = await file.text();
      const preview = await inspectBackupText(text);
      if (!window.confirm(`Restore ${preview.readyToImport} record(s) from ${file.name}? Settings in the backup replace current settings; other records are added alongside what is already here.`)) {
        setStatus('Restore cancelled. Nothing was changed.');
        return;
      }
      const result = await importBackupText(text);
      setStatus(`Backup restored: ${result.imported} record(s) added or restored.`);
      onRetry();
    } catch (error) {
      logDiagnostic({ level: 'error', event: 'restore-failed', error });
      setStatus(error instanceof Error ? error.message : 'The backup could not be restored.');
    }
  });

  const reset = () => run(async () => {
    if (typed.trim().toUpperCase() !== RESET_CONFIRMATION_WORD) return;
    try {
      await resetLocalDatabase({ confirmed: true });
      setStatus('Local data was reset. Stillpoint will start fresh.');
      onRetry();
    } catch {
      setStatus('Local data could not be reset. Close other Stillpoint tabs and try again.');
    }
  });

  return (
    <main className="storage-error recovery-screen" aria-labelledby="recovery-heading">
      <Leaf size={34} aria-hidden="true" />
      <h1 id="recovery-heading" ref={headingRef} tabIndex={-1}>Your local space needs a moment</h1>
      <p>{describeStorageFailure(failure.kind)}</p>
      <p>Stillpoint has not cleared or replaced anything. Your records stay on this device unless you choose otherwise.</p>
      <div className="recovery-actions">
        <button type="button" className="button button-primary" disabled={busy} onClick={onRetry}><RotateCw size={16} aria-hidden="true" /> Try again</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void exportReadable()}><Download size={16} aria-hidden="true" /> Download what can be read</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => fileRef.current?.click()}><FileUp size={16} aria-hidden="true" /> Restore from a backup</button>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" aria-label="Select a Stillpoint JSON backup to restore" onChange={(event) => void restore(event.target.files?.[0])} />
      </div>
      <p className="fine-print">Try closing other Stillpoint tabs first, then choose Try again. Backups are unencrypted JSON; keep them private. Support never needs your journal text or backup files.</p>
      <p className="fine-print">Technical detail for support: {failure.errorName}.</p>
      {!resetOpen
        ? <button type="button" className="button button-danger" disabled={busy} onClick={() => setResetOpen(true)}><Trash2 size={16} aria-hidden="true" /> Reset local data…</button>
        : (
          <section className="card danger-zone recovery-reset" aria-labelledby="recovery-reset-heading">
            <h2 id="recovery-reset-heading" ref={resetHeadingRef} tabIndex={-1}>Reset local data (last resort)</h2>
            <p>This permanently deletes every Stillpoint record in this browser. It cannot be undone. Download what can be read first if you want to keep anything.</p>
            <button type="button" className="button button-secondary" disabled={busy} onClick={() => void exportReadable()}><Download size={16} aria-hidden="true" /> Download what can be read first</button>
            <label className="field-label" htmlFor={confirmId}>Type {RESET_CONFIRMATION_WORD} to confirm</label>
            <input id={confirmId} type="text" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />
            <div className="recovery-actions">
              <button type="button" className="button button-danger" disabled={busy || typed.trim().toUpperCase() !== RESET_CONFIRMATION_WORD} onClick={() => void reset()}>Permanently reset local data</button>
              <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setResetOpen(false); setTyped(''); }}>Keep my data</button>
            </div>
          </section>
        )}
      <p className="recovery-status" role="status" aria-live="polite">{status}</p>
    </main>
  );
}
