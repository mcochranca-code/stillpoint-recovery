<div align="center">
  <img src="public/assets/branding/app-icon.svg" alt="Stillpoint Recovery mark" width="76" height="76">
  <h1>Stillpoint Recovery</h1>
  <p><strong>A quieter place to keep choosing what matters.</strong></p>
  <p>One day at a time. On your device. At your pace.</p>
  <p>
    <code>LOCAL-FIRST</code> &nbsp; <code>INSTALLABLE PWA</code> &nbsp; <code>NO ACCOUNT</code> &nbsp; <code>MIT LICENSE · SOURCE</code> &nbsp; <code>BUILT FOR GENTLENESS</code>
  </p>
  <p>
    <a href="https://github.com/mcochranca-code/stillpoint-recovery/archive/refs/heads/main.zip"><strong>Download the source ZIP</strong></a>
    &nbsp; · &nbsp;
    <a href="#take-a-look-around">See the screenshots</a>
    &nbsp; · &nbsp;
    <a href="#run-it-on-your-device">Run it on your device</a>
  </p>
</div>

<p align="center">
  <a href="https://github.com/mcochranca-code/stillpoint-recovery/actions/workflows/ci.yml"><img src="https://github.com/mcochranca-code/stillpoint-recovery/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/mcochranca-code/stillpoint-recovery/actions/workflows/coverage.yml"><img src="https://github.com/mcochranca-code/stillpoint-recovery/actions/workflows/coverage.yml/badge.svg" alt="Test coverage workflow status"></a>
  <a href="https://github.com/mcochranca-code/stillpoint-recovery/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mcochranca-code/stillpoint-recovery/ci.yml?branch=main&amp;label=code%20quality%20%26%20linting&amp;logo=github" alt="Code quality and linting status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"></a>
  <a href="docs/wiki/Home.md"><img src="https://img.shields.io/badge/project-wiki-blue.svg" alt="Project wiki"></a>
</p>

<p align="center">
  <img src="docs/media/hero-still.png" alt="Stillpoint app preview with a calm recovery dashboard, progress ring, daily reflection and quiet-practice card" width="100%">
</p>

<p align="center"><sub>The screen artwork uses illustrative sample values. Your own recovery information is not included in these images.</sub></p>

<details>
<summary><strong>Play the optional motion previews</strong> — slow, soft, and non-flashing</summary>

<p><img src="docs/media/hero.gif" alt="A gentle motion preview of the Stillpoint dashboard and progress ring" width="100%"></p>
<p align="center"><sub>Dashboard motion: a quiet floating card, a softly moving progress ring, and a warm horizon.</sub></p>

<p><img src="docs/media/breathing.gif" alt="A softly expanding meditation orb with the words at your pace" width="720"></p>
<p align="center"><sub>Meditation motion is optional. Silence and natural breathing are always welcome.</sub></p>

<p><a href="docs/media/hero-still.png">View the still hero instead</a>. The motion files are small, locally included, and created from source-controlled HTML and CSS—no hosted animation service.</p>
</details>

---

## A recovery companion without the pressure

Recovery is personal. Stillpoint is designed to make room for reflection and supportive routines without turning your life into a score. There is no leaderboard, guilt loop, forced streak, or requirement to share your story.

### What happens when you use it

The main path stays deliberately small: open the app, decide what you need today, and return to a private place that works even when you do not configure a recovery date.

```mermaid
flowchart LR
    Open[Open Stillpoint] --> Setup{Optional setup}
    Setup -->|Skip| Today[Today dashboard]
    Setup -->|Save preferences| Today
    Today --> Choice{What would help now?}
    Choice --> Reflect[Reflection or scripture]
    Choice --> Write[Journal or field guide]
    Choice --> Reset[90-second Reset]
    Choice --> Practice[Meditation]
    Choice --> Review[Progress or Garden]
    Choice --> Meet[AA/NA meeting list]
    Meet --> Snapshot[Locally bundled county listings]
    Reflect --> Local[Saved locally on this device]
    Write --> Local
    Reset --> Local
    Practice --> Local
    Review --> Local
```

