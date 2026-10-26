import { ArrowLeft, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CharmGallery } from '../../components/CharmGallery';

/** Make the spinable local progress-charm collection directly discoverable. */
export function CharmCollectionPage() {
  return (
    <div className="page-stack">
      <header className="page-header charm-collection-header">
        <div>
          <p className="eyebrow">Your progress, at your pace</p>
          <h1>The Journey Collection</h1>
          <p>Small signs of care, collected along the way. Charms are personal markers, not a comparison.</p>
        </div>
        <div className="today-header-actions">
          <Link to="/progress" className="button button-secondary"><ChartNoAxesColumnIncreasing size={16} aria-hidden="true" /> View progress</Link>
          <Link to="/" className="button button-quiet"><ArrowLeft size={16} aria-hidden="true" /> Today</Link>
        </div>
      </header>
      <CharmGallery />
    </div>
  );
}
