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

The test suite uses Vitest with a JSDOM environment and Testing Library. Coverage includes date and timer math, achievement rules, backup validation and merge behavior, share previews, content integrity, dialog focus, ambient audio, external-resource cards, meeting filters, and Box Breathing sphere-path calculations.

## Coverage workflow

`.github/workflows/coverage.yml` runs on pushes to `main`, pull requests, manual dispatch, and every Monday at 08:47 UTC. It runs all Vitest tests with the V8 provider, scopes instrumentation to `src/**/*.{ts,tsx}`, writes text/HTML/JSON-summary reports, adds line/branch/function percentages to the GitHub job summary, and uploads the complete `coverage/` directory as a 14-day artifact. The workflow reports coverage without enforcing a threshold, so coverage can improve incrementally without masking a failing test suite.

## Failure notifications

`.github/workflows/notify-failures.yml` listens for completed runs of CI, Test coverage, and Documentation links. For a failure, cancellation, or timeout, it creates one deduplicated GitHub issue per workflow and adds later failure-run comments to that issue. A successful follow-up run comments with the recovery run and closes the alert. This provides repository-native notifications for broken links and other automated quality failures without requiring an external mail or chat credential.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It:

1. Installs the pinned pnpm version with Node.js 22.
2. Restores the pnpm dependency cache.
3. Runs typecheck, lint, and tests.
4. Builds the production PWA.
5. Verifies `index.html`, the standalone manifest, service worker, and a non-empty precache manifest.
6. Uploads `dist/` as a short-retention build artifact.

The workflow has read-only repository permissions, cancels superseded runs on the same ref, and does not publish or deploy automatically. Deployment should be a separate, explicitly authorized workflow.

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
