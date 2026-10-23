# Data and Privacy

## Local storage model

Recovery dates, preferences, journals, drafts, reflections, scripture activity, meditation sessions, earned charms, goals, milestones, garden-related progress, field-guide notes, reset records, and related metadata are stored in the browser’s `StillpointRecovery` IndexedDB database through Dexie.

The app does not require an account, cloud sync, analytics tracker, advertising service, or recovery-data API. The service worker caches app assets, not a remote recovery profile.

## Important limitation

Local does not mean encrypted. Browser storage and exported backups can be accessed by someone who can access the device or browser profile. Clearing site data or uninstalling the PWA can remove local records. Keep exported backups somewhere private and make them regularly.

Stillpoint does not claim device encryption, an app lock, secure messaging, or guaranteed data recovery.

## Backup and restore

A backup is a versioned JSON object containing the local tables and an export timestamp. Imports:

1. Parse JSON and reject malformed files.
2. Check the application identifier and supported schema version.
3. Validate records by table-specific rules and size limits.
4. Merge valid records in a read/write transaction.
5. Skip duplicate IDs and report invalid records instead of inserting them.

Restoring is explicit and local. It does not upload the file.

## External resources

The NA World Services Just for Today link and Our Daily Bread links are opened only after a user click. Stillpoint does not copy, cache, proxy, or rehost those publisher readings. An external visit is subject to the publisher’s own privacy, cookies, analytics, and terms practices.

Trusted contacts are user-entered. The app never sends a message or places a call automatically.
