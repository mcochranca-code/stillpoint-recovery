import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { db } from '../../db/database';
import { getReaderProgress } from '../../db/stepWork';
import { NA_STEP_GUIDES_CREDIT, NA_STEP_GUIDES_PATH, NA_STEP_GUIDES_TITLE, naChapterTitle } from '../../data/na-step-guides/meta';

/**
 * Library entry point for the NA Step Working Guides reader. Library only: it is never part of the
 * Today card rotation and never shown as a nudge. Imports no guide text, so Library stays light.
 */
export function NaStepGuidesCard() {
  const { preferences } = useAppContext();
  const progress = useLiveQuery(() => getReaderProgress(), []);
  const answeredCount = useLiveQuery(() => db.stepWorkAnswers.count(), []) ?? 0;
  const resumeTitle = progress ? naChapterTitle(progress.chapterId) : null;
  const href = progress && resumeTitle ? `${NA_STEP_GUIDES_PATH}/${progress.chapterId}${progress.sectionId ? `#${progress.sectionId}` : ''}` : NA_STEP_GUIDES_PATH;
  return (
    <section className="card na-library-card" aria-labelledby="na-step-guides-card-heading">
      <div className="card-header">
        <div>
          <p className="eyebrow">Read by permission · works offline</p>
          <h2 id="na-step-guides-card-heading">{NA_STEP_GUIDES_TITLE}</h2>
          <p>Narrative and questions for each of the Twelve Steps, with optional private answer boxes that stay on this device.</p>
        </div>
        <BookOpen size={22} aria-hidden="true" />
      </div>
      <div className="action-row">
        <Link className="button button-primary button-small" to={href}>{resumeTitle ? `Continue: ${resumeTitle}` : 'Open the guides'}</Link>
        {resumeTitle && <Link className="button button-secondary button-small" to={NA_STEP_GUIDES_PATH}>Contents</Link>}
      </div>
      {!preferences?.discreetMode && answeredCount > 0 && <p className="fine-print">{answeredCount} {answeredCount === 1 ? 'answer' : 'answers'} saved on this device.</p>}
      <p className="fine-print">{NA_STEP_GUIDES_CREDIT.approved} {NA_STEP_GUIDES_CREDIT.copyright} {NA_STEP_GUIDES_CREDIT.disclaimer}</p>
    </section>
  );
}
