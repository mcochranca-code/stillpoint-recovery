#!/usr/bin/env node
/* global process, console, fetch, setTimeout, window, indexedDB -- Node script; page.evaluate callbacks run in the browser. */
/**
 * Capture the README phone screenshots into docs/media/.
 *
 *   pnpm screenshots            # builds, serves dist with `vite preview`, captures, optimizes
 *   node scripts/capture-screenshots.mjs --no-build   # reuse an existing dist/
 *
 * Every shot uses SAMPLE data only, entered through the app's own onboarding plus a few
 * IndexedDB records: a recovery date 97 days ago, the Christian (KJV, public domain)
 * tradition, a sample intention, two completed practice sessions and a one-tap
 * "Hopeful" check-in. No real journal text.
 *
 * Environment:
 *   CHROMIUM_PATH   Chromium/Chrome executable (default /usr/bin/chromium)
 *   PREVIEW_PORT    port for `vite preview` (default 4319)
 *   SCREENSHOT_DEBUG=1  also write full-page captures to docs/media/.debug/ (for checking; do not commit)
 *
 * The floating Home button is hidden in every capture so it never covers text.
 * PNGs are compressed with pngquant and oxipng when they are on PATH. Anything still over
 * 400 KB is reported so it can be fixed before committing.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'media');
const debugDir = join(outDir, '.debug');
const port = Number(process.env.PREVIEW_PORT ?? 4319);
const base = `http://127.0.0.1:${port}`;
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const debug = process.env.SCREENSHOT_DEBUG === '1';
const MAX_BYTES = 400 * 1024;
const VIEWPORT = { width: 390, height: 844 };

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
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
}

function has(cmd) {
  return spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0;
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

/**
 * Scroll so `selector` sits `gap` CSS px below the top of the viewport (align "top"), or so its
 * bottom edge sits `gap` px above the bottom (align "bottom"), then let motion settle.
 */
async function scrollTo(page, { selector, align = 'top', gap = 12 }) {
  if (selector) {
    const target = page.locator(selector).first();
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.evaluate((element, { align: edge, gap: space }) => {
      const box = element.getBoundingClientRect();
      const top = edge === 'bottom'
        ? box.bottom + window.scrollY - window.innerHeight + space
        : box.top + window.scrollY - space;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }, { align, gap });
  } else {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  await page.waitForTimeout(900);
}

/**
 * The floating Home button sits over whatever scrolls beneath it, which reads as a layout bug in a
 * still image, so it is hidden for the captures. Nothing else on the page is altered.
 */
async function hideFab(page) {
  await page.addStyleTag({ content: '.mobile-home-fab { visibility: hidden !important; }' });
}

async function go(page, route) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

function optimize(file) {
  if (has('pngquant')) run('pngquant', ['--force', '--skip-if-larger', '--quality=70-92', '--strip', '--ext', '.png', file]);
  if (has('oxipng')) run('oxipng', ['-o', '4', '--strip', 'safe', '-q', file]);
  return statSync(file).size;
}

async function main() {
  const build = !process.argv.includes('--no-build');
  if (build) run('pnpm', ['build']);
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('dist/ is missing. Run pnpm build first, or drop --no-build.');
  if (!existsSync(executablePath)) throw new Error(`Chromium not found at ${executablePath}. Set CHROMIUM_PATH.`);
  mkdirSync(outDir, { recursive: true });
  if (debug) mkdirSync(debugDir, { recursive: true });

  const preview = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const results = [];
  try {
    await waitForServer(base + '/');
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.warn('pageerror:', error.message));
    // Keep the shots offline and deterministic: anything not served by the preview is blocked.
    await page.route((url) => !url.href.startsWith(base) && !url.href.startsWith('data:') && !url.href.startsWith('blob:'), (route) => route.abort());

    // Onboarding through the app's own UI.
    await go(page, '/');
    await page.getByRole('button', { name: 'Make this space yours' }).click();
    await page.fill('#recovery-date', localDate(SAMPLE.daysAgo));
    await page.fill('#intention', SAMPLE.intention);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(300);
    await page.locator(`input[value='${SAMPLE.tradition}']`).first().check();
    await page.getByRole('button', { name: 'Open my space' }).click();
    await page.waitForTimeout(1500);
    await seedPractice(page);
    // A one-tap check-in on Today (the app's own UI) awards the charms the sample activity has earned.
    await go(page, '/');
    await page.getByRole('group', { name: 'Choose how you are feeling today' }).getByRole('button', { name: 'Hopeful' }).click();
    await page.waitForTimeout(1500);

    const shots = [
      { file: '01-today.png', route: '/', selector: null },
      { file: '02-reflection.png', route: '/', selector: 'section:has(> .card-header .tradition-eyebrow)' },
      { file: '03-meditation.png', route: '/meditation', selector: null },
      { file: '04-progress.png', route: '/progress', selector: 'section:has(#progress-path-title)' },
      { file: '05-privacy.png', route: '/journal', selector: null },
      { file: '06-dark.png', route: '/', selector: null, dark: true },
    ];
    for (const shot of shots) {
      if (shot.dark) {
        // Dark mode through the app's own Settings control.
        await go(page, '/settings');
        await page.selectOption('#theme-setting', 'dark');
        await page.waitForTimeout(500);
      }
      await go(page, shot.route);
      await hideFab(page);
      await scrollTo(page, shot);
      const path = join(outDir, shot.file);
      await page.screenshot({ path });
      if (debug) await page.screenshot({ path: join(debugDir, shot.file), fullPage: true });
      results.push(path);
    }
    await context.close();
  } finally {
    await browser.close();
    preview.kill('SIGTERM');
  }

  let oversized = false;
  for (const file of results) {
    const bytes = optimize(file);
    const flag = bytes > MAX_BYTES ? '  (over 400 KB)' : '';
    if (flag) oversized = true;
    console.log(`${file.replace(root + '/', '')}  ${(bytes / 1024).toFixed(0)} KB${flag}`);
  }
  if (oversized) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
