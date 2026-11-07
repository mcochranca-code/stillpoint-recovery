/**
 * Lightweight facts about the NA Step Working Guides reader. Kept apart from the guide text so the
 * Library card and the About section do not pull the whole guide into their bundles.
 */
export const NA_STEP_GUIDES_READER_ID = 'na-step-guides';
export const NA_STEP_GUIDES_PATH = '/library/na-step-guides';
export const NA_STEP_GUIDES_TITLE = 'NA Step Working Guides';

/** Required credit, shown on the reader's title screen and in About. */
export const NA_STEP_GUIDES_CREDIT = {
  copyright: 'Copyright © 1998, World Service Office, Inc. Reprinted by permission. All rights reserved.',
  approved: 'This is NA Fellowship-approved literature.',
  disclaimer: 'Stillpoint is not affiliated with, and is not endorsed by, Narcotics Anonymous or NA World Services.',
} as const;

const STEP_NAMES = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** "Preface" or "Step Four" for a chapter ID, without loading the guide text. */
export function naChapterTitle(chapterId: string): string | null {
  if (chapterId === 'preface') return 'Preface';
  const match = /^step-(\d{1,2})$/.exec(chapterId);
  const name = match ? STEP_NAMES[Number(match[1]) - 1] : undefined;
  return name ? `Step ${name}` : null;
}
