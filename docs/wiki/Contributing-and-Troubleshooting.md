# Contributing and Troubleshooting

## Contribution checklist

1. Create a focused branch from `main`.
2. Keep recovery data local by default; do not introduce hidden uploads, analytics, or account requirements.
3. Preserve keyboard access, visible focus, text scaling, high contrast, reduced motion, and discreet-mode behavior.
4. Keep destructive actions confirmed and reversible where possible.
5. Do not claim encryption, medical efficacy, emergency support, or guaranteed offline persistence.
6. Update tests and the README/wiki when behavior or user-facing boundaries change.
7. Run typecheck, lint, tests, and build before opening a pull request.

## Common issues

### Port 3000 is busy

Stop the process using the port or run the Vite command with a deliberate local configuration. The repository’s checked-in configuration expects port 3000 and strict port handling.

### A fresh browser appears to have no data

Data is scoped to the browser origin. A different host, port, profile, private window, or cleared site-data state has a different IndexedDB database. Use the in-app JSON backup/restore tools rather than copying browser storage manually.

### Offline behavior is stale

The service worker may still own an older cache. Unregister it in browser developer tools, clear site data, then reload the production preview. Development mode should be tested with the dev server separately from the built PWA.

### A build passes locally but CI fails

Re-run with `pnpm install --frozen-lockfile` to match CI. Check Node.js and pnpm versions, generated asset assumptions, case-sensitive file paths, and whether a test depends on a browser-only global that is not configured in `tests/setup.ts`.

### A link or publisher page changed

Keep the integration link-only. Update the user-facing disclosure and its test; do not copy publisher text into the repository as a workaround.