The choices are invitations rather than requirements. No route depends on a streak, and changing a recovery date does not delete journals, meditation history, or earned charms.

### Take a look around

<table>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/media/today.webp"><img src="docs/media/today.webp" alt="Today screen showing a visual recovery counter, NA Just for Today link, original daily reflection and scripture" width="100%"></a>
      <h3>Today — one moment at a time</h3>
      <p>A visual, live day counter sits alongside an original daily reflection, optional scripture, and the official NA Just for Today reader link. Adjust or hide the counter whenever you want.</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/media/progress.webp"><img src="docs/media/progress.webp" alt="Progress screen with activity over time, recovery milestones and a personal goal area" width="100%"></a>
      <h3>Progress — your own measure</h3>
      <p>See calendar milestones, recorded activities, meditation time, journal entries, and personal goals. Activity is presented as context, not a prediction or a judgment.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="docs/media/meditation.webp"><img src="docs/media/meditation.webp" alt="Meditation studio with selectable 2, 5, 10 and 20 minute sessions and gentle practices" width="100%"></a>
      <h3>Meditation — gentle by design</h3>
      <p>Choose a 2, 5, 10, or 20 minute practice. Box Breathing follows a highlighted sphere around the square in phase with the text cues; optional local soundscapes stay silent until you choose them.</p>
    </td>
    <td width="50%" valign="top">
      <a href="docs/media/library.webp"><img src="docs/media/library.webp" alt="Library screen with the official NA link, original reflections, scripture, principles, meditation and collection tabs" width="100%"></a>
      <h3>Library — return to what helps</h3>
      <p>Browse original reflections, public-domain scripture, recovery principles, meditation practices, and the Journey Collection of supportive milestones.</p>
    </td>
  </tr>
</table>

<h3>Local peer support — when you want it</h3>
<p>The Meetings tab includes a dated, offline-friendly snapshot of public AA and NA listings for Stanislaus County, with fellowship, day, city, and text filters. Listings were checked on October 23, 2026; see the <a href="docs/meeting-sources.md">source and privacy notes</a>. Confirm time and place with the <a href="https://cviaa.org/aa/meetings/">official Central Valley Intergroup AA directory</a> or <a href="https://svgna.org/svgna-meeting-schedule">official SVGNA schedule</a> before traveling. The app does not request location or record attendance; opening an external directory or map may disclose normal connection metadata.</p>

<p align="center"><sub>Product screenshots use a local demo profile with sample activity. No private journal content or personal contacts are shown.</sub></p>

<h3 align="center">Make the space your own</h3>
<p align="center"><a href="docs/media/settings.webp"><img src="docs/media/settings.webp" alt="Settings screen displaying the five Stillpoint color palettes and accessibility controls" width="720"></a></p>
<p align="center"><sub>Stillpoint, Catppuccin, Monokai, Obsidian, and Lucide—plus text size, contrast, reduced motion, and discreet display.</sub></p>

## Small practices. Useful details.

