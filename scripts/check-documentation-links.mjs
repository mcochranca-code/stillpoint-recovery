#!/usr/bin/env node
/* global AbortController, clearTimeout, console, fetch, setTimeout */

import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DOCUMENT_ROOTS = ['README.md', 'TODO.md', 'plan.md', 'docs'];
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_EXTERNAL_RETRIES = 3;
const USER_AGENT = 'stillpoint-recovery-docs-checker/1.0';
const errors = [];
const warnings = [];
const localLinks = new Map();
const externalLinks = new Set();
const headingsByFile = new Map();
const pdfPageCounts = new Map();

function reportError(message) {
  errors.push(message);
  console.error(`ERROR ${message}`);
}

function reportWarning(message) {
  warnings.push(message);
  console.warn(`WARN  ${message}`);
}

async function collectMarkdownFiles(entry) {
  const absolute = path.resolve(ROOT, entry);
  const info = await stat(absolute);
  if (info.isFile()) return absolute.endsWith('.md') ? [absolute] : [];
  const files = [];
  for (const name of await readdir(absolute)) {
    if (IGNORED_DIRECTORIES.has(name)) continue;
    files.push(...await collectMarkdownFiles(path.join(absolute, name)));
  }
  return files;
}

function githubHeadingSlug(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{Letter}\p{Number} -]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractReferences(file, text) {
  const headings = new Set();
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) headings.add(githubHeadingSlug(match[1]));
  headingsByFile.set(file, headings);

  const references = [];
  for (const match of text.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g)) {
    references.push(match[1] ?? match[2]);
  }
  for (const match of text.matchAll(/\bhref=["']([^"']+)["']/gi)) references.push(match[1]);
  return references;
}

