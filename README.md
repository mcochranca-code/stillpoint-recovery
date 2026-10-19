# Stillpoint Recovery

Stillpoint is a local-first, installable recovery companion built with React, TypeScript, Vite, Tailwind CSS, Dexie/IndexedDB and a small service worker. Core features do not require an account, server, managed database, external AI, analytics or network connection after the application shell and assets have been cached.

## Run locally

Requirements: Node.js and pnpm 11.25.0 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The Vite server uses port 3000. For a production build and local preview:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

The build creates `dist/` and `dist/precache-manifest.json`. The manifest generator lists all bundled chunks and local public assets so the service worker can cache the app for offline use. A hosted deployment should serve the static `dist/` directory with SPA fallback for the declared application routes, while missing `/assets/*` paths remain real 404s.

## What is included

The five main areas are Today, Progress, Journal, Meditation and Library. Secondary experiences include the Living Garden, 90-Second Reset and Personal Recovery Field Guide. Progress includes optional day-based personal milestones in addition to the standard recovery timeline and non-sobriety goals. Settings provide the Stillpoint, Catppuccin, Monokai, Obsidian and Lucide color palettes independently from light/dark/system appearance, plus accessibility, reminder, backup and data-deletion options. User-entered support contacts and resources remain local and are neither verified nor contacted by the app. The supplied Stillpoint asset pack is under `public/assets/`.

Recovery dates, preferences, journal entries and drafts, reflections, scripture activity, meditation sessions, charms and their private memories, personal goals/milestones, Field Guide notes, support resources, and Reset choices are stored in IndexedDB through Dexie. IndexedDB in this browser is **not encrypted**. Clearing browser/site data or uninstalling the PWA may permanently remove this information. Export backups regularly and keep them somewhere private. JSON backups are versioned, validated and merged with duplicate IDs skipped; profile/preferences restore as singletons. The schema migrates legacy records locally without deleting prior entries.

## Date and timer policy

A date-only sobriety date is interpreted as local midnight on the selected calendar date. If an optional start time is entered, that local wall-clock time is converted to a stored timestamp; elapsed time is calculated from that timestamp. Journal entries also let you choose a local date and time, which is saved as an instant and displayed using the current device locale/time zone. The recovery profile’s original local calendar date and IANA time-zone label are saved for context. When the device timezone changes, elapsed recovery duration still uses the saved start instant while calendar formatting follows the current device locale/timezone. Users may edit the recovery date; historical journal entries, meditation sessions and earned charms are preserved.

## Privacy and support boundaries

Stillpoint does not upload recovery data to an app server or analytics service. Any share is user-initiated, previewed, and limited to the official NA reading link or milestone details the user selects; journal entries are never attached. Browser notifications are optional and use neutral wording; reliable closed-app delivery depends on browser support. Optional speech cues use the device’s speech engine. No contact is called or messaged by the app. Meditation and devotional content are optional encouragement, not diagnosis, treatment, medical advice or emergency support. For urgent help, use local emergency services or a trusted person.

## Project structure

- `src/app/` — provider, routes, responsive navigation, onboarding and accessible dialog focus management.
- `src/features/` — Today, Progress, Journal, Meditation, Library, Settings, Reset, Garden and Field Guide pages.
- `src/components/` — reusable charm gallery and shared presentation pieces.
- `src/db/` — Dexie schema/migrations, repositories, milestones, charm persistence and JSON backups.
- `src/domain/` — data types, date math, achievement criteria and shared domain calculations.
- `src/data/` — local reflection, scripture, exercise, charm and palette catalogs.
- `public/` — supplied assets, manifest, service worker and page route declaration.
- `tests/` and `src/**/*.test.*` — Vitest, Testing Library and fake IndexedDB regression tests.


## NA Just for Today reader

Today and Library show a separate, dated link to the current Just for Today reading on the official [NA World Services daily-meditations page](https://na.org/daily-meditations/). NAWS selects and displays its own publication date; around timezone boundaries it may differ from the device-local date shown in Stillpoint. The Stillpoint-authored daily reflection remains separate and expandable; no NA reading text is copied, cached, or exported by this app. NA World Services’ [Intellectual Property Bulletin #1](https://na.org/wp-content/uploads/2024/06/IPBUL1-Oct2023.pdf) says recovery literature may only be reproduced with permission and recommends that other websites link to the official source rather than repost it. Its [FIPT FAQ](https://na.org/service-material/fipt/fipt-faq/) likewise directs websites to link to NAWS material. Users may share the official link only; the app does not send recovery data.


## Optional ambience and sharing

Three short, original local soundscapes (rain, woodland, shoreline) are available for meditation and the Stillpoint reflection. They are silent/off by default, start only after a user action, and stop when the meditation pauses/ends or the user leaves the view. Silent practice remains available. They use bundled files rather than a remote stream.

Sharing is also explicit: the NA card shares the official NAWS URL and attribution only; its copyrighted reading text is never copied or exported. Progress milestone shares show a preview of selected fields before the device share sheet, copy, or text-file fallback. No journal entries or contacts are included.
