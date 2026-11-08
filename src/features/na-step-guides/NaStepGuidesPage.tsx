import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, BookOpen, ListOrdered, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { db } from '../../db/database';
import { getReaderProgress, MAX_STEP_ANSWER_LENGTH, saveReaderProgress, saveStepAnswer } from '../../db/stepWork';
import {
  emphasisRuns, findStep, isNaChapterId, naChapters, naChapterTitle, naStepGuides, NA_STEP_GUIDES_CREDIT, NA_STEP_GUIDES_PATH,
  NA_STEP_GUIDES_TITLE, type NaGuideBlock, type NaGuideStep,
} from '../../data/na-step-guides';
import type { ReaderProgress, ReaderTextSize, StepWorkAnswer } from '../../domain/types';
import './na-step-guides.css';

const EMPTY_ANSWERS: StepWorkAnswer[] = [];
const SAVE_DELAY_MS = 700;
type Question = Extract<NaGuideBlock, { type: 'question' }>;

const TEXT_SIZES: Array<{ id: ReaderTextSize; label: string }> = [
  { id: 'small', label: 'Smaller' },
  { id: 'default', label: 'Default' },
  { id: 'large', label: 'Large' },
  { id: 'larger', label: 'Larger' },
];

function prefersReducedMotion(setting: boolean | undefined): boolean {
  if (setting) return true;
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; }
  catch { return false; }
}

/** Render source text, keeping the book's italic titles. */
function Rich({ text }: { text: string }) {
  return <>{emphasisRuns(text).map((run, index) => (run.em ? <em key={index}>{run.text}</em> : <span key={index}>{run.text}</span>))}</>;
}

function chapterHref(chapterId: string, sectionId?: string) {
  return `${NA_STEP_GUIDES_PATH}/${chapterId}${sectionId ? `#${sectionId}` : ''}`;
}

/** A quiet, text-first progress line with a decorative bar. */
function StepProgress({ answered, total, label }: { answered: number; total: number; label: string }) {
  const percent = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="na-progress">
      <span className="na-progress-text">{answered} of {total} questions answered<span className="sr-only"> in {label}</span></span>
      <span className="na-progress-track" aria-hidden="true"><span className="na-progress-fill" style={{ width: `${percent}%` }} /></span>
    </div>
  );
}

function TextSizeControl({ value }: { value: ReaderTextSize }) {
  return (
    <fieldset className="na-text-size">
      <legend>Reading text size</legend>
      <div className="na-text-size-options">
        {TEXT_SIZES.map((size) => (
          <label key={size.id} className={`na-text-size-option${value === size.id ? ' selected' : ''}`}>
            <input type="radio" name="na-text-size" value={size.id} checked={value === size.id} onChange={() => void saveReaderProgress({ textSize: size.id })} />
            <span>{size.label}</span>
          </label>
        ))}
      </div>
      <p className="fine-print">Works together with Text size in Settings.</p>
    </fieldset>
  );
}

function Credit({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="card na-credit" aria-labelledby="na-credit-heading">
      <Heading id="na-credit-heading">About this text</Heading>
      <p><strong>{NA_STEP_GUIDES_CREDIT.approved}</strong></p>
      <p>{NA_STEP_GUIDES_CREDIT.copyright}</p>
      <p className="fine-print">{NA_STEP_GUIDES_CREDIT.disclaimer} The text is shown by permission and is not covered by Stillpoint’s MIT license.</p>
    </section>
  );
}

function PrivacyNote() {
  return (
    <p className="na-privacy-note"><ShieldCheck size={16} aria-hidden="true" /> <span>Answer boxes are optional. What you write is saved only in this browser on this device. It is included in a backup file only if you download one, and it is removed if you delete all data in Settings. It is never sent anywhere.</span></p>
  );
}

