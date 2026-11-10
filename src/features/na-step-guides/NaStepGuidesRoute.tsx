import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Settings2 } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { PageSkeleton } from '../../components/PageSkeleton';
import { isNaStepGuidesEnabled, NA_STEP_GUIDES_SETTING_ANCHOR, NA_STEP_GUIDES_TITLE } from '../../data/na-step-guides/meta';

/**
 * The reader and the guide text live in their own lazy chunk. It is only requested once the person
 * has turned the reader on in Settings, so a device that never opts in never downloads the NA text,
 * and the chunk is deliberately left out of the offline precache (see scripts/na-step-guides-chunk.mjs).
 */
const NaStepGuidesPage = lazy(() => import('./NaStepGuidesPage').then((page) => ({ default: page.NaStepGuidesPage })));

/** Route for /library/na-step-guides(/:chapterId): the reader when opted in, otherwise a gentle off screen. */
export function NaStepGuidesRoute() {
  const { preferences } = useAppContext();
  if (!isNaStepGuidesEnabled(preferences)) return <NaStepGuidesOffScreen />;
  return (
    <Suspense fallback={<PageSkeleton label="Opening the reader on this device…" />}>
      <NaStepGuidesPage />
    </Suspense>
  );
}

/** Shown instead of the guide text while the reader is turned off. Carries none of the NA text. */
export function NaStepGuidesOffScreen() {
  return (
    <div className="page-stack na-reader-off">
      <header className="page-header">
        <div>
          <p className="eyebrow"><Link to="/library"><ArrowLeft size={13} aria-hidden="true" /> Library</Link></p>
          <h1>{NA_STEP_GUIDES_TITLE}</h1>
          <p>This reader is turned off. Turn it on in Settings.</p>
        </div>
        <BookOpen size={26} aria-hidden="true" />
      </header>
      <section className="card" aria-labelledby="na-reader-off-heading">
        <h2 id="na-reader-off-heading">Off on this device</h2>
        <p>The reader is optional and stays hidden until you choose to show it. It is for personal use on this device only.</p>
        <p className="fine-print">Any answers you saved earlier are kept on this device. They come back when you turn the reader on again, and they are still included in backups and removed by Delete all data.</p>
        <div className="action-row">
          <Link className="button button-primary" to={`/settings#${NA_STEP_GUIDES_SETTING_ANCHOR}`}><Settings2 size={15} aria-hidden="true" /> Go to Settings</Link>
          <Link className="button button-secondary" to="/library">Back to Library</Link>
        </div>
      </section>
    </div>
  );
}

export default NaStepGuidesRoute;
