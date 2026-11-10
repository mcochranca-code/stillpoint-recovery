import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { naStepGuideFiles } from './na-step-guides-chunk.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const viteManifestPath = path.join(dist, '.vite', 'manifest.json');
const viteManifest = JSON.parse(await readFile(viteManifestPath, 'utf8'));
// The opt-in NA Step Working Guides reader and its text are never precached; see na-step-guides-chunk.mjs.
const naFiles = naStepGuideFiles(viteManifest);
const generatedFiles = Object.values(viteManifest)
  .flatMap((entry) => [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])])
  .filter((file) => file && !naFiles.has(file));

async function walk(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await walk(absolute));
    else result.push(absolute);
  }
  return result;
}

const publicAssetRoot = path.join(root, 'public', 'assets');
const publicAssets = (await walk(publicAssetRoot))
  .filter((file) => /\.(?:svg|png|jpe?g|webp|gif|css|woff2?|mp3)$/i.test(file)
    && !path.relative(publicAssetRoot, file).split(path.sep).includes('reference'))
  .map((file) => `/${path.posix.join('assets', path.relative(publicAssetRoot, file).split(path.sep).join('/'))}`);

const themeManifestRoot = path.join(root, 'public/theme-manifests');
const themeManifests = (await readdir(themeManifestRoot))
  .filter((file) => file.endsWith('.webmanifest'))
  .map((file) => `/theme-manifests/${file}`);

const core = ['/', '/manifest.webmanifest', '/manus-routes.json', '/precache-manifest.json'];
const generated = generatedFiles.filter(Boolean).map((file) => `/${file}`);
const assets = [...new Set([...core, ...themeManifests, ...publicAssets, ...generated])].sort();
await writeFile(path.join(dist, 'precache-manifest.json'), `${JSON.stringify({ assets }, null, 2)}\n`);
