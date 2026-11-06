# Design tokens, motion and accessibility conventions

Stillpoint should feel calm. These conventions keep the interface quiet, readable and usable with a keyboard or screen reader. They build on the accessibility and page-hierarchy work merged in #42.

## Design tokens

| Layer | Where | What |
| --- | --- | --- |
| Brand hues | [`public/assets/branding/brand-tokens.css`](../../public/assets/branding/brand-tokens.css) | Forest, sage, cream, gold and the other fixed brand colors. |
| Scales | [`src/styles/tokens.css`](../../src/styles/tokens.css) | Spacing (`--space-*`, 4px rhythm), radius (`--radius-*`), typography (`--font-sans`, `--font-serif`, `--text-*`, `--leading-*`), focus (`--focus-ring-width/offset`), layering (`--z-*`), `--target-min`, and motion. |
| Theme palettes | [`src/styles.css`](../../src/styles.css) (“Independent color palettes”) | `--canvas`, `--surface`, `--ink`, `--muted`, `--primary*`, `--selected-*`, `--focus-ring`, `--eyebrow-color`, `--sage`, counter-hero colors, for each of the five color themes in light and dark. |

New styles should reach for a token before a literal value. Existing literal values are being migrated gradually; there is no need to rewrite working rules just to swap in a token.

### Contrast

[`src/styles/contrast.test.ts`](../../src/styles/contrast.test.ts) reads the palettes straight from `styles.css` and fails CI if any theme, in light, dark or high-contrast mode, drops below WCAG AA: 4.5:1 for text pairs (ink, muted, primary, eyebrow, selected and counter-hero text on their backgrounds) and 3:1 for the focus ring against the canvas and surface. Two palette values were adjusted to pass: the Stillpoint light eyebrow (`#63836d` → `#4e7059`) and the Catppuccin light primary (`#8839ef` → `#7c2fe0`).

## Motion

Motion tokens live in `tokens.css`:

- Durations: `--motion-instant` (80ms), `--motion-quick` (160ms), `--motion-gentle` (280ms), `--motion-calm` (480ms), `--motion-slow` (900ms), `--motion-breath` (4.2s, one slow breath for ambient loops).
- Easings: `--ease-gentle`, `--ease-settle`, `--ease-out-soft` and `--ease-breathe`. All of them slow down softly and none overshoot or bounce.
- Distances: `--motion-rise` (6px) and `--motion-press-scale` (.98).

Principles: movement settles into place instead of travelling across the screen. Nothing flashes, and nothing loops quickly. Ambient loops (the splash halo and the skeleton glow) follow the pace of a slow breath.

**Reduced motion.** Every duration token drops to `0ms`, and the distances to zero, under `prefers-reduced-motion: reduce` *and* under Stillpoint's own **Reduced motion** setting (`html.reduce-motion`). Ambient loops are also switched off outright. Framer Motion follows the same choice through `<MotionConfig reducedMotion>` in `App.tsx`. A test checks that every duration token has a reduced-motion override.

What uses motion ([`src/styles/motion.css`](../../src/styles/motion.css)):

- **Splash.** A pre-render splash in `index.html` is painted before JavaScript runs. `LoadingScreen` then shows the same mark with a slowly breathing halo while local storage opens.
- **Skeletons.** `PageSkeleton` is the fallback while a lazy route loads, and the meeting map has its own skeleton. The shapes are decorative, and screen readers hear a single polite status message.
- **Page transitions.** Route content fades in and rises 6px (`.route-transition`).
- **Micro-interactions.** A light press scale on buttons. The progress ring eases from 0 to its value (a registered `@property --progress`). A soft check settles in when a reflection is marked. Toasts and dialogs settle into place.

## Navigation and focus

- A **skip link** (“Skip to main content”) is the first focusable element.
- Both navigation landmarks are named: *Primary navigation* (sidebar) and *Mobile primary navigation*.
- **Route changes** (`RouteFocusManager`): updates `document.title`, scrolls to the top, moves focus to the new page's `<h1>` after the lazy page renders (falling back to `<main>`), and announces “*Page name* page” in a polite live region. Focus is left alone on first load and whenever something else, such as a dialog or a field, has taken focus.
- **Tabs** (Library and Field Guide) follow the WAI-ARIA tabs pattern through [`src/app/tabs.ts`](../../src/app/tabs.ts): a roving tabindex, Left/Right/Up/Down/Home/End, automatic activation, and `aria-controls` / `aria-labelledby` linking each tab to its panel.
- **Mobile bottom nav**: all destinations stay on one row while labels are collapsed. The current page gets a small bar indicator as well as a color change, so the active state does not rely on color alone.

## Screen readers

- Decorative Lucide icons are marked `aria-hidden="true"`. Icon-only buttons keep their `aria-label`.
- The Today progress ring is a `progressbar` with `aria-valuetext` (“40% of the way to 30 days”). When no date is set, or details are hidden, it is an image with a plain label. The elapsed-time counter has one readable sentence for screen readers, and the visual digits are hidden from them.
- The toast region is a polite `status`. Splash, skeleton, map loading and route changes all announce politely.
- The onboarding step dots are an image labelled “Setup step N of 3”.
- **axe-core** runs in [`src/a11y/screens.a11y.test.tsx`](../../src/a11y/screens.a11y.test.tsx) against the navigation shell, splash and skeleton, onboarding, Today, Settings, Meetings and Library, and in the map's own test. Color contrast is skipped there, because jsdom cannot render colors, and is covered by the token contrast test instead.

## Meeting map

See [Meetings](../../src/features/meetings/MeetingsPage.tsx) and [InteractiveMeetingMap](../../src/components/InteractiveMeetingMap.tsx).

- The map is lazy-loaded, and tiles are requested only after **Load interactive map** is pressed. No API key is needed (OpenStreetMap).
- Every pin is a keyboard-focusable button with a label such as “Modesto, 1 Main St: 2 meetings. Press Enter for details.”
- The venue list is open by default. Arrow keys move through it, and choosing a venue centers the map and shows that venue's meetings and official links in an inline, polite region. The popup is never the only way to reach the information.
- **Location is opt-in only.** Nothing asks for a position until **Show my approximate position** is pressed. The browser then asks for permission, and the request uses `enableHighAccuracy: false`. The position stays in component memory, is used only to sort venues by distance on the device, is never saved or sent to Stillpoint, and is cleared by **Remove my position** or by closing the map. Centering the map there does make OpenStreetMap tile requests for that area, and the UI says so.
- The position marker is DOM-based rather than canvas, so it also works where canvas is blocked for anti-fingerprinting.