- **90 original daily reflections** offer a principle, a small practice, and a question to carry. They are written for Stillpoint and are not presented as fellowship literature.
- **NA Just for Today** opens the daily reading on the official [Narcotics Anonymous World Services site](https://na.org/daily-meditations/). The app remains an official-link-only integration and does not copy or cache the reading. An authorized archival copy of the book is separately documented under [`docs/copyright/`](docs/copyright/).
- **Our Daily Bread resources** link to the publisher’s official [Reading Plans](https://odb.org/page/reading-plans) and [podcast catalogue](https://odb.org/podcasts/) for Discover the Word. Stillpoint adds an original companion prompt, not publisher text.
- **Private journaling** supports gratitude, emotions, triggers, coping strategies, prayers, milestones, and free writing—with editable entries, search, and recoverable drafts.
- **Meditation Studio** includes ten gentle practices, selectable session lengths, pause and resume controls, and three bundled soundscapes: rain, woodland, and shoreline. In active Box Breathing, a highlighted sphere moves around the square in time with the inhale/hold/exhale/rest cues.
- **Meetings** adds a dated, offline-friendly AA/NA snapshot for Stanislaus County with fellowship, weekday, city and text filters. The listings were checked October 23, 2026; see [source and privacy notes](docs/meeting-sources.md), and confirm details with the official directories before traveling.
- **Five palettes**—Stillpoint, Catppuccin, Monokai, Obsidian, and Lucide—can be paired with text scaling, high contrast, reduced motion, and a discreet display.
- **Backups stay yours.** Export a versioned JSON backup or restore one on-device. Sharing is opt-in: the NA card shares the official link only, while milestone details are previewed and selected by you. You can also share or download a Stillpoint-branded standalone HTML milestone card; its name and date stay off unless selected.
- **Keep the parts that matter.** Journals, meditation history, and earned charms are not erased when you edit your recovery date.

## How the pieces fit together

Stillpoint is a client-only React application. Features read and write through typed repositories backed by Dexie and IndexedDB; the browser is the system of record. Static content such as reflections, exercises, scripture references, themes, charm definitions, and the dated meeting snapshot is bundled with the app.

```mermaid
flowchart TD
    UI[React routes and accessible components] --> Features[Feature pages\nToday · Progress · Journal · Meditation\nMeetings · Library · Reset · Garden · Field Guide · Settings]
    Features --> Domain[Typed domain rules\ndates · timers · milestones · sharing]
    Features --> Repositories[Database repositories]
    Repositories --> IndexedDB[(IndexedDB\nStillpointRecovery)]
    Static[Bundled local content\nreflections · exercises · scripture · charms · meeting snapshot] --> Features
    IndexedDB --> Backup[Versioned JSON backup]
    Backup -->|User chooses a file| Restore[Validated import and merge]
    Restore --> IndexedDB
    External[Official NAWS, ODB, AA/NA directories and maps] -. explicit click only .-> Browser[New browser tab]
    Browser -. no recovery payload .-> External
```

There is no application API, account system, analytics pipeline, or cloud database in the core experience. Meeting filters run locally over the bundled snapshot; no location or attendance is collected. An external directory or map opens only after the user chooses its link; the app does not fetch or rehost publisher content.

## Motion is part of the design—not decoration

The app uses small CSS transitions for feedback and gentle meditation visuals. In an active Box Breathing session, the highlighted sphere follows the inhale, optional hold, exhale, and rest phases around a square, using the same elapsed-time clock as the phase label. Pause freezes its position; reduced motion keeps it still. The README motion previews are source-controlled HTML/CSS compositions and open only when you choose them. Motion is quiet and non-flashing.

Other meditation-orb artwork uses a slow eight-second ease-in/ease-out cycle. The interface disables nonessential animation when reduced motion is requested:

```css
@keyframes stillpoint-breathe {
  0%, 100% { transform: scale(.88); opacity: .82; }
  50% { transform: scale(1.06); opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .breathing-orb {
    animation: stillpoint-breathe 8s ease-in-out infinite;
    transform-origin: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

The compact [hero HTML/CSS](.github/readme-media/source/hero.html), [meditation vignette](.github/readme-media/source/breathing.html), [app motion stylesheet](public/assets/meditation/meditation-motion.css), [phase-position helper](src/features/meditation/breathingVisual.ts), [box-orb styling](src/features/meditation/box-breathing.css), and [render script](.github/readme-media/render.sh) are available in the repository. The motion examples were informed by [Prismic’s CSS animation examples](https://prismic.io/blog/css-animation-examples); they are adapted to Stillpoint’s palette, product, and reduced-motion behavior.

## Run it on your device

Stillpoint is a web app, not an App Store or Play Store download. You can download the repository as a ZIP using the button at the top, or clone it and run it locally. Once the local app opens in your browser, use the browser’s **Install app** or **Add to Home Screen** option if available.

Requirements: Node.js and the pnpm version pinned in `package.json`.

```sh
git clone https://github.com/mcochranca-code/stillpoint-recovery.git
cd stillpoint-recovery
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The app can be used without entering a recovery date; optional setup can be skipped. For a production build and local preview:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

The production build creates `dist/`, a web app manifest, a service worker, and a precache manifest for local app assets. Offline availability depends on the app shell and assets being successfully cached by your browser.

### Install and offline behavior

The manifest uses standalone display mode and provides shortcuts for **Today**, **I need a moment**, and **Living Garden**. The service worker precaches the app shell and generated asset manifest, serves cached assets locally, and falls back to the cached root for navigation when a network request fails. Official NAWS, Our Daily Bread, AA/NA directory, and map links remain normal external web visits and therefore need a connection when opened.

```mermaid
sequenceDiagram
    participant Browser
    participant App as Stillpoint app
    participant Cache as Service worker cache
    participant IDB as IndexedDB
    participant Web as External resource

    Browser->>App: Load shell
    App->>Cache: Read precached assets
    App->>IDB: Open local database
    IDB-->>App: Preferences and recovery records
    App-->>Browser: Render route
    Browser->>Web: Only after an explicit external-link click
    Web-->>Browser: Publisher page
```

## Your information stays in your browser

Stillpoint stores recovery dates, preferences, journals, reflections, scripture activity, meditation sessions, earned charms, and related notes in this browser’s IndexedDB. The app does not require an account or cloud sync. It does not upload journal content to an app backend.

**Local does not mean encrypted.** Browser storage is not encrypted by Stillpoint. Clearing site data or uninstalling the PWA can erase saved information. Export a backup regularly and keep it somewhere private. Imported backups are validated and merged with duplicate IDs skipped.

Date-only recovery dates are interpreted as local midnight. If you add a start time, the chosen local time is converted to a saved timestamp. Editing the date preserves past journal entries, sessions, and earned charms.

Stillpoint is a personal reflection companion—not medical care, treatment, diagnosis, or an emergency service. Spiritual content and meditation are optional encouragement, never a measure of faith or worth and never a replacement for professional or peer support.

### What is and is not private

The local-first boundary is intentional, but it is not a security promise. Browser storage can be inspected by someone with access to the device or browser profile, and it can disappear when site data is cleared. Backups are ordinary JSON files, so protect them like personal notes. The app also never sends a message to a trusted contact; contact actions are user-initiated.

## Our Daily Bread resources

The Today card opens the publisher’s official Reading Plans and podcast catalogue for Discover the Word. Source links were checked on October 22, 2026. Stillpoint does not reproduce, cache, proxy, or automatically fetch ODB readings, plan descriptions, episode descriptions, transcripts, or artwork. The links open in a new tab with no referrer; Stillpoint does not attach a recovery profile, sobriety date, or journal text. A normal visit may still expose connection details to the publisher, whose privacy, cookie, analytics, and terms practices apply.

## Respect for NA literature

The Just for Today card links to the official [NA World Services daily-meditations page](https://na.org/daily-meditations/). NAWS controls the reading and its publication date, which may differ from the device’s local date near timezone boundaries. The app does not rehost or embed the text. With redistribution authorization provided to the repository maintainer, an unchanged archival copy of *Just for Today: Daily Meditations for Recovering Addicts* is available in [`docs/copyright/Just-for-Today-NA.pdf`](docs/copyright/Just-for-Today-NA.pdf). The [daily reflection index](docs/copyright/Just-for-Today-index.md) lists dates, titles, and PDF page links only; it does not reproduce the meditation passages. Full attribution, permission scope, checksum, and non-affiliation language are recorded in [`docs/copyright/README.md`](docs/copyright/README.md). See NAWS’ [Intellectual Property Bulletin #1](https://na.org/wp-content/uploads/2024/06/IPBUL1-Oct2023.pdf) and [FIPT FAQ](https://na.org/service-material/fipt/fipt-faq/).

## License

The repository root contains the standard [MIT License](LICENSE), and GitHub recognizes the project as MIT-licensed. It covers the original application source code and documentation contributed to this repository. Its scope does not grant rights to bundled or user-supplied media, brand assets, third-party marks, Our Daily Bread or NAWS content, or dependency packages governed by their own licenses. Check the relevant rights before redistributing those materials.

## Built with

React · TypeScript · Vite · Tailwind CSS · Framer Motion · Dexie/IndexedDB · Vitest

<details>
<summary><strong>Project map</strong></summary>

- `src/app/` — application shell, routes, onboarding, and dialog focus management.
- `src/features/` — Today, Progress, Journal, Meditation, Meetings, Library, Settings, Reset, Garden, and Field Guide.
- `src/components/` — reusable interface components and dialogs.
- `src/db/` — IndexedDB schema, migrations, repositories, milestones, and JSON backups.
- `src/domain/` — typed data, date math, sharing, achievement criteria, and domain calculations.
- `src/data/` — local reflections, scripture, exercises, charms, palettes, and the dated Stanislaus meeting snapshot.
- `public/` — supplied brand assets, local soundscapes, PWA manifest, and service worker.
- `docs/media/` — still and motion visuals used by this README.
- `docs/meeting-sources.md` — source dates, directory links, and privacy boundaries for the bundled county schedule.
- `docs/copyright/` — authorized third-party literature, attribution notices, and a non-reproducing navigation index.
- `.github/readme-media/` — editable HTML/CSS motion sources and their renderer.

</details>

### Route map

```mermaid
flowchart LR
    Shell[App shell and navigation] --> Today[/ Today\nreflection · scripture · quick actions /]
    Shell --> Progress[/progress\nactivity · milestones · goals /]
    Shell --> Journal[/journal\nprivate entries · drafts · search /]
    Shell --> Meditation[/meditation\nexercises · timer · sessions /]
    Shell --> Meetings[/meetings\nAA · NA · local snapshot /]
    Shell --> Library[/library\nreadings · practices · collection /]
    Shell --> Reset[/reset\nbrief grounding flow /]
    Shell --> Garden[/garden\nnon-punitive visual growth /]
    Shell --> FieldGuide[/field-guide\nuser-built coping notes /]
    Shell --> Settings[/settings\npreferences · backup · deletion /]
```

### Development and contribution

The repository keeps the development loop intentionally conventional:

```sh
pnpm dev          # Vite development server on port 3000
pnpm typecheck    # strict TypeScript diagnostics
pnpm lint         # ESLint checks
pnpm test         # Vitest and Testing Library suite
pnpm test:coverage # tests plus V8 HTML/JSON coverage reports
pnpm build        # production bundle plus precache manifest
pnpm preview      # serve the production build locally
node scripts/check-documentation-links.mjs  # links, PDF anchors, and rights references
```

When changing a feature, keep recovery data local by default, preserve keyboard and reduced-motion behavior, and avoid claiming encryption or clinical outcomes. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and the documentation checker before opening a pull request. The automated tests cover date and timer rules, backup validation, sharing previews, content, focus behavior, ambient audio, external-resource cards, meeting filters, and Box Breathing phase positions.

The documentation checker runs on documentation changes, pull requests, manual dispatch, and every Monday at 08:17 UTC through [`documentation-links.yml`](.github/workflows/documentation-links.yml). It validates local Markdown links, Wiki-style `.md` links, PDF `#page=` targets, external URLs with retries, the 366-entry NA index, and required copyright/disclaimer references. It reports access-restricted external sites as warnings while failing on missing local files, invalid PDF targets, missing required notices, and confirmed broken external URLs.

## Project wiki

The [versioned project wiki](docs/wiki/Home.md) keeps the deeper operational documentation close to the implementation. It covers getting started, architecture, data and privacy, PWA/offline behavior, testing and CI, content boundaries, and contribution troubleshooting. The [static release and contributor preview](docs/release-contributor-preview.html) presents the npm release path and contributor quality rhythm visually. Keeping these pages in the repository makes changes reviewable alongside code; they can also seed a GitHub Wiki if that separate space is initialized later.

<p align="center"><sub>Made for the day you are in. Not affiliated with Narcotics Anonymous World Services.</sub></p>
