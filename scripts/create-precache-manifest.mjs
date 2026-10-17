import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const viteManifestPath = path.join(dist, '.vite', 'manifest.json');
const viteManifest = JSON.parse(await readFile(viteManifestPath, 'utf8'));
const generatedFiles = Object.values(viteManifest).flatMap((entry) => [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]);

async function walk(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await walk(absolute));
    else result.push(absolute);
  }
  return result;
}

const publicAssets = (await walk(path.join(root, 'public', 'assets')))
  .filter((file) => /\.(?:svg|png|jpe?g|webp|gif|css|woff2?)$/i.test(file))
  .map((file) => `/${path.posix.join('assets', path.relative(path.join(root, 'public', 'assets'), file).split(path.sep).join('/'))}`);

const core = ['/', '/manifest.webmanifest', '/manus-routes.json', '/precache-manifest.json'];
const generated = generatedFiles.filter(Boolean).map((file) => `/${file}`);
const assets = [...new Set([...core, ...publicAssets, ...generated])].sort();
await writeFile(path.join(dist, 'precache-manifest.json'), `${JSON.stringify({ assets }, null, 2)}\n`);
