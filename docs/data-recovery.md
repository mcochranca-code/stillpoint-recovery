# Data recovery and corruption handling (support guide)

Stillpoint keeps every record in the browser's IndexedDB on the person's own device. There is no server copy, so support cannot see, retrieve or repair anyone's data. This guide explains what the app does when local data cannot be read and how to walk someone through it safely.

Never ask for journal text, backup files, screenshots of private records, or recovery dates. The diagnostics log described below is the only thing the person may choose to share, and it contains none of those.

## Symptoms

- **The app opens to "Your local space needs a moment".** Local storage could not be opened. The screen names a likely cause in plain language and shows a short technical detail (an error name such as `VersionError` or `QuotaExceededError`).
- **One screen shows "This screen could not be shown".** That screen hit a record it could not display. The rest of the app keeps working, and nothing was deleted.
- **A save shows "That change could not be saved, so nothing was changed."** (or a similar message for the recovery date or setup). The write ran in a single transaction and was rolled back, so no half-saved state was left behind.
- **Settings → Data health reports repairable or unreadable records.** The check found records that do not match the shapes Stillpoint expects.

Common causes, matching the recovery screen's explanations:

| What the screen says | Likely cause |
| --- | --- |
| Not letting Stillpoint use local storage | Private or incognito window, site storage turned off, or IndexedDB unavailable |
| Short on storage space | Device or browser storage is full (`QuotaExceededError`) |
| Written by a newer or different version | The saved database is a newer version than the app that is open, or another tab is upgrading it (`VersionError`) |
| Closed or blocked the connection | Another Stillpoint tab, a browser update, or the browser closing the connection (`InvalidStateError`, `DatabaseClosedError`) |
| Could not be opened | Anything else; some data may be unreadable |

## What the recovery screen offers

Nothing on this screen clears or replaces data unless the person chooses it.

1. **Try again.** Closes any failed connection and opens storage again. Suggest closing other Stillpoint tabs first, freeing some device storage if the screen mentioned space, and leaving private browsing if relevant.
2. **Download what can be read.** Saves an ordinary Stillpoint JSON backup of every section that can still be read. If the app's own schema cannot open the database (for example after a version mismatch), the database is read as it is, without upgrading or writing to it. The screen says how many sections could not be read; those are not in the file.
3. **Restore from a backup.** Opens storage, previews the backup, and asks for confirmation before merging it. This uses the same validation as Settings → Backup & restore: malformed files and checksum mismatches are rejected before any write. If storage still will not open, restore cannot run; the screen says so.
4. **Reset local data (last resort).** Opens a separate panel that explains the reset is permanent, offers **Download what can be read first**, and only enables the reset button after the person types `RESET`. Reset deletes this browser's Stillpoint database and on-device markers, then starts fresh. Only a backup can bring records back afterwards.

Recommended order: try again → download what can be read → (if needed) reset → restore the backup.

## Exporting

- From a working app: **Settings → Backup & restore → Download JSON backup**.
- From the recovery screen: **Download what can be read**.

Both produce the same versioned JSON format with a SHA-256 checksum. Files are unencrypted and may contain journals and recovery dates, so remind the person to keep them private. Records that were moved to quarantine are included in backups under their own `quarantine` section; restore does not re-insert them automatically.

## Data health: repair and quarantine

**Settings → Data health → Check my data** reads every local section and checks each record against the same rules used to validate backup restores. It reports, per section, how many records are fine, repairable or unreadable. The check itself never writes anything.

- **Repairable** records are missing fields that have safe defaults (for example an empty tag list), or, for the settings and recovery-profile records, have individual invalid settings that can return to their defaults while every other choice is kept. **Repair** asks for confirmation, saves the repaired records in one transaction, and keeps a copy of each original in quarantine.
- **Unreadable** records cannot be repaired safely. **Move to quarantine** asks for confirmation, then moves each record, unchanged, into a local quarantine table in one transaction. Quarantined records no longer appear in the app, but they stay on the device and are included in JSON backups.

Records are never deleted silently. If a repair or quarantine fails partway, the whole action rolls back. Records that changed since the check (for example, already fixed) are left alone.

## Resetting as a last resort

Reset is available from the recovery screen (typed `RESET` confirmation) and from **Settings → Delete local Stillpoint data** (two confirmations). Before either, encourage the person to download a backup. After a reset, setup begins again, and a backup can be restored from Settings.

## The diagnostics log

**Settings → Data health → Diagnostics log** keeps a short, local-only list of storage warnings and errors so that a person can describe a problem without sharing private data.

What it contains, and nothing else:

- a timestamp and level (`info`, `warning`, `error`);
- an event name from a fixed list (for example `storage-open-failed`, `integrity-scan`, `records-quarantined`, `safe-write-failed`);
- optionally a section or operation name (for example `journalEntries` or `recovery-date`), an error *name* (for example `QuotaExceededError`) and a count.

What it never contains: journal text, record contents, record IDs, recovery dates, error messages, file names or anything typed by the person.

It holds at most 200 entries (oldest dropped first), lives in this browser's localStorage so it still works when IndexedDB cannot open, and is never sent anywhere. The person can view it, copy it to paste into a support conversation if they choose, or clear it (with confirmation). Deleting all local data in Settings clears it too.

## Related

- [Data and Privacy guide](wiki/Data-and-Privacy.md)
- [ADR 0001: local-first storage](adr/0001-local-first-storage.md)
