/**
 * The Narcotics Anonymous Step Working Guides, as structured local content.
 *
 * NOT MIT-LICENSED. Copyright © 1998, World Service Office, Inc. Reprinted by permission.
 * All rights reserved. Used by permission of NA World Services (see CONTENT_SOURCES.md).
 * The wording is the guide's own; only extraction artefacts were cleaned
 * (see docs/copyright/na-step-working-guides.md). Do not edit the text.
 */
import guide from './guide.json';

export type NaGuideBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'question'; id: string; number: number; text: string };

export interface NaGuideSection {
  id: string;
  /** null for the untitled opening narrative of a step. */
  heading: string | null;
  blocks: NaGuideBlock[];
}

export interface NaGuideStep {
  number: number;
  id: string;
  title: string;
  /** The wording of the step itself. */
  text: string;
  sections: NaGuideSection[];
  /** Pages in the source PDF, for spot checks. */
  pageRange: [number, number];
}

export interface NaStepGuides {
  title: string;
  approved: string;
  sourceCopyright: string;
  preface: { id: 'preface'; title: string; paragraphs: string[]; signature: string };
  steps: NaGuideStep[];
}

export const naStepGuides = guide as unknown as NaStepGuides;

export { NA_STEP_GUIDES_CREDIT, NA_STEP_GUIDES_PATH, NA_STEP_GUIDES_READER_ID, NA_STEP_GUIDES_TITLE, naChapterTitle } from './meta';

export type NaChapterId = 'preface' | `step-${number}`;

export interface NaChapterSummary {
  id: string;
  title: string;
  subtitle?: string;
  stepNumber?: number;
  questionCount: number;
}

export function stepQuestions(step: NaGuideStep) {
  return step.sections.flatMap((section) => section.blocks.filter((block): block is Extract<NaGuideBlock, { type: 'question' }> => block.type === 'question'));
}

/** Preface, then Steps One to Twelve, in reading order. */
export const naChapters: NaChapterSummary[] = [
  { id: 'preface', title: naStepGuides.preface.title, questionCount: 0 },
  ...naStepGuides.steps.map((step) => ({ id: step.id, title: step.title, subtitle: step.text, stepNumber: step.number, questionCount: stepQuestions(step).length })),
];

export function findStep(chapterId: string | undefined): NaGuideStep | undefined {
  return naStepGuides.steps.find((step) => step.id === chapterId);
}

export function isNaChapterId(value: string | undefined): value is NaChapterId {
  return naChapters.some((chapter) => chapter.id === value);
}

/** Split `*emphasis*` (book titles in the source) into plain and emphasized runs. */
export function emphasisRuns(text: string): Array<{ text: string; em: boolean }> {
  return text.split(/(\*[^*]+\*)/).filter(Boolean).map((part) => (
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? { text: part.slice(1, -1), em: true } : { text: part, em: false }
  ));
}