/** Reader for the NA Step Working Guides: title screen and table of contents, or one chapter. */
export function NaStepGuidesPage() {
  const { chapterId } = useParams();
  const progress = useLiveQuery(() => getReaderProgress(), []);
  const answers = useLiveQuery(() => db.stepWorkAnswers.toArray(), []) ?? EMPTY_ANSWERS;
  const answeredByStep = useMemo(() => {
    const counts = new Map<number, number>();
    for (const answer of answers) if (answer.text.trim()) counts.set(answer.stepNumber, (counts.get(answer.stepNumber) ?? 0) + 1);
    return counts;
  }, [answers]);
  const answerText = useMemo(() => new Map(answers.map((answer) => [answer.questionId, answer.text])), [answers]);
  const textSize = progress?.textSize ?? 'default';

  if (chapterId !== undefined && !isNaChapterId(chapterId)) return <Navigate to={NA_STEP_GUIDES_PATH} replace />;

  return (
    <div className="na-reader page-stack" data-text-size={textSize}>
      {chapterId
        ? <Chapter key={chapterId} chapterId={chapterId} textSize={textSize} answeredByStep={answeredByStep} answerText={answerText} answersLoaded={answers !== EMPTY_ANSWERS} />
        : <TitleScreen progress={progress} textSize={textSize} answeredByStep={answeredByStep} />}
    </div>
  );
}

