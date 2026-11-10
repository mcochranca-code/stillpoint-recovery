#!/usr/bin/env node
/* global process, console, fetch, setTimeout, window, document, HTMLElement, indexedDB, requestAnimationFrame, performance, history, PopStateEvent -- Node script; page.evaluate callbacks run in the browser. */
/**
 * Record the self-hosted walkthrough video (public/media/) and the README animation (docs/media/).
 *
 *   pnpm walkthrough                                  # builds, serves dist with `vite preview`, records, encodes
 *   node scripts/capture-walkthrough.mjs --no-build   # reuse an existing dist/
 *   node scripts/capture-walkthrough.mjs --encode-only  # re-encode the take kept by WALKTHROUGH_KEEP_RAW=1
 *
 * The tour uses the same SAMPLE data as scripts/capture-screenshots.mjs, entered through the app's
 * own onboarding plus a few IndexedDB records: a recovery date 97 days ago, the Christian (KJV,
 * public domain) tradition, a sample intention, two completed practice sessions and a one-tap
 * "Hopeful" check-in. No real journal text, no NA reading text and no licensed quotations.
 *
 * Setup runs in a context that is not recorded. Its storage (IndexedDB included) is handed to a
 * second, recorded context, so the video starts on Today and never shows onboarding.
 *
 * Outputs (no audio track in any of them):
 *   public/media/walkthrough.webm          VP9
 *   public/media/walkthrough.mp4           H.264, yuv420p, +faststart
 *   public/media/walkthrough-poster.webp   first frame of the tour
 *   docs/media/walkthrough.webp            animated WebP for the README (~300 px wide, 10 fps)
 *
 * Requirements: a Chromium/Chrome (CHROMIUM_PATH, default /usr/bin/chromium) and ffmpeg on PATH.
 * Playwright's video recorder also needs its own ffmpeg; if `npx playwright install ffmpeg` cannot
 * download it, link the system binary there, for example:
 *   mkdir -p ~/.cache/ms-playwright/ffmpeg-1013 && ln -sf "$(command -v ffmpeg)" ~/.cache/ms-playwright/ffmpeg-1013/ffmpeg-linux
 *
 * Environment:
 *   CHROMIUM_PATH   Chromium/Chrome executable (default /usr/bin/chromium)
 *   PREVIEW_PORT    port for `vite preview` (default 4320)
 *   WALKTHROUGH_KEEP_RAW=1  keep the raw Playwright recording in .walkthrough-raw/ (do not commit)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = join(root, 'public', 'media');
const docsMediaDir = join(root, 'docs', 'media');
const rawDir = join(root, '.walkthrough-raw');
const port = Number(process.env.PREVIEW_PORT ?? 4320);
const base = `http://127.0.0.1:${port}`;
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const VIEWPORT = { width: 390, height: 844 };
// Playwright's recorder captures at most the CSS viewport size (it never scales up), so record 1:1.
const RECORD_SIZE = { ...VIEWPORT };
const LIMITS = { video: 2.5 * 1024 * 1024, readme: 3 * 1024 * 1024 };

const SAMPLE = {
  daysAgo: 97,
  tradition: 'christian',
  intention: 'One honest day at a time.',
};

function localDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise((done) => setTimeout(done, 300));
  }
  throw new Error(`vite preview did not answer at ${url}`);
}

/** Seed sample practice records straight into the app's IndexedDB (Dexie database "StillpointRecovery"). */
async function seedPractice(page) {
  await page.evaluate(async () => {
    const stamp = (daysAgo, hour) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hour, 0, 0, 0);
      return date.toISOString();
    };
    const sessions = [
      { id: 'sample-session-1', exerciseId: 'calm-breathing', exerciseName: 'Calm Breathing', plannedMinutes: 5, elapsedSeconds: 300, startedAt: stamp(2, 7), completedAt: stamp(2, 7), status: 'completed' },
      { id: 'sample-session-2', exerciseId: 'calm-breathing', exerciseName: 'Calm Breathing', plannedMinutes: 2, elapsedSeconds: 120, startedAt: stamp(1, 21), completedAt: stamp(1, 21), status: 'completed' },
    ];
    await new Promise((resolveSeed, rejectSeed) => {
      const open = indexedDB.open('StillpointRecovery');
      open.onerror = () => rejectSeed(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const tx = database.transaction(['meditationSessions'], 'readwrite');
        for (const session of sessions) tx.objectStore('meditationSessions').put(session);
        tx.oncomplete = () => { database.close(); resolveSeed(); };
        tx.onerror = () => rejectSeed(tx.error);
      };
    });
  });
}

