/**
 * Which build files hold the NA Step Working Guides reader and its text.
 *
 * The guide text is © NA World Services, shown by permission for personal use on this device only.
 * The reader is opt-in and off by default, so these files are never put in the offline precache:
 * the browser fetches them only after the person turns the reader on in Settings, and the service
 * worker runtime-caches them then so the reader keeps working offline afterwards.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Rollup chunk name given to the guide text in vite.config.ts. */
export const NA_TEXT_CHUNK_NAME = 'na-step-guides-text';

const NA_SOURCE_PATTERN = /^src\/(?:features\/na-step-guides\/NaStepGuidesPage\.tsx|data\/na-step-guides\/(?:index\.ts|guide\.json))$/;

/** Files (relative to dist, without a leading slash) for the reader page and the guide text. */
export function naStepGuideFiles(viteManifest) {
  const files = new Set();
  for (const [key, entry] of Object.entries(viteManifest)) {
    const source = entry.src ?? key;
    const isNa = NA_SOURCE_PATTERN.test(source) || entry.name === NA_TEXT_CHUNK_NAME
      || path.posix.basename(entry.file ?? '').startsWith(`${NA_TEXT_CHUNK_NAME}-`);
    if (!isNa) continue;
    if (entry.file) files.add(entry.file);
    for (const css of entry.css ?? []) files.add(css);
  }
  return files;
}

/**
 * A short run of the guide's own opening words, read from the source at check time so a precached
 * file that carries the NA text can be caught even if the chunk is renamed.
 */
export async function naTextFingerprint(root) {
  const guide = JSON.parse(await readFile(path.join(root, 'src/data/na-step-guides/guide.json'), 'utf8'));
  const opening = guide?.preface?.paragraphs?.[0];
  if (typeof opening !== 'string' || opening.length < 40) throw new Error('Could not read the NA guide opening for the precache check.');
  return opening.slice(0, 60);
}
