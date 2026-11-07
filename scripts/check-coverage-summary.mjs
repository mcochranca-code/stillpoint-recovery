/* global console, process */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const requiredCoverage = {
  'src/db/backup.ts': { lines: 80, branches: 80, functions: 90 },
  'src/db/database.ts': { lines: 90, branches: 80, functions: 60 },
  'src/db/repository.ts': { lines: 85, branches: 80, functions: 95 },
  'src/domain/journal.ts': { lines: 95, branches: 95, functions: 95 },
  'src/domain/time.ts': { lines: 85, branches: 80, functions: 75 },
  'src/app/Onboarding.tsx': { lines: 90, branches: 50, functions: 30 },
  'src/features/journal/JournalPage.tsx': { lines: 85, branches: 70, functions: 60 },
  'src/features/meditation/MeditationPage.tsx': { lines: 70, branches: 65, functions: 50 },
  'src/features/today/TodayPage.tsx': { lines: 80, branches: 30, functions: 25 },
};

const report = JSON.parse(await readFile(resolve('coverage/coverage-summary.json'), 'utf8'));
const entries = Object.entries(report).map(([file, metrics]) => [file.replaceAll('\\', '/'), metrics]);
const failures = [];

for (const [path, thresholds] of Object.entries(requiredCoverage)) {
  const entry = entries.find(([file]) => file.endsWith(`/${path}`));
  if (!entry) {
    failures.push(`${path}: no coverage data was reported`);
    continue;
  }

  const [, metrics] = entry;
  for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = metrics[metric].pct;
    if (actual < threshold) failures.push(`${path} ${metric}: ${actual}% is below ${threshold}%`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Critical-module coverage passed for ${Object.keys(requiredCoverage).length} files.`);
}
