import { db } from './database';
import { NA_STEP_GUIDES_READER_ID } from '../data/na-step-guides/meta';
import type { ReaderProgress, ReaderTextSize } from '../domain/types';

export const MAX_STEP_ANSWER_LENGTH = 20000;

/**
 * Save (or, when blank, remove) one private step-work answer. Answers live only in this
 * browser's IndexedDB; nothing is sent anywhere.
 */
export async function saveStepAnswer(questionId: string, stepNumber: number, text: string): Promise<void> {
  const value = text.slice(0, MAX_STEP_ANSWER_LENGTH);
  if (!value.trim()) {
    await db.stepWorkAnswers.delete(questionId);
    return;
  }
  const now = new Date().toISOString();
  const existing = await db.stepWorkAnswers.get(questionId);
  await db.stepWorkAnswers.put({ id: questionId, questionId, stepNumber, text: value, createdAt: existing?.createdAt ?? now, updatedAt: now });
}

export const DEFAULT_READER_TEXT_SIZE: ReaderTextSize = 'default';

export async function getReaderProgress(): Promise<ReaderProgress | undefined> {
  return db.readerProgress.get(NA_STEP_GUIDES_READER_ID);
}

/** Remember where the person is reading (and their reader text size). */
export async function saveReaderProgress(update: Partial<Pick<ReaderProgress, 'chapterId' | 'sectionId' | 'textSize'>>): Promise<void> {
  const existing = await getReaderProgress();
  const chapterChanged = update.chapterId !== undefined && update.chapterId !== existing?.chapterId;
  const next: ReaderProgress = {
    id: NA_STEP_GUIDES_READER_ID,
    chapterId: update.chapterId ?? existing?.chapterId ?? 'preface',
    textSize: update.textSize ?? existing?.textSize ?? DEFAULT_READER_TEXT_SIZE,
    updatedAt: new Date().toISOString(),
  };
  const sectionId = 'sectionId' in update ? update.sectionId : chapterChanged ? undefined : existing?.sectionId;
  if (sectionId) next.sectionId = sectionId;
  await db.readerProgress.put(next);
}
