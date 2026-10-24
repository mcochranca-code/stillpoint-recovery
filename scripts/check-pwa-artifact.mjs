/* global console */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const requiredFiles = ['index.html', 'manifest.webmanifest', 'sw.js', 'precache-manifest.json', 'manus-routes.json'];

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

const precache = JSON.parse(await readFile(resolve(dist, 'precache-manifest.json'), 'utf8'));
if (!Array.isArray(precache.assets) || precache.assets.length === 0) {
  throw new Error('Precache manifest must contain at least one asset');
}

const serviceWorker = await readFile(resolve(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('precache-manifest.json')) {
  throw new Error('Service worker does not reference the generated precache manifest');
}

console.log(`Verified PWA artifact: ${requiredFiles.length} required files, ${routes.routes.length} routes, ${precache.assets.length} precached assets`);
