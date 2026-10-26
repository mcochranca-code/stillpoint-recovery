# PWA and Offline Behavior

## Installability

`public/manifest.webmanifest` declares standalone display mode, portrait orientation, the Stillpoint icon, and shortcuts for:

- Today (`/`)
- I need a moment (`/reset`)
- Living Garden (`/garden`)

After opening the app in a supported browser, use **Install app** or **Add to Home Screen** when offered.

## Service worker

`public/sw.js` uses a versioned cache name. During installation it caches the shell, manifest, declared route file, logo assets, and the generated precache manifest. The build script creates that precache list from the final production assets.

For same-origin navigation, the service worker tries the network first and falls back to a cached response or `/`. Static assets are served from cache when present and cached after a successful same-origin request. API-like and managed-storage paths are excluded.

## What offline means here

The core local experience can continue after the shell and required assets have been cached. External publisher links need connectivity when opened. A PWA cannot guarantee native widgets, background reminders, or storage persistence after the browser or operating system removes site data.

If a route appears stale during development, unregister the service worker or clear the site’s storage, then reload the production preview.
