# Contributor Guidelines and Troubleshooting

Stillpoint Recovery is a local-first, installable recovery companion. Contributions should make the product calmer, more understandable, more private, and more dependable without turning it into a service that requires an account or sends recovery data away from the device. For a visual overview, open the [static release and contributor preview](../release-contributor-preview.html).

## Before you start

Use Node.js 22 and pnpm 11.25.0, matching the versions used by GitHub Actions. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development server uses port 3000 and strict port handling. Run the production PWA locally with `pnpm build` followed by `pnpm preview` when service-worker, manifest, or precache behavior matters.

Read the [architecture guide](Architecture), [data and privacy guide](Data-and-Privacy), [PWA and offline guide](PWA-and-Offline), and [content and licensing guide](Content-and-Licensing) before changing storage, external links, service-worker behavior, or bundled literature references.

## Project principles

- Keep recovery data local by default. Do not add hidden uploads, analytics, account requirements, or remote persistence.
- Preserve user control: destructive actions should be confirmed, reversible where practical, and clear about what is deleted.
- Preserve keyboard access, visible focus, text scaling, high contrast, reduced-motion behavior, and discreet-mode behavior.
- Use supportive, non-clinical language. Do not claim encryption, medical efficacy, emergency support, guaranteed offline persistence, or treatment outcomes unless the implementation and evidence genuinely support the statement.
- Keep third-party content link-only unless redistribution rights are explicit and documented. Maintain clear attribution and non-affiliation notices.
- Prefer small, composable changes grounded in the existing data model and route structure.

## Branches, commits, and pull requests

1. Create a focused branch from the current `main` branch.
2. Keep one behavior or documentation concern per pull request when possible.
3. Use a concise imperative commit subject, such as `Add breathing phase coverage`.
4. Explain user-facing behavior, privacy impact, migration concerns, and test coverage in the pull request description.
5. Include screenshots or a short screen recording for visual changes, including reduced-motion or responsive behavior when relevant.
6. Call out changes to external links, copyright boundaries, service-worker caching, IndexedDB schema, backup formats, or release metadata.
7. Do not commit secrets, personal recovery data, generated `dist/` output, coverage reports, or local environment files.

## Local quality gates

Run the relevant checks before opening a pull request. For a complete change, run:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
node scripts/check-documentation-links.mjs
```

The Vitest suite uses JSDOM and Testing Library. Coverage is scoped to `src/**/*.{ts,tsx}` and produces HTML and JSON reports under `coverage/`. The documentation checker validates local references, Wiki-style links, Markdown anchors, PDF page targets, the 366-entry NA index, required attribution notices, and external URLs.

GitHub Actions runs the same quality/build checks on pushes and pull requests. The separate coverage workflow publishes a short-retention report artifact and job-summary percentages. Documentation checks also run weekly. Review the [Testing and CI guide](Testing-and-CI) for workflow behavior and failure interpretation.

## Code and UI practices

Keep domain rules in `src/domain/`, persistence and backup behavior in `src/db/`, stable content in `src/data/`, and route-level UI in the relevant `src/features/` directory. Add or update tests at the behavior boundary rather than weakening assertions to make a test pass.

For React changes, preserve semantic HTML, labels, focus management, responsive layouts, and reduced-motion behavior. Avoid introducing global state when a local feature boundary is sufficient. For date or timer logic, test timezone, midnight, leap-day, and boundary behavior explicitly.

For IndexedDB changes, consider existing users and backup compatibility. Validate imported JSON, preserve unknown records where the merge contract requires it, and document any schema or deletion behavior. Never use browser storage as a reason to claim that data is encrypted or permanently recoverable.

## Documentation and content rules

Update the README or versioned wiki when a feature changes user expectations, setup, privacy, offline behavior, testing, or licensing. Keep diagrams implementation-backed and avoid documenting planned work as shipped behavior.

For external recovery resources, prefer official publisher links. The app’s NA and ODB resource cards are link-only integrations. Do not copy publisher text into app content or documentation as a workaround for a changed URL. If authorized literature is stored for archival navigation, keep it in `docs/copyright/`, retain the attribution notice, and keep the source license boundary separate from the MIT license for Stillpoint code.

## Release process

The npm package is published only from an exact semantic-version tag matching `package.json`:

```sh
# Update package.json's version, then run the full quality gates.
git add package.json pnpm-lock.yaml
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main --follow-tags
```

The [`release-npm.yml`](../../.github/workflows/release-npm.yml) workflow runs for tags matching `v*.*.*`. It checks that the tag is exactly `v${package.version}`, installs from the frozen lockfile, runs typecheck/lint/tests/build, and publishes publicly with npm provenance. It targets the `npm-release` GitHub Environment. Configure that environment with required release-maintainer approval, restrict its deployment branches/tags to approved version tags, and store `NPM_TOKEN` as an environment secret (remove any repository-level copy). Also use a repository ruleset to restrict who can create or update release tags. Never reuse a published version or push a tag before reviewing the package contents and release notes.

If a release tag does not match the package version, the workflow stops before publishing. To correct a release, update the version and use a new, unused tag rather than force-moving a published tag.

## Common troubleshooting

### Port 3000 is busy

Stop the process using the port or use a deliberate local Vite configuration. The checked-in configuration expects port 3000 and strict port handling.

### A fresh browser appears to have no data

Data is scoped to the browser origin. A different host, port, profile, private window, or cleared site-data state has a different IndexedDB database. Use the in-app JSON backup/restore tools rather than copying browser storage manually.

### Offline behavior is stale

The service worker may still own an older cache. Unregister it in browser developer tools, clear site data, then reload the production preview. Test development mode separately from the built PWA.

### A build passes locally but CI fails

Run `pnpm install --frozen-lockfile` to match CI. Check Node.js and pnpm versions, generated asset assumptions, case-sensitive file paths, and whether a test depends on a browser-only global that is not configured in `tests/setup.ts`.

### Coverage changes unexpectedly

Confirm that tests still exercise the intended module and that `vite.config.ts` still scopes instrumentation to `src/**/*.{ts,tsx}`. Coverage is diagnostic, not a substitute for behavior-focused tests; explain meaningful percentage changes in the pull request.

### A documentation check fails

Run `node scripts/check-documentation-links.mjs` locally. Fix missing repository files, invalid Markdown anchors, PDF page fragments, required attribution text, or confirmed external 404/410 responses. Access-restricted external sites are reported as warnings; do not remove a rights notice to make the check pass.

### An npm release fails

Check that the tag is exactly `v${package.version}`, the package version has not already been published, and the `NPM_TOKEN` environment secret can publish the package. Confirm that the `npm-release` environment and release-tag ruleset are configured. Do not print or paste the token into logs, issues, or pull requests.

## Security and responsible disclosure

Do not report sensitive security details in a public issue. Avoid including personal recovery data, tokens, browser exports, or private URLs in bug reports. Describe the smallest reproducible behavior and contact the repository maintainers through the project’s configured private channel when one is available.
