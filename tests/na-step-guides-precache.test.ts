import { describe, expect, it } from 'vitest';
import { NA_TEXT_CHUNK_NAME, naStepGuideFiles, naTextFingerprint } from '../scripts/na-step-guides-chunk.mjs';

describe('NA Step Working Guides are kept out of the offline precache', () => {
  it('finds the reader page, its stylesheet and the guide-text chunk in a Vite manifest', () => {
    const files = naStepGuideFiles({
      'index.html': { file: 'assets/index-abc.js', src: 'index.html', isEntry: true },
      'src/features/na-step-guides/NaStepGuidesPage.tsx': { file: 'assets/NaStepGuidesPage-1.js', src: 'src/features/na-step-guides/NaStepGuidesPage.tsx', css: ['assets/NaStepGuidesPage-1.css'] },
      'src/features/na-step-guides/NaStepGuidesRoute.tsx': { file: 'assets/NaStepGuidesRoute-2.js', src: 'src/features/na-step-guides/NaStepGuidesRoute.tsx' },
      '_na-step-guides-text-3.js': { file: `assets/${NA_TEXT_CHUNK_NAME}-3.js`, name: NA_TEXT_CHUNK_NAME },
    });
    expect([...files].sort()).toEqual(['assets/NaStepGuidesPage-1.css', 'assets/NaStepGuidesPage-1.js', `assets/${NA_TEXT_CHUNK_NAME}-3.js`]);
    // The small opt-in gate holds no guide text and may be precached.
    expect(files.has('assets/NaStepGuidesRoute-2.js')).toBe(false);
  });

  it('reads a fingerprint of the guide text for the artifact check', async () => {
    const fingerprint = await naTextFingerprint(process.cwd());
    expect(fingerprint.length).toBe(60);
  });
});
