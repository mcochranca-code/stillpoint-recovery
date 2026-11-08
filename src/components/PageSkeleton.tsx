/**
 * Placeholder shapes shown while a page's code loads. The shapes are
 * decorative; assistive technology hears a single polite status message.
 */
export function PageSkeleton({ label = 'Opening your local space…' }: { label?: string }) {
  return (
    <div className="page-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="skeleton-header" aria-hidden="true">
        <span className="skeleton-block skeleton-block--eyebrow" />
        <span className="skeleton-block skeleton-block--title" />
        <span className="skeleton-block skeleton-block--short" />
      </div>
      <div className="skeleton-grid" aria-hidden="true">
        <div className="skeleton-card">
          <span className="skeleton-block skeleton-block--eyebrow" />
          <span className="skeleton-block skeleton-block--tall" />
          <span className="skeleton-block skeleton-block--line" />
          <span className="skeleton-block skeleton-block--short" />
        </div>
        <div className="skeleton-card">
          <span className="skeleton-block skeleton-block--eyebrow" />
          <span className="skeleton-block skeleton-block--line" />
          <span className="skeleton-block skeleton-block--line" />
          <span className="skeleton-block skeleton-block--short" />
        </div>
      </div>
    </div>
  );
}
