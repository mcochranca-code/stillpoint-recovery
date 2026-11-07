# ADR 0003: Separate feature UI, domain rules, and persistence

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Feature work spans UI, deterministic recovery rules, IndexedDB persistence, bundled content, and optional browser APIs. Direct dependencies between feature pages make shared behavior difficult to test and increase the chance of inconsistent privacy or accessibility behavior.

## Decision

Keep the source ownership boundaries documented in the [Architecture guide](../wiki/Architecture.md): UI belongs in app/features/components; deterministic and cross-feature policy belongs in `src/domain/`; schema, migrations, repositories, and backup integrity belong in `src/db/`; static content and provenance belong in `src/data/`; routing and browser capabilities belong in the app/platform/PWA layer. Avoid feature-to-feature imports. Share behavior through typed domain functions or narrow repository APIs.

## Consequences

- Domain behavior can be tested without rendering React.
- Persistence behavior, including migrations and transactions, can be tested with IndexedDB fakes.
- UI tests should verify accessible behavior and user-visible outcomes rather than duplicating domain policy.
- Cross-cutting changes require coordination at a defined interface and tests at the affected boundary.
- A new module or server dependency should have an explicit owner and rationale.

## Alternatives considered

| Option | Assessment |
| --- | --- |
| Organize all logic by screen | Rejected because domain and persistence policy would be duplicated across screens. |
| Add a broad shared utility layer | Rejected because loosely owned utilities tend to become hidden dependencies; use a domain or repository owner instead. |