function blockExternal(page) {
  // Offline and deterministic: anything not served by the preview is blocked.
  return page.route((url) => !url.href.startsWith(base) && !url.href.startsWith('data:') && !url.href.startsWith('blob:'), (route) => route.abort());
}

/** Onboard with sample data in an unrecorded context and return its storage, IndexedDB included. */
async function prepareSampleState(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'America/Los_Angeles' });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.warn('pageerror:', error.message));
  await blockExternal(page);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Make this space yours' }).click();
  await page.fill('#recovery-date', localDate(SAMPLE.daysAgo));
  await page.fill('#intention', SAMPLE.intention);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(300);
  await page.locator(`input[value='${SAMPLE.tradition}']`).first().check();
  await page.getByRole('button', { name: 'Open my space' }).click();
  await page.waitForTimeout(1500);
  await seedPractice(page);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByRole('group', { name: 'Choose how you are feeling today' }).getByRole('button', { name: 'Hopeful' }).click();
  await page.waitForTimeout(1500);
  const state = await context.storageState({ indexedDB: true });
  await context.close();
  return state;
}

/** Ease the page so `selector`'s top sits `gap` px below the viewport top, over `ms`. */
async function glideTo(page, selector, { gap = 12, ms = 1400 } = {}) {
  const target = selector ? page.locator(selector).first() : null;
  if (target) await target.waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(({ selector: css, gap: space, ms: duration }) => new Promise((done) => {
    const element = css ? document.querySelector(css) : null;
    const from = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = element ? Math.min(max, Math.max(0, element.getBoundingClientRect().top + from - space)) : 0;
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }), { selector, gap, ms });
}

const HEADINGS = { '/': 'Home', '/meditation': 'Meditation studio', '/progress': 'Progress', '/journal': 'Journal', '/settings': 'Settings' };

/** In-app navigation (no reload, so no blank flash between screens). */
async function navigate(page, route) {
  await page.evaluate((path) => {
    window.scrollTo(0, 0);
    history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo(0, 0);
  }, route);
  await page.waitForLoadState('networkidle');
  await page.locator('main h1', { hasText: HEADINGS[route] }).first().waitFor({ state: 'visible', timeout: 15000 });
  // The app moves focus to the new page heading for screen readers; drop the ring for the recording.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForTimeout(400);
}

/** The floating Home button floats over scrolling cards, which reads as a layout bug in a recording. */
async function hideFab(page) {
  await page.addStyleTag({ content: '.mobile-home-fab { visibility: hidden !important; }' });
}

function size(file) {
  return statSync(file).size;
}

