# ADR 0002: Use versioned JSON backups with validated transactional restore

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Users need a way to move and recover local data without automatic synchronization. Importing malformed or incompatible data must not partially overwrite the current database.

## Decision

Export a versioned JSON document with an application identifier, schema version, export timestamp, supported personal-data table records, and SHA-256 checksum. Exclude optional community deletion credentials because they are sensitive capabilities and should not be portable. Validate the container, checksum when present, and every record before a single IndexedDB read/write transaction. Preferences and the recovery profile are replaceable singleton records; other supported records, including meeting reminders, merge by ID. Invalid records and duplicates are counted in a read-only preview and the final result. Older supported backups without checksums remain importable for compatibility.

## Consequences

- Restore impact is visible and confirmed by the user before writes begin.
- Transaction failure leaves existing data unchanged.
- JSON is not encrypted; checksums detect accidental modification, not authorship or malicious tampering.
- Backward-compatible readers must remain available for supported backup versions; incompatible newer versions are rejected without writes.
- A new database schema version needs migration tests and a corresponding backup compatibility decision.

## Alternatives considered

| Option | Assessment |
| --- | --- |
| Replace the entire database on import | Rejected because a partial or old backup could destroy records not included in the file. |
| Merge records without a transaction or preview | Rejected because failures could leave partial state and users would not see conflicts first. |
| Encrypted proprietary archive | Deferred; would require a key-management and recovery design beyond local backup integrity. |
