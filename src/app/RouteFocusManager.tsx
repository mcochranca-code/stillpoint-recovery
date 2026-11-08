import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_TITLE, titleForPath } from './routeTitles';

const HEADING_WAIT_MS = 2000;

/**
 * Single-page navigation does not move focus or announce anything on its own.
 * After each route change (never on first load) this:
 *  - updates document.title,
 *  - returns the scroll position to the top,
 *  - moves focus to the new page's <h1> (falling back to <main>) once the lazily
 *    loaded page has rendered, so keyboard and screen-reader users start at the
 *    top of the new content,
 *  - announces the page name in a polite live region.
 */
export function RouteFocusManager({ mainId = 'main-content' }: { mainId?: string }) {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const firstRender = useRef(true);

  useEffect(() => {
    const title = titleForPath(pathname);
    document.title = pathname === '/' ? APP_TITLE : `${title} · ${APP_TITLE}`;
    if (firstRender.current) { firstRender.current = false; return undefined; }

    let frame = 0;
    let cancelled = false;
    const startedAt = Date.now();
    if (typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, left: 0 }); } catch { /* jsdom and older browsers */ }
    }

    const focusTarget = () => {
      if (cancelled) return;
      const main = document.getElementById(mainId);
      const heading = main?.querySelector<HTMLElement>('h1');
      const stillLoading = Boolean(main?.querySelector('[aria-busy="true"]'));
      if (!heading && (stillLoading || !main) && Date.now() - startedAt < HEADING_WAIT_MS) {
        frame = window.requestAnimationFrame(focusTarget);
        return;
      }
      const target = heading ?? main;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        // Leave focus alone if something else (a dialog, a field) has claimed it since navigation.
        const active = document.activeElement;
        const focusIsIdle = !active || active === document.body || Boolean(active.closest('nav, aside, .mobile-nav-wrap, [role="dialog"]')) || !active.isConnected;
        if (focusIsIdle) target.focus({ preventScroll: true });
      }
      setAnnouncement(`${title} page`);
    };
    setAnnouncement('');
    frame = window.requestAnimationFrame(focusTarget);
    return () => { cancelled = true; window.cancelAnimationFrame(frame); };
  }, [pathname, mainId]);

  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="route-announcer">{announcement}</div>;
}
