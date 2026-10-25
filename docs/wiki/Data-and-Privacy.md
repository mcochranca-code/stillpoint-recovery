# Data and Privacy

## Local storage model

Recovery dates, preferences, journals and drafts, reflections, scripture activity, meditation sessions, earned charms, goals, milestones, garden-related progress, field-guide notes, reset records, and related metadata are stored in the `StillpointRecovery` IndexedDB database for the Stillpoint site in the current browser profile on the current device. The database is managed by the browser through Dexie; it is not a file that Stillpoint can access outside that browser profile.

The app does not require an account, cloud sync, analytics tracker, advertising service, or recovery-data API. The service worker caches app assets, not a remote recovery profile.

## Storage and data-loss risks

Local does not mean encrypted. Stillpoint does not encrypt the IndexedDB database or its exported backups. Someone with access to the device or browser profile may be able to access saved records. Browser storage is also subject to the browser’s own storage limits and lifecycle; browser or device maintenance, storage pressure, profile removal, or site-data clearing can make records unavailable or remove them.

Clearing site data for Stillpoint, removing the browser profile, or uninstalling the PWA may remove local records. Uninstall behavior varies by browser and platform, so do not rely on the app remaining installed as a backup. Deleting all local Stillpoint data in Settings is permanent unless a backup exists. Changes to a recovery date do not delete journals, sessions, or charms.

Exported backups are ordinary JSON files containing personal data. Save them somewhere private and protected by the device or storage service you choose, and make a fresh backup regularly. A backup kept only on the same device may be lost with that device.

Stillpoint does not claim device encryption, an app lock, secure messaging, or guaranteed data recovery. Because the app has no account or server copy, the project maintainers cannot retrieve or restore records that have been cleared, lost, or corrupted. Recovery is possible only from a valid backup that the user still has. Support can offer troubleshooting guidance, but should not be sent journal text, backups, or other sensitive records.

## Backup and restore

A backup is a versioned JSON object containing the local tables and an export timestamp. Imports:

1. Parse JSON and reject malformed files.
2. Check the application identifier and supported schema version.
3. Validate records by table-specific rules and size limits.
4. Merge valid records in a read/write transaction.
5. Skip duplicate IDs and report invalid records instead of inserting them.

Restoring is explicit and local. It does not upload the file.

Import validates supported backups before writing and merges records in a transaction. Records with duplicate IDs are skipped; profile and preferences from the backup are restored. Import is not a substitute for keeping a separate copy of the backup file.

## External resources

The NA World Services Just for Today link and Our Daily Bread links are opened only after a user click. Stillpoint does not copy, cache, proxy, or rehost those publisher readings. An external visit is subject to the publisher’s own privacy, cookies, analytics, and terms practices.

Trusted contacts are user-entered. The app never sends a message or places a call automatically.