function TitleScreen({ progress, textSize, answeredByStep }: { progress?: ReaderProgress; textSize: ReaderTextSize; answeredByStep: Map<number, number> }) {
  const resumeTitle = progress ? naChapterTitle(progress.chapterId) : null;
  const resumeSection = progress?.sectionId ? findStep(progress.chapterId)?.sections.find((section) => section.id === progress.sectionId)?.heading : null;
  return (
    <>
      <header className="page-header na-title-screen">
        <div>
          <p className="eyebrow"><Link to="/library" className="na-crumb"><ArrowLeft size={13} aria-hidden="true" /> Library</Link></p>
          <h1>{NA_STEP_GUIDES_TITLE}</h1>
          <p>The Narcotics Anonymous Step Working Guides: narrative and questions for each of the Twelve Steps, to read at your own pace and work with your sponsor.</p>
        </div>
        <BookOpen size={26} aria-hidden="true" />
      </header>

      <Credit />

      <section className="card na-start" aria-labelledby="na-start-heading">
        <h2 id="na-start-heading">{progress && resumeTitle ? 'Pick up where you left off' : 'Start reading'}</h2>
        <div className="action-row">
          {progress && resumeTitle && <Link className="button button-primary" to={chapterHref(progress.chapterId, progress.sectionId)}>Continue: {resumeTitle}{resumeSection ? ` · ${resumeSection}` : ''}</Link>}
          <Link className={`button ${progress && resumeTitle ? 'button-secondary' : 'button-primary'}`} to={chapterHref('preface')}>Read the Preface</Link>
          <Link className="button button-secondary" to={chapterHref('step-1')}>Go to Step One</Link>
        </div>
        <TextSizeControl value={textSize} />
        <PrivacyNote />
      </section>

      <nav className="card na-toc" aria-labelledby="na-toc-heading">
        <h2 id="na-toc-heading"><ListOrdered size={18} aria-hidden="true" /> Table of contents</h2>
        <ol className="na-toc-list">
          {naChapters.map((chapter) => (
            <li key={chapter.id} className="na-toc-item">
              <Link to={chapterHref(chapter.id)} className="na-toc-link" aria-current={progress?.chapterId === chapter.id ? 'location' : undefined}>
                <strong>{chapter.title}</strong>
                {chapter.subtitle && <span className="na-toc-subtitle">{chapter.subtitle}</span>}
              </Link>
              {chapter.stepNumber !== undefined && <StepProgress answered={answeredByStep.get(chapter.stepNumber) ?? 0} total={chapter.questionCount} label={chapter.title} />}
              {progress?.chapterId === chapter.id && <span className="pill na-toc-here">Last read</span>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

interface ChapterProps {
  chapterId: string;
  textSize: ReaderTextSize;
  answeredByStep: Map<number, number>;
  answerText: Map<string, string>;
  answersLoaded: boolean;
}

function Chapter({ chapterId, textSize, answeredByStep, answerText, answersLoaded }: ChapterProps) {
  const { preferences } = useAppContext();
  const { hash } = useLocation();
  const step = findStep(chapterId);
  const index = naChapters.findIndex((chapter) => chapter.id === chapterId);
  const previous = index > 0 ? naChapters[index - 1] : undefined;
  const next = index >= 0 && index < naChapters.length - 1 ? naChapters[index + 1] : undefined;
  const title = step?.title ?? naStepGuides.preface.title;
  const [announcement, setAnnouncement] = useState('');
  const reduceMotion = prefersReducedMotion(preferences?.reducedMotion);
  const lastSavedSection = useRef<string | undefined>(undefined);

  // Remember the chapter (and the section in the address, if any) as the resume point.
  const sectionFromHash = hash ? decodeURIComponent(hash.slice(1)) : undefined;
  useEffect(() => {
    const validSection = step?.sections.some((section) => section.id === sectionFromHash) ? sectionFromHash : undefined;
    lastSavedSection.current = validSection;
    void saveReaderProgress({ chapterId, sectionId: validSection });
  }, [chapterId, sectionFromHash, step]);

  // Bring a linked section into view and move focus to its heading.
  useEffect(() => {
    if (!sectionFromHash) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(sectionFromHash);
      if (!target) return;
      const heading = target.querySelector<HTMLElement>('h2') ?? target;
      try { target.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' }); } catch { /* jsdom */ }
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sectionFromHash, reduceMotion]);

  // While scrolling, quietly remember the section being read.
  useEffect(() => {
    if (!step || typeof IntersectionObserver === 'undefined') return undefined;
    let timer: number | undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      const id = visible?.target.id;
      if (!id || id === lastSavedSection.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { lastSavedSection.current = id; void saveReaderProgress({ chapterId, sectionId: id }); }, 800);
    }, { rootMargin: '0px 0px -70% 0px' });
    for (const section of step.sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [chapterId, step]);

  const announce = useCallback((message: string) => {
    setAnnouncement('');
    window.setTimeout(() => setAnnouncement(message), 30);
  }, []);

  const total = step ? naChapters[index]?.questionCount ?? 0 : 0;
  const answered = step ? answeredByStep.get(step.number) ?? 0 : 0;
  const titledSections = step?.sections.filter((section) => section.heading) ?? [];

  return (
    <article className="na-chapter" aria-labelledby="na-chapter-title">
      <header className="page-header na-chapter-header">
        <div>
          <p className="eyebrow"><Link to={NA_STEP_GUIDES_PATH} className="na-crumb"><ArrowLeft size={13} aria-hidden="true" /> {NA_STEP_GUIDES_TITLE}: contents</Link></p>
          <h1 id="na-chapter-title">{title}</h1>
          {step && <p className="na-step-text">“{step.text}”</p>}
          {step && <StepProgress answered={answered} total={total} label={step.title} />}
        </div>
      </header>

      <details className="card na-options">
        <summary>Reading options and privacy</summary>
        <TextSizeControl value={textSize} />
        <PrivacyNote />
        <p className="fine-print">{NA_STEP_GUIDES_CREDIT.copyright} {NA_STEP_GUIDES_CREDIT.approved}</p>
      </details>

      {step && titledSections.length > 1 && (
        <nav className="card na-section-nav" aria-label={`Sections in ${step.title}`}>
          <h2 className="na-section-nav-heading">In this step</h2>
          <ol>
            {titledSections.map((section) => <li key={section.id}><Link to={{ hash: section.id }} replace>{section.heading}</Link></li>)}
          </ol>
        </nav>
      )}

      <div className="card na-text">
        {step ? <StepBody step={step} answerText={answerText} answersLoaded={answersLoaded} announce={announce} /> : <PrefaceBody />}
      </div>

      <nav className="na-pager" aria-label="Previous and next chapter">
        {previous ? <Link className="button button-secondary" to={chapterHref(previous.id)}><ArrowLeft size={15} aria-hidden="true" /> {previous.title}</Link> : <span />}
        <Link className="button button-quiet" to={NA_STEP_GUIDES_PATH}>Contents</Link>
        {next ? <Link className="button button-secondary" to={chapterHref(next.id)}>{next.title} <ArrowRight size={15} aria-hidden="true" /></Link> : <span />}
      </nav>
      <p className="fine-print na-footer-credit">{NA_STEP_GUIDES_CREDIT.copyright}</p>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    </article>
  );
}

function PrefaceBody() {
  const { preface } = naStepGuides;
  return (
    <>
      {preface.paragraphs.map((paragraph, index) => <p key={index}><Rich text={paragraph} /></p>)}
      <p className="na-signature">{preface.signature}</p>
    </>
  );
}

function StepBody({ step, answerText, answersLoaded, announce }: { step: NaGuideStep; answerText: Map<string, string>; answersLoaded: boolean; announce: (message: string) => void }) {
  return (
    <>
      {step.sections.map((section) => {
        const content = groupBlocks(section.blocks).map((group, index) => (
          group.kind === 'paragraph'
            ? <p key={index}><Rich text={group.block.text} /></p>
            : (
              <ol key={index} className="na-questions" start={group.questions[0]!.number}>
                {group.questions.map((question) => (
                  <QuestionItem key={question.id} question={question} stepNumber={step.number} saved={answerText.get(question.id) ?? ''} ready={answersLoaded} announce={announce} />
                ))}
              </ol>
            )
        ));
        if (!section.heading) return <div key={section.id} id={section.id} className="na-section">{content}</div>;
        return (
          <section key={section.id} id={section.id} className="na-section" aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}>{section.heading}</h2>
            {content}
          </section>
        );
      })}
    </>
  );
}

type BlockGroup = { kind: 'paragraph'; block: Extract<NaGuideBlock, { type: 'paragraph' }> } | { kind: 'questions'; questions: Question[] };

function groupBlocks(blocks: NaGuideBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.type === 'question') {
      if (last?.kind === 'questions') last.questions.push(block);
      else groups.push({ kind: 'questions', questions: [block] });
    } else groups.push({ kind: 'paragraph', block });
  }
  return groups;
}

function QuestionItem({ question, stepNumber, saved, ready, announce }: { question: Question; stepNumber: number; saved: string; ready: boolean; announce: (message: string) => void }): ReactNode {
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle');
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(draft);
  const fieldId = `${question.id}-answer`;

  // Show the stored answer once it loads, unless the person is mid-edit.
  useEffect(() => {
    if (!dirty.current) { setDraft(saved); latest.current = saved; }
  }, [saved, ready]);

  const flush = useCallback(async (announceResult: boolean) => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    try {
      await saveStepAnswer(question.id, stepNumber, latest.current);
      setStatus('saved');
      if (announceResult) announce(latest.current.trim() ? `Answer to question ${question.number} saved on this device.` : `Answer to question ${question.number} cleared.`);
    } catch {
      dirty.current = true;
      setStatus('error');
      announce(`Answer to question ${question.number} could not be saved. Check browser storage.`);
    }
  }, [announce, question.id, question.number, stepNumber]);

  // Save anything pending if the person leaves the page mid-sentence.
  useEffect(() => () => { void flush(false); }, [flush]);

  return (
    <li className="na-question" id={question.id}>
      <label htmlFor={fieldId} className="na-question-text">{question.text}</label>
      <textarea
        id={fieldId}
        className="na-answer"
        rows={draft ? 4 : 2}
        maxLength={MAX_STEP_ANSWER_LENGTH}
        value={draft}
        aria-describedby={`${fieldId}-hint`}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value); latest.current = value; dirty.current = true; setStatus('pending');
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => { void flush(false); }, SAVE_DELAY_MS);
        }}
        onFocus={() => void saveReaderProgress({ chapterId: `step-${stepNumber}`, sectionId: document.getElementById(question.id)?.closest('section')?.id })}
        onBlur={() => void flush(true)}
      />
      <span id={`${fieldId}-hint`} className="na-answer-hint">
        {status === 'pending' ? 'Saving…' : status === 'saved' ? 'Saved on this device' : status === 'error' ? 'Not saved. Check browser storage.' : 'Optional · private to this device'}
      </span>
    </li>
  );
}
