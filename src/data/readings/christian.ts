import type { ReadingEntry, RecoveryTheme } from '../../domain/types';
import { scriptureEntries } from '../scripture';

/**
 * Christian readings reuse the existing King James Version scripture entries, so their IDs,
 * saved favorites and "explored" history keep working unchanged.
 */
const themes: Record<string, RecoveryTheme> = {
  'romans-15-13': 'patience',
  'philippians-4-13': 'surrender',
  'romans-12-2': 'craving',
  'james-1-2-4': 'patience',
  'romans-8-1': 'shame',
  'matthew-6-34': 'surrender',
  'ecclesiastes-4-9-10': 'community',
  '2-corinthians-5-17': 'shame',
  'philippians-4-6-7': 'gratitude',
  'psalm-51-10': 'shame',
  'lamentations-3-22-23': 'gratitude',
  'matthew-11-28': 'surrender',
  '2-corinthians-12-9': 'surrender',
  'galatians-6-2': 'service',
  'james-5-16': 'community',
};

export const christianReadings: ReadingEntry[] = scriptureEntries.map((entry) => ({
  id: entry.id,
  tradition: 'christian',
  kind: 'verbatim',
  source: 'Holy Bible',
  citation: entry.reference,
  translation: 'King James Version (1611 Authorized Version)',
  license: 'public-domain',
  licenseNote: 'The King James Version is public domain in the United States and most countries (in the UK it is subject to Crown letters patent).',
  text: entry.verse,
  reflectionPrompt: entry.application,
  recoveryTheme: themes[entry.id] ?? 'patience',
  context: entry.explanation,
  closing: entry.contemplation,
}));
