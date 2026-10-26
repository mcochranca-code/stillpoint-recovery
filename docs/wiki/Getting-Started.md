# Getting Started

## Requirements

- Node.js 22 or another current Node.js release compatible with the pinned toolchain.
- pnpm 11.25.0, pinned in `package.json`.
- A modern browser with IndexedDB and service-worker support for the full PWA experience.

## Run the development app

```sh
git clone https://github.com/mcochranca-code/stillpoint-recovery.git
cd stillpoint-recovery
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Vite is configured for port 3000 and binds to all interfaces so it can be previewed from an approved development environment.

Onboarding can be skipped. A recovery date is optional, and the app remains usable as a reflection, journaling, meditation, and support companion.

## Production build

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

The build writes `dist/`, including the Vite output, manifest, service worker, and generated `precache-manifest.json`.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm typecheck` | Run strict TypeScript diagnostics. |
| `pnpm lint` | Run ESLint across the repository. |
| `pnpm test` | Run the Vitest and Testing Library suite. |
| `pnpm build` | Create the production PWA and precache manifest. |
| `pnpm preview` | Serve the production build locally. |
