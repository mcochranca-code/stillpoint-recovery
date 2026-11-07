import type { TraditionId } from '../domain/types';

/**
 * Small decorative landscapes, one per tradition. Each is drawn from an image in that
 * tradition's own readings (morning light, a water-pot filling drop by drop, a leaf offered
 * with water, the declining day, a dew-drop on a blade of grass, a road toward the hills, a
 * promontory in the waves) rather than from religious symbols, so nothing sacred is used as
 * decoration. Always aria-hidden: the tradition's name is given in text alongside.
 */
export function TraditionMotif({ tradition, className = '' }: { tradition: TraditionId; className?: string }) {
  return (
    <svg className={`tradition-motif ${className}`.trim()} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="62" height="62" rx="18" className="motif-ground" />
      {motifs[tradition]}
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const motifs: Record<TraditionId, JSX.Element> = {
  // "New every morning": light rising over a low horizon.
  christian: <g {...stroke}><path d="M12 44h40" /><path d="M20 44a12 12 0 0 1 24 0" /><path d="M32 20v6M19 26l4 4M45 26l-4 4M13 37h4M47 37h4" /><path className="motif-soft" d="M18 51h28" /></g>,
  // "Even by the falling of water-drops a water-pot is filled."
  buddhist: <g {...stroke}><path d="M32 14c-3 4-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5-5-9Z" /><path d="M14 44c4-3 8-3 12 0s8 3 12 0 8-3 12 0" /><path className="motif-soft" d="M20 51c3-2 6-2 9 0s6 2 9 0 4-1.5 6-1" /><circle cx="32" cy="37" r="2.2" className="motif-fill" /></g>,
  // "A leaf, a flower, a fruit, water poured forth."
  hindu: <g {...stroke}><path d="M20 40c0-12 10-20 24-22-1 14-9 24-22 24" /><path d="M21 41c6-6 12-12 21-21" /><path d="M14 50c5-2 9-2 13 0s9 2 13 0 7-2 10-1" className="motif-soft" /></g>,
  // "By the declining day": a low sun over layered dunes, and the first star.
  muslim: <g {...stroke}><circle cx="40" cy="30" r="6" /><path d="M10 44c8-6 16-6 24-2s14 4 20-1" /><path className="motif-soft" d="M10 52c9-4 18-4 26-1s12 2 18-1" /><circle cx="20" cy="19" r="1.8" className="motif-fill" /></g>,
  // "As a dew-drop dangling on the top of a blade of grass."
  jain: <g {...stroke}><path d="M30 52c0-14 2-24 10-32" /><path d="M30 52c-2-10-6-16-12-20" /><path d="M40 20c-1 4-1 6 0 7" className="motif-soft" /><circle cx="41.5" cy="29.5" r="2.6" className="motif-fill" /><path d="M14 52h36" /></g>,
  // Walking the road: a path winding toward the hills.
  'red-road': <g {...stroke}><path d="M10 38l12-12 8 8 10-14 14 18" /><path d="M28 54c2-6 8-8 6-12s-2-6 2-8" /><path className="motif-soft" d="M10 46h44" /></g>,
  // "Be like the promontory against which the waves continually break."
  reflective: <g {...stroke}><path d="M10 46h14l6-14 6 2 4 12h14" /><path d="M12 53c4-3 7-3 10 0s7 3 10 0 7-3 10 0 6 2 10 0" className="motif-soft" /><circle cx="46" cy="20" r="3" /></g>,
};
