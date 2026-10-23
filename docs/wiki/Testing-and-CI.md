# Testing and CI

## Local checks

Run the same checks as CI before opening a pull request:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The test suite uses Vitest with a JSDOM environment and Testing Library. Coverage includes date and timer math, achievement rules, backup validation and merge behavior, share previews, content integrity, dialog focus, ambient audio, external-resource cards, meeting filters, and Box Breathing sphere-path calculations.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It:

1. Installs the pinned pnpm version with Node.js 22.
2. Restores the pnpm dependency cache.
3. Runs typecheck, lint, and tests.
4. Builds the production PWA.
5. Verifies `index.html`, the standalone manifest, service worker, and a non-empty precache manifest.
6. Uploads `dist/` as a short-retention build artifact.

The workflow has read-only repository permissions, cancels superseded runs on the same ref, and does not publish or deploy automatically. Deployment should be a separate, explicitly authorized workflow.

## Interpreting failures

- Type errors usually indicate a contract mismatch in `src/domain/`, `src/db/`, or a feature component.
- Lint failures commonly come from unused imports, hook dependency changes, or accessibility-related JSX edits.
- Test failures should be fixed at the behavior boundary rather than bypassed with weaker assertions.
- Build verification failures mean the generated PWA artifact is incomplete and should block delivery.
