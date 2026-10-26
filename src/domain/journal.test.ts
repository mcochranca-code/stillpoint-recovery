import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReflectionJournalEntry } from './journal';

afterEach(() => vi.useRealTimers());

describe('createReflectionJournalEntry', () => {
  it('creates a journal entry containing the full reflection and its theme', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T12:00:00.000Z'));

    const entry = createReflectionJournalEntry({
      id: 'reflection-001',
      title: 'Room for This Moment',
      theme: 'Acceptance',
      reading: 'Make room for what is present.',
      principle: 'Notice without judgment.',
      practice: 'Take one caring step.',
      question: 'What is possible now?',
    });

    expect(entry).toMatchObject({
      id: expect.stringMatching(/^journal:/),
      type: 'daily-reflection',
      title: 'Room for This Moment',
      body: 'Make room for what is present.\n\nA principle for today: Notice without judgment.\n\nA small practice: Take one caring step.\n\nTo consider: What is possible now?',
      createdAt: '2026-10-24T12:00:00.000Z',
      updatedAt: '2026-10-24T12:00:00.000Z',
      tags: ['Acceptance'],
      gratitude: [],
    });
  });
});
