# ADR 0001: Keep personal recovery data local-first

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Stillpoint handles recovery dates, journals, intentions, support notes, and activity history. Routine app features should not require an account or transmit this data to a service. Browser storage has real limits: it is not encrypted by Stillpoint, can be removed by the browser or user, and is not recoverable by maintainers.

## Decision

The browser's IndexedDB database is the system of record for personal app data. Core app flows do not depend on a server, analytics, account, or cloud sync. Optional external visits happen only after a user action and must disclose the information shared with that destination. The optional hosted community is separate and must accept only its documented, user-submitted public note fields.

## Consequences

- Features remain usable offline after the app shell and required assets are cached.
- Clearing site data, losing the browser profile/device, or storage corruption can make personal records unavailable.
- Stillpoint must not imply encryption, guaranteed recovery, or clinical monitoring.
- Users need clear risk messaging and a user-controlled backup/restore path.
- New remote features require a privacy review and an ADR describing the data sent, recipient, retention, and opt-in behavior.

## Alternatives considered

| Option | Assessment |
| --- | --- |
| Central account and cloud database | Rejected for core records because it adds a sensitive server copy, identity and breach risks, and a service dependency. |
| Local-first with optional manual export | Accepted; preserves the local default while allowing user-controlled transfer and recovery. |
