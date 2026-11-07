import { naChapterTitle } from '../data/na-step-guides/meta';

/** Human page names used for document titles and route-change announcements. */
export const routeTitles: Record<string, string> = {
  '/': 'Today',
  '/progress': 'Progress',
  '/tokens': 'Current milestone token',
  '/journal': 'Journal',
  '/meditation': 'Meditation',
  '/library': 'Library',
  '/library/na-step-guides': 'NA Step Working Guides',
  '/meetings': 'Meetings',
  '/settings': 'Settings and privacy',
  '/reset': 'I need a moment',
  '/garden': 'Garden',
  '/field-guide': 'Field Guide',
};

export const APP_TITLE = 'Stillpoint Recovery';

export function titleForPath(pathname: string): string {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const exact = routeTitles[normalized];
  if (exact) return exact;
  const chapter = /^\/library\/na-step-guides\/([a-z0-9-]+)$/.exec(normalized);
  if (chapter) {
    const name = naChapterTitle(chapter[1]!);
    return name ? `${name} · NA Step Working Guides` : 'NA Step Working Guides';
  }
  return 'Today';
}
