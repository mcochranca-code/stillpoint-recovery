# Stillpoint Recovery — Repository Handoff

_Last updated: October 26, 2026. This handoff describes the latest GitHub `main` baseline plus the additive UX changes in this working branch. Do not treat an unpushed working-tree change as published._

## Product overview

Stillpoint Recovery is an installable, local-first recovery companion. Its tone is deliberately nonjudgmental: no streak pressure, mandatory recovery date, account, analytics pipeline, or cloud database in the core experience. The main Today screen offers optional reflection, official-resource links, a privacy-preserving recovery counter, shortcuts into meditation, meetings and journaling, and access to the broader collection of features.

## Current user-facing areas

The app includes Today, Progress, Journal, Meditation, Meetings, Library, Reset, Garden, Field Guide, Settings, and the Journey Collection. Existing routes and content remain intact. The current branch adds an optional quick-start panel near the top of Today and improves mobile navigation labeling; it does not replace the existing Today cards, lower quick actions, route destinations, or settings.

Current main also includes an offline PWA shell, 90 original daily reflections, the official NA daily-reading link, optional Our Daily Bread links, editable local journals and drafts, ten meditation practices, local activity/milestone history, two-sided interactive 3D charm medallions, and a bundled partial regional directory of source-linked meetings. Filters and searches run locally. The interactive map is separately opt-in, uses approximate address-range pins, and requests map tiles only after the user chooses to load it.

## Architecture and data

The application is a React/TypeScript client built with Vite. Dexie manages IndexedDB, which is the browser-side system of record. Typed domain modules contain date, meeting, reminder, milestone, and sharing rules. Bundled reflections, meditation exercises, scripture references, charms, meeting listings, and map coordinates are shipped as static app assets. A versioned JSON backup can be exported and validated for restore; backups are ordinary files, not automatically encrypted.

`CURRENT_SCHEMA_VERSION` is 5. The schema migration preserves prior local data and initializes current preference fields. The current reminder work is deliberately described as groundwork: user-facing Settings supports an optional daily meditation reminder and time; the meeting reminder record and recurrence calculation are modeled locally, but meeting-card reminder controls and a complete notification dispatch loop are not wired into the current application. The browser may suspend work, deny notifications, or restrict delivery while the app is closed. Do not advertise guaranteed background delivery.

The current reminder permission request is made from the explicit Settings toggle. The repository is a PWA/web app, not a native iOS/Android application. The web layer exposes an optional native permission bridge contract, but no native host implementation or separately built mobile client is included. See [notification permission notes](notification-permissions.md) before extending the platform surface.

## Privacy and content boundaries

Recovery profiles, journals, sessions, meeting searches, and preferences stay in local browser storage unless a user explicitly exports or shares something. That does not mean browser storage is encrypted: another person with access to the browser profile/device may inspect it, and clearing site data may remove it. Meeting filters are local; users must choose external official-directory/map links themselves. External hosts may receive normal connection metadata. Never include recovery details in notification text or survey responses.

The optional [experience and usability survey](https://form.jotform.com/262961231783057) is hosted on Jotform. The respondent submits information to Jotform, not just local browser storage; respondents are warned not to include names, recovery dates, journal content, diagnoses, or other sensitive details. The current survey's introductory skip-any-question wording conflicts with several required fields. See the [survey review](reminder-and-survey-review.md).

Stillpoint is not clinical care and should not claim to diagnose, treat, prevent, or guarantee recovery outcomes. Publisher and fellowship literature remain at their official sources except for the specifically authorized archival item documented in `docs/copyright/`.

## Development and verification

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:pwa
node scripts/check-documentation-links.mjs
```

For a local preview, run `pnpm dev` or build then `pnpm preview`. Use the repository's declared package manager and lockfile. Keep changes additive, preserve the local-only data boundary, and run the full applicable suite before release.

## Publication and current limitations

GitHub `main` is the code source of truth. The README points to the public Netlify demo at `https://stillpoint-recovery-demo.netlify.app/`; the latest recorded production verification and deployment identifier are noted in `TODO.md` and should be rechecked after any release. The current workflow set runs code-quality, coverage, documentation, and failure-notification checks; it does not itself establish that a Netlify deployment happened. `TODO.md` records that automatic Netlify deployments remain blocked until the required repository Actions secrets/workflow setup is available.

The requested Manus WebDev site is a separate publication target. It must be attached to the authorized existing WebDev project before it can be safely previewed or published. A shared task/conversation URL alone is not a verified WebDev project binding, and this task must not create a replacement project or infer a project identifier. After attaching the intended existing project, test its preview and publish the validated checkpoint; then compare its public version with the commit on GitHub `main`.

## Handoff priorities

1. Keep the new quick-start options and mobile labels readable at 320px and wider; preserve all existing routes, accessible full labels, and active-route state.
2. Finish meeting-reminder controls, user-selected lead time, scheduling/dispatch, deduplication, notification click routing, timezone/DST behavior and honest closed-app limitations before calling reminders complete.
3. Revisit the survey's required-field/skip wording and Jotform privacy disclosure before broad promotion; do not collect or inspect responses without authorization.
4. Attach the correct existing Manus WebDev project, validate the target site's preview, and publish only after confirming that it corresponds to this repository/main source.
5. Keep backups, local-first behavior, external-content attribution, and reduced-motion/accessibility behavior covered by tests and documentation.
