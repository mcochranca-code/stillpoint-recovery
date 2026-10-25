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

## Optional interactive meeting map

The bundled coordinate manifest was derived from public AA/NA meeting-address text using the U.S. Census Geocoder’s `Public_AR_Current` address-range benchmark. Only results marked `Match, Exact` were included. Those coordinates are still interpolated along Census address ranges and may not mark a building entrance. Online listings and non-exact, tied or unmatched addresses are omitted. Stillpoint does not contact the Census Geocoder at runtime; confirm meeting details and entrances with the official listing.

The interactive map component is mounted only after the user selects “Load interactive map.” Its JavaScript and styles are ordinary bundled app assets and may be precached with the PWA, but no OpenStreetMap tile request is made until that choice. The browser then requests the visible tile images from the OpenStreetMap standard tile server. The tile service may receive the visitor’s IP address, ordinary request metadata and the approximate map area; the area may correlate with the locally filtered results. Tile requests do not include the filter values, search text, recovery information or device location. Stillpoint never requests geolocation.

The service worker bypasses cross-origin resources, so OpenStreetMap tiles are not stored by the app and the map tiles are unavailable offline. The local meeting list remains available offline. The map displays OpenStreetMap attribution; see its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and [copyright/attribution page](https://www.openstreetmap.org/copyright).
