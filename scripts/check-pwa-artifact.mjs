/* global console */

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NA_TEXT_CHUNK_NAME, naStepGuideFiles, naTextFingerprint } from './na-step-guides-chunk.mjs';

const dist = resolve('dist');
const requiredFiles = ['index.html', 'manifest.webmanifest', 'sw.js', 'precache-manifest.json', 'manus-routes.json', 'assets/branding/theme-presets.css'];

for (const relativePath of requiredFiles) {
  const path = resolve(dist, relativePath);
  const contents = await readFile(path, 'utf8');
  if (!contents.trim()) throw new Error(`PWA artifact is empty: dist/${relativePath}`);
}

const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone') throw new Error('PWA manifest must use standalone display mode');
if (manifest.start_url !== '/') throw new Error('PWA manifest must start at /');
if (manifest.scope !== '/') throw new Error('PWA manifest scope must be /');

const routes = JSON.parse(await readFile(resolve(dist, 'manus-routes.json'), 'utf8'));
if (!Array.isArray(routes.routes) || routes.routes.length === 0) {
  throw new Error('Route manifest must contain at least one route');
}
if (routes.routes.some(({ path }) => typeof path !== 'string' || !path.startsWith('/'))) {
  throw new Error('Every route manifest entry must have an absolute app path');
}
if (!routes.routes.some(({ path, title }) => path === '/' && title === 'Home')) {
  throw new Error('Route manifest must name the app-shell route Home');
}
if (!routes.routes.some(({ path }) => path === '/tokens')) {
  throw new Error('Route manifest must include the current milestone token route');
}

const precache = JSON.parse(await readFile(resolve(dist, 'precache-manifest.json'), 'utf8'));
if (!Array.isArray(precache.assets) || precache.assets.length === 0) {
  throw new Error('Precache manifest must contain at least one asset');
}
if (!precache.assets.includes('/')) {
  throw new Error('Precache manifest must include the app shell for offline navigation fallback');
}
if (precache.assets.some((asset) => typeof asset !== 'string' || !asset.startsWith('/'))) {
  throw new Error('Every precached asset must use an absolute same-origin path');
}
if (precache.assets.some((asset) => asset.startsWith('/assets/reference/'))) {
  throw new Error('Reference-only assets must not be included in the offline precache');
}

if (precache.assets.some((asset) => asset.startsWith('/media/'))) {
  throw new Error('Walkthrough video files (/media/) are streamed on demand and must not be in the offline precache');
}

// NA Step Working Guides: opt-in, personal use on this device only. Never precached, never shipped as PDFs.
const viteManifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const naFiles = naStepGuideFiles(viteManifest);
if (![...naFiles].some((file) => file.includes(`${NA_TEXT_CHUNK_NAME}-`))) {
  throw new Error(`Could not find the ${NA_TEXT_CHUNK_NAME} chunk in the build; the NA precache check cannot run`);
}
const precachedNa = precache.assets.filter((asset) => naFiles.has(asset.slice(1)) || asset.includes(NA_TEXT_CHUNK_NAME));
if (precachedNa.length > 0) {
  throw new Error(`The opt-in NA Step Working Guides files must not be in the offline precache: ${precachedNa.join(', ')}`);
}
// Only the reader page may import the text statically; everything else reaches it through the lazy route.
const staticNaImporters = Object.entries(viteManifest)
  .filter(([, entry]) => !naFiles.has(entry.file) && (entry.imports ?? []).some((key) => key.includes(NA_TEXT_CHUNK_NAME)))
  .map(([key]) => key);
if (staticNaImporters.length > 0) throw new Error(`The NA guide text must load only after opt-in, but is statically imported by: ${staticNaImporters.join(', ')}`);
const indexHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
if (indexHtml.includes(NA_TEXT_CHUNK_NAME)) throw new Error('index.html must not preload the NA guide text');
const naFingerprint = await naTextFingerprint(resolve('.'));
for (const asset of precache.assets.filter((item) => /\.(?:js|css|json|html)$/.test(item))) {
  const contents = await readFile(resolve(dist, asset.slice(1)), 'utf8');
  if (contents.includes(naFingerprint)) throw new Error(`Precached file carries the NA Step Working Guides text: ${asset}`);
}
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => (entry.isDirectory() ? listFiles(resolve(directory, entry.name)) : [resolve(directory, entry.name)])));
  return nested.flat();
}
const shippedPdfs = (await Promise.all([listFiles(dist), listFiles(resolve('public'))])).flat().filter((file) => /\.pdf$/i.test(file));
if (shippedPdfs.length > 0) throw new Error(`PDFs must not ship in public/ or dist/ (the NA source PDFs stay in docs/copyright): ${shippedPdfs.join(', ')}`);

const themePresets = JSON.parse(await readFile(resolve('src/data/theme-presets.json'), 'utf8'));
if (!Array.isArray(themePresets) || themePresets.length !== 15) throw new Error('Expected fifteen theme presets.');
for (const preset of themePresets) {
  const themeManifestPath = `/theme-manifests/${preset.id}.webmanifest`;
  const themeManifest = JSON.parse(await readFile(resolve(dist, themeManifestPath.slice(1)), 'utf8'));
  if (themeManifest.display !== 'standalone' || themeManifest.start_url !== '/' || themeManifest.scope !== '/') {
    throw new Error(`Theme install manifest is invalid: ${preset.id}`);
  }
  const iconPath = themeManifest.icons?.[0]?.src;
  if (iconPath !== `/assets/branding/theme-icons/${preset.id}.svg`) throw new Error(`Theme icon does not match its palette: ${preset.id}`);
  await readFile(resolve(dist, iconPath.slice(1)), 'utf8');
  if (!precache.assets.includes(themeManifestPath) || !precache.assets.includes(iconPath)) {
    throw new Error(`Theme install assets are not available offline: ${preset.id}`);
  }
}

const serviceWorker = await readFile(resolve(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('precache-manifest.json')) {
  throw new Error('Service worker does not reference the generated precache manifest');
}
if (!serviceWorker.includes("request.mode === 'navigate'") || !serviceWorker.includes("caches.match('/')")) {
  throw new Error('Service worker must fall back to the cached app shell when navigation is offline');
}

console.log(`Verified PWA artifact: ${requiredFiles.length} required files, ${routes.routes.length} routes, ${themePresets.length} palette icons/manifests, ${precache.assets.length} precached assets`);
