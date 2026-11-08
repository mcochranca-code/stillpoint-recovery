# Testing and CI

## Local checks

Run the same checks as CI before opening a pull request:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

The test suite uses Vitest with a JSDOM environment, fake IndexedDB, and Testing Library. Coverage includes date and timer math, achievement rules and persistence, daily activity mutation, reached-milestone idempotence, journal entry creation/editing/deletion and draft recovery, backup validation/transaction rollback/merge/deletion, IndexedDB migration from historical schema versions, share previews, content integrity, dialog keyboard/focus behavior, navigation, reduced-motion settings, ambient audio, external-resource cards, meeting filters, and Box Breathing sphere-path calculations.

## Coverage workflow

`.github/workflows/coverage.yml` runs on pushes to `main`, pull requests, manual dispatch, and every Monday at 08:47 UTC. Vitest enforces repository-wide floors of 80% statements and lines, 70% branches, and 55% functions. `pnpm check:coverage` also enforces stronger file-specific floors for IndexedDB/backup, domain date and journal rules, onboarding, and the journal, meditation, and Today flows. The workflow writes text/HTML/JSON-summary reports, adds line/branch/function percentages to the GitHub job summary, and uploads the complete `coverage/` directory as a 14-day artifact. Raise thresholds when coverage grows; do not lower them just to bypass a failing check.

The production PWA verification script checks the standalone manifest, route metadata, same-origin precache entries, cached root app shell, and service-worker navigation fallback. These checks protect the generated offline shell and install metadata; they do not promise that uncached external pages or map tiles work without a network.

`.github/workflows/accessibility.yml` runs Lighthouse accessibility audits on pull requests and pushes to `main`, with a minimum 0.90 accessibility score for the production app-shell route. Vitest keyboard tests separately cover navigation, dialog focus trapping, Escape handling, and reduced-motion preference controls. Follow the [accessibility regression checklist](Accessibility-Validation.md); Lighthouse is an automated signal, not a substitute for manual screen-reader, keyboard, contrast, and reduced-motion review.

## Failure notifications

`.github/workflows/notify-failures.yml` listens for completed runs of CI, Test coverage, and Documentation links. For a failure, cancellation, or timeout, it creates one deduplicated GitHub issue per workflow and adds later failure-run comments to that issue. A successful follow-up run comments with the recovery run and closes the alert. This provides repository-native notifications for broken links and other automated quality failures without requiring an external mail or chat credential.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It:

1. Installs the pinned pnpm version with Node.js 22.
2. Restores the pnpm dependency cache.
3. Runs typecheck, lint, and tests.
4. Builds the production PWA.
5. Runs `pnpm verify:pwa`, which validates `index.html`, the standalone manifest, route manifest, service worker, and non-empty precache manifest.
6. Uploads `dist/` as a short-retention build artifact.

The workflow has read-only repository permissions, cancels superseded runs on the same ref, and uploads a build artifact. Netlify is connected directly to the repository's `main` branch and performs its own production build/deploy on a new main commit. The Netlify build is provider-native; it does not depend on a repository deploy token or duplicate GitHub deploy action. GitHub CI and the Netlify build are independent and may finish at different times.

The production build uses Vite's production mode; the tests run in Vitest's test environment. Netlify builds the committed source with the pnpm version pinned by the project manifest and publishes `dist/`.

## Manus Webdev source boundary

The Manus Webdev copy uses its own Manus-managed canonical repository. In this setup, the supported repository workflow cannot adopt the existing GitHub repository as the Manus project's canonical source. A change pushed to GitHub therefore does not automatically update the Manus copy: explicitly synchronize the source and save a Manus checkpoint separately. Netlify's GitHub connection covers Netlify deployments only; it does not synchronize Manus.

## Documentation link checks

Run the repository-native checker with:

```sh
node scripts/check-documentation-links.mjs
```

The checker scans Markdown in the README, TODO/plan files, wiki, and copyright directory. It verifies local files and Wiki-style `.md` references, same-file and cross-file anchors, PDF `#page=` targets, the 366-entry Just for Today index, required NA attribution and MIT/non-affiliation notices, and external HTTP(S) URLs with three attempts and a timeout. It fails on missing local references, invalid PDF page targets, missing rights notices, and confirmed broken external links; access-restricted responses such as 401, 403, and 429 are reported as warnings.

The separate [`documentation-links.yml`](../../.github/workflows/documentation-links.yml) workflow runs on documentation changes, pull requests, manual dispatch, and every Monday at 08:17 UTC. It installs `poppler-utils` when needed so PDF page bounds are checked in CI.

## Interpreting failures

- Type errors usually indicate a contract mismatch in `src/domain/`, `src/db/`, or a feature component.
- Lint failures commonly come from unused imports, hook dependency changes, or accessibility-related JSX edits.
- Test failures should be fixed at the behavior boundary rather than bypassed with weaker assertions.
- Build verification failures mean the generated PWA artifact is incomplete and should block delivery.
