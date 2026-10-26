import type { JournalEntry, ReflectionContent } from './types';

/** Convert a bundled daily reflection into a new, editable journal entry. */
export function createReflectionJournalEntry(reflection: ReflectionContent): JournalEntry {
  return {
    id: `journal:${crypto.randomUUID()}`,
    type: 'daily-reflection',
    title: reflection.title,
    body: `${reflection.reading}\n\nA principle for today: ${reflection.principle}\n\nA small practice: ${reflection.practice}\n\nTo consider: ${reflection.question}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [reflection.theme],
    gratitude: [],
  };
}