function encode(raw, startSeconds) {
  mkdirSync(mediaDir, { recursive: true });
  mkdirSync(docsMediaDir, { recursive: true });
  const trim = ['-ss', startSeconds.toFixed(2), '-i', raw];
  const scale = 'fps=24';
  const webm = join(mediaDir, 'walkthrough.webm');
  const mp4 = join(mediaDir, 'walkthrough.mp4');
  const poster = join(mediaDir, 'walkthrough-poster.webp');
  const readme = join(docsMediaDir, 'walkthrough.webp');
  run('ffmpeg', ['-y', '-v', 'error', ...trim, '-an', '-vf', scale, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', webm]);
  run('ffmpeg', ['-y', '-v', 'error', ...trim, '-an', '-vf', scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  run('ffmpeg', ['-y', '-v', 'error', '-ss', (startSeconds + 0.5).toFixed(2), '-i', raw, '-frames:v', '1', '-update', '1', '-c:v', 'libwebp', '-quality', '85', poster]);
  run('ffmpeg', ['-y', '-v', 'error', ...trim, '-an', '-vf', 'fps=10,scale=300:-2:flags=lanczos', '-c:v', 'libwebp_anim', '-loop', '0', '-quality', '62', '-compression_level', '4', readme]);
  return [
    { file: webm, limit: LIMITS.video },
    { file: mp4, limit: LIMITS.video },
    { file: poster, limit: LIMITS.video },
    { file: readme, limit: LIMITS.readme },
  ];
}

async function main() {
  if (process.argv.includes('--encode-only')) {
    // Re-encode a kept take (WALKTHROUGH_KEEP_RAW=1) without recording again.
    const raw = join(rawDir, 'raw.webm');
    if (!existsSync(raw)) throw new Error('No kept recording. Run once with WALKTHROUGH_KEEP_RAW=1.');
    finish(raw, Number(readFileSync(join(rawDir, 'start.txt'), 'utf8')));
    return;
  }
  const build = !process.argv.includes('--no-build');
  if (build) run('pnpm', ['build']);
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('dist/ is missing. Run pnpm build first, or drop --no-build.');
  if (!existsSync(executablePath)) throw new Error(`Chromium not found at ${executablePath}. Set CHROMIUM_PATH.`);
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const preview = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  let raw;
  let startSeconds = 0;
  try {
    await waitForServer(base + '/');
    const storageState = await prepareSampleState(browser);

    const context = await browser.newContext({
      viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'no-preference',
      locale: 'en-US', timezoneId: 'America/Los_Angeles', storageState, recordVideo: { dir: rawDir, size: RECORD_SIZE },
    });
    const recordingStarted = Date.now();
    const page = await context.newPage();
    page.on('pageerror', (error) => console.warn('pageerror:', error.message));
    await blockExternal(page);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await hideFab(page);
    // Warm every route's lazy chunk before the tour starts, so no screen opens on a loading skeleton.
    // These visits happen before the trim point and never appear in the output.
    for (const route of ['/meditation', '/progress', '/journal', '/settings', '/']) await navigate(page, route);
    await page.locator('#sobriety-heading').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(800);
    startSeconds = (Date.now() - recordingStarted) / 1000;

    // 1. Today hero.
    await page.waitForTimeout(2600);
    // 2. The day's reflection.
    await glideTo(page, 'section.reflection-card, section:has(> .card-header .tradition-eyebrow)');
    await page.waitForTimeout(2600);
    // 3. Meditation.
    await navigate(page, '/meditation');
    await page.waitForTimeout(2600);
    // 4. Progress path, then charms.
    await navigate(page, '/progress');
    await glideTo(page, 'section:has(#progress-path-title)', { ms: 1200 });
    await page.waitForTimeout(2300);
    await glideTo(page, 'section.recent-charms', { ms: 1200 });
    await page.waitForTimeout(2300);
    // 5. Journal: stored on this device.
    await navigate(page, '/journal');
    await page.waitForTimeout(2600);
    // 6. Dark mode through the app's own Settings control, then back to Today.
    await navigate(page, '/settings');
    await glideTo(page, '#appearance-accessibility', { ms: 1000 });
    await page.waitForTimeout(700);
    await page.selectOption('#theme-setting', 'dark');
    await page.waitForTimeout(1300);
    await navigate(page, '/');
    await page.waitForTimeout(3000);

    const video = page.video();
    await context.close();
    raw = await video.path();
  } finally {
    await browser.close();
    preview.kill('SIGTERM');
  }

  // Keep the raw take and its trim point next to each other so `--encode-only` can redo the encode.
  const kept = join(rawDir, 'raw.webm');
  renameSync(raw, kept);
  writeFileSync(join(rawDir, 'start.txt'), startSeconds.toFixed(2));
  finish(kept, startSeconds);
}

function finish(raw, startSeconds) {
  const results = encode(raw, startSeconds);
  let oversized = false;
  for (const { file, limit } of results) {
    const bytes = size(file);
    const flag = bytes > limit ? `  (over ${(limit / 1024 / 1024).toFixed(1)} MB)` : '';
    if (flag) oversized = true;
    console.log(`${file.replace(root + '/', '')}  ${(bytes / 1024).toFixed(0)} KB${flag}`);
  }
  if (process.env.WALKTHROUGH_KEEP_RAW === '1') console.log(`raw recording kept at .walkthrough-raw/raw.webm (tour starts at ${startSeconds.toFixed(2)} s)`);
  else rmSync(rawDir, { recursive: true, force: true });
  if (oversized) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
