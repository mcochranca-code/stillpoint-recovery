/** Human page names used for document titles and route-change announcements. */
export const routeTitles: Record<string, string> = {
  '/': 'Today',
  '/progress': 'Progress',
  '/tokens': 'Current milestone token',
  '/journal': 'Journal',
  '/meditation': 'Meditation',
  '/library': 'Library',
  '/meetings': 'Meetings',
  '/settings': 'Settings and privacy',
  '/reset': 'I need a moment',
  '/garden': 'Garden',
  '/field-guide': 'Field Guide',
};

export const APP_TITLE = 'Stillpoint Recovery';

export function titleForPath(pathname: string): string {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return routeTitles[normalized] ?? 'Today';
}
