import { describe, expect, it } from 'vitest';
import { naChapters, naStepGuides, NA_STEP_GUIDES_CREDIT, stepQuestions } from '.';

// Counted from the source PDF (bullet questions, plus two questions printed without a bullet).
const EXPECTED_QUESTIONS: Record<number, number> = { 1: 68, 2: 47, 3: 39, 4: 82, 5: 28, 6: 22, 7: 21, 8: 17, 9: 28, 10: 52, 11: 28, 12: 26 };

const TWELVE_STEPS = [
  'We admitted we were powerless over our addiction, that our lives had become unmanageable.',
  'We came to believe that a Power greater than ourselves could restore us to sanity.',
  'We made a decision to turn our will and our lives over to the care of God as we understood Him.',
  'We made a searching and fearless moral inventory of ourselves.',
  'We admitted to God, to ourselves, and to another human being the exact nature of our wrongs.',
  'We were entirely ready to have God remove all these defects of character.',
  'We humbly asked Him to remove our shortcomings.',
  'We made a list of all persons we had harmed, and became willing to make amends to them all.',
  'We made direct amends to such people wherever possible, except when to do so would injure them or others.',
  'We continued to take personal inventory and when we were wrong promptly admitted it.',
  'We sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.',
  'Having had a spiritual awakening as a result of these steps, we tried to carry this message to addicts, and to practice these principles in all our affairs.',
];

const allText = () => [
  ...naStepGuides.preface.paragraphs,
  ...naStepGuides.steps.flatMap((step) => [step.text, ...step.sections.flatMap((section) => [section.heading ?? '', ...section.blocks.map((block) => block.text)])]),
];

describe('NA Step Working Guides content integrity', () => {
  it('has a preface and all twelve steps in order, with the step wording', () => {
    expect(naStepGuides.preface.paragraphs).toHaveLength(8);
    expect(naStepGuides.preface.paragraphs[0]).toMatch(/^The idea for this piece of literature came from the Narcotics Anonymous Fellowship itself\./);
    expect(naStepGuides.preface.signature).toBe('WSC Literature Committee');
    expect(naStepGuides.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(naStepGuides.steps.map((step) => step.text)).toEqual(TWELVE_STEPS);
    expect(naChapters.map((chapter) => chapter.id)).toEqual(['preface', ...TWELVE_STEPS.map((_, index) => `step-${index + 1}`)]);
  });

  it('keeps the expected number of questions per step, numbered 1…n with stable unique IDs', () => {
    const ids = new Set<string>();
    for (const step of naStepGuides.steps) {
      const questions = stepQuestions(step);
      expect([step.number, questions.length]).toEqual([step.number, EXPECTED_QUESTIONS[step.number]]);
      questions.forEach((question, index) => {
        expect(question.number).toBe(index + 1);
        expect(question.id).toBe(`s${step.number}-q${String(index + 1).padStart(3, '0')}`);
        ids.add(question.id);
      });
    }
    expect(ids.size).toBe(458);
  });

  it('keeps every step section titled except the opening narrative, and every section non-empty', () => {
    for (const step of naStepGuides.steps) {
      expect(step.sections[0]?.heading).toBeNull();
      expect(step.sections.slice(1).every((section) => typeof section.heading === 'string' && section.heading.length > 0)).toBe(true);
      expect(step.sections.every((section) => section.blocks.length > 0)).toBe(true);
      expect(step.sections.at(-1)?.heading).toBe('Moving On');
    }
  });

  it('spot-checks wording against the source PDF', () => {
    const step1 = naStepGuides.steps[0]!;
    expect(stepQuestions(step1)[0]?.text).toBe('What does "the disease of addiction" mean to me?');
    expect(step1.sections[1]?.blocks[0]?.text).toBe('What makes us addicts is the disease of addiction—not the drugs, not our behavior, but our disease. There is something within us that makes us unable to control our use of drugs. This same "something" also makes us prone to obsession and compulsion in other areas of our lives. How can we tell when our disease is active? When we become trapped in obsessive, compulsive, self-centered routines, endless loops that lead nowhere but to physical, mental, spiritual, and emotional decay.');
    const step10 = stepQuestions(naStepGuides.steps[9]!);
    expect(step10.find((question) => question.text === 'Have I allowed myself to become too hungry, angry, lonely, or tired?')).toBeDefined();
    expect(stepQuestions(naStepGuides.steps[5]!).map((question) => question.text)).toContain('List each defect, and give a brief definition of it.');
    expect(naStepGuides.preface.paragraphs[3]).toContain('the needs of the fellowship—literature that "grows" along with the fellowship.');
  });

  it('contains no leftover extraction artefacts', () => {
    const text = allText().join('\n');
    expect(text.replace(/1980s|WSC'95/g, '')).not.toMatch(/[A-Za-z][0-9]|[0-9][A-Za-z]/);
    expect(text).not.toMatch(/ - |--|~|\u2018|\u2019|\u201c|\u201d/);
    expect(text).not.toMatch(/\bm (our|order|life)\b|afready|causmg|Wzy|face-to4ace|\bwe (re|ve) /);
    expect(text).not.toMatch(/[a-z][.?!][A-Z]/);
    expect(text).not.toMatch(/\s[,.;:?!]/);
    const loose = allText().filter((entry) => entry !== entry.trim() || /\s{2,}/.test(entry));
    expect(loose).toEqual([]);
  });

  it('carries the required credit', () => {
    expect(NA_STEP_GUIDES_CREDIT.copyright).toBe('Copyright © 1998, World Service Office, Inc. Reprinted by permission. All rights reserved.');
    expect(naStepGuides.sourceCopyright).toBe(NA_STEP_GUIDES_CREDIT.copyright);
    expect(NA_STEP_GUIDES_CREDIT.approved).toBe('This is NA Fellowship-approved literature.');
    expect(NA_STEP_GUIDES_CREDIT.disclaimer).toMatch(/not affiliated with.*not endorsed by.*Narcotics Anonymous/);
  });
});