function getPdfPageCount(file) {
  if (pdfPageCounts.has(file)) return pdfPageCounts.get(file);
  try {
    const output = execFileSync('pdfinfo', [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = output.match(/^Pages:\s+(\d+)$/m);
    const count = match ? Number(match[1]) : null;
    pdfPageCounts.set(file, count);
    return count;
  } catch {
    reportWarning(`pdfinfo is unavailable; PDF page upper bounds cannot be checked for ${path.relative(ROOT, file)}`);
    pdfPageCounts.set(file, null);
    return null;
  }
}

function parseTarget(rawTarget) {
  const target = rawTarget.trim();
  if (!target || target.startsWith('mailto:') || target.startsWith('javascript:') || target.startsWith('data:')) return null;
  if (/^https?:\/\//i.test(target)) return { kind: 'external', url: target };
  const [withoutFragment, fragment = ''] = target.split('#', 2);
  return { kind: 'local', path: withoutFragment, fragment };
}

async function checkLocalLink(sourceFile, rawTarget) {
  const parsed = parseTarget(rawTarget);
  if (!parsed) return;
  if (parsed.kind === 'external') {
    externalLinks.add(parsed.url);
    return;
  }

  let targetPath = parsed.path ? path.resolve(path.dirname(sourceFile), decodeURIComponent(parsed.path)) : sourceFile;
  try {
    await stat(targetPath);
  } catch {
    if (parsed.path && !path.extname(targetPath)) {
      const markdownCandidate = `${targetPath}.md`;
      try {
        await stat(markdownCandidate);
        targetPath = markdownCandidate;
      } catch {
        // Keep the original path so the standard missing-reference error is useful.
      }
    }
  }
  const relativeSource = path.relative(ROOT, sourceFile);
  const relativeTarget = path.relative(ROOT, targetPath);
  try {
    const info = await stat(targetPath);
    if (!info.isFile() && !info.isDirectory()) reportError(`${relativeSource}: local reference is not a file or directory: ${rawTarget}`);
  } catch {
    reportError(`${relativeSource}: missing local reference: ${rawTarget}`);
    return;
  }

  if (parsed.fragment && targetPath.toLowerCase().endsWith('.pdf')) {
    const pageMatch = parsed.fragment.match(/^page=(\d+)$/i);
    if (pageMatch) {
      const page = Number(pageMatch[1]);
      const pageCount = getPdfPageCount(targetPath);
      if (page < 1 || (pageCount !== null && page > pageCount)) {
        reportError(`${relativeSource}: PDF page target is outside ${relativeTarget}: ${rawTarget}`);
      }
    }
  } else if (parsed.fragment && targetPath.toLowerCase().endsWith('.md')) {
    const headings = headingsByFile.get(targetPath);
    if (headings && !headings.has(parsed.fragment.toLowerCase())) {
      reportError(`${relativeSource}: missing Markdown anchor ${rawTarget}`);
    }
  } else if (parsed.fragment && targetPath === sourceFile) {
    const headings = headingsByFile.get(sourceFile);
    if (headings && !headings.has(parsed.fragment.toLowerCase())) {
      reportError(`${relativeSource}: missing Markdown anchor ${rawTarget}`);
    }
  }
}

async function fetchWithTimeout(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: 'manual',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/pdf,*/*' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkExternalLink(url) {
  let lastProblem = 'unknown failure';
  for (let attempt = 1; attempt <= MAX_EXTERNAL_RETRIES; attempt += 1) {
    try {
      let response = await fetchWithTimeout(url, 'HEAD');
      if ([405, 501].includes(response.status)) response = await fetchWithTimeout(url, 'GET');
      if (response.status >= 200 && response.status < 400) return;
      if ([401, 403, 429].includes(response.status)) {
        reportWarning(`${url}: external server returned ${response.status}; URL could not be fully verified`);
        return;
      }
      lastProblem = `HTTP ${response.status}`;
      if (![408, 425, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  reportError(`${url}: external link check failed after ${MAX_EXTERNAL_RETRIES} attempts (${lastProblem})`);
}

function assertReference(file, requiredText) {
  if (!requiredText.every((text) => file.includes(text))) {
    reportError(`Required copyright or documentation reference is missing: ${requiredText.join(' | ')}`);
  }
}

async function main() {
  const files = (await Promise.all(DOCUMENT_ROOTS.map(collectMarkdownFiles))).flat().sort();
  if (files.length === 0) reportError('No Markdown documentation files were found');

  const documents = new Map();
  for (const file of files) documents.set(file, await readFile(file, 'utf8'));
  for (const [file, text] of documents) extractReferences(file, text);
  for (const [file, text] of documents) {
    for (const target of extractReferences(file, text)) {
      const parsed = parseTarget(target);
      if (parsed?.kind === 'local') localLinks.set(`${file}\0${target}`, { file, target });
      if (parsed?.kind === 'external') externalLinks.add(parsed.url);
    }
  }
  for (const { file, target } of localLinks.values()) await checkLocalLink(file, target);
  for (const url of [...externalLinks].sort()) await checkExternalLink(url);

  const readme = documents.get(path.resolve(ROOT, 'README.md')) ?? '';
  const copyright = documents.get(path.resolve(ROOT, 'docs/copyright/README.md')) ?? '';
  const index = documents.get(path.resolve(ROOT, 'docs/copyright/Just-for-Today-index.md')) ?? '';
  assertReference(readme, ['LICENSE', 'docs/copyright/README.md', 'docs/copyright/Just-for-Today-index.md', 'NA World Services', 'Not affiliated']);
  assertReference(copyright, ['© 1991 Narcotics Anonymous World Services, Inc.', 'All rights reserved.', 'MIT License', 'not affiliated']);
  const indexedPdfLinks = [...index.matchAll(/\]\(Just-for-Today-NA\.pdf#page=(\d+)\)/g)].map((match) => Number(match[1]));
  if (indexedPdfLinks.length !== 366) reportError(`Expected 366 indexed NA entries, found ${indexedPdfLinks.length}`);
  if (indexedPdfLinks.some((page) => page < 9 || page > 374)) reportError('The NA index contains a PDF page outside the expected 9–374 range');

  console.log(`Checked ${files.length} Markdown files, ${localLinks.size} local references, and ${externalLinks.size} external URLs.`);
  if (warnings.length) console.log(`Completed with ${warnings.length} warning(s).`);
  if (errors.length) {
    console.error(`Failed with ${errors.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log('Documentation link, reference, and attribution checks passed.');
  }
}

await main();
