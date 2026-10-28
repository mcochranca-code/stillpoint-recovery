import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowRight, BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, Compass,
  Flower2, Heart, Home, Leaf, Settings, Shield, Sparkles, Wind,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDialogFocus } from '../app/useDialogFocus';
import './quick-find.css';

type QuickFindItem = {
  id: string;
  label: string;
  detail: string;
  path: string;
  group: 'Quick actions' | 'Pages';
  keywords: string;
  icon: typeof Home;
  featured?: boolean;
};

const quickFindItems: QuickFindItem[] = [
  { id: 'reset-now', label: 'I need a moment', detail: 'Open the 90-second reset and grounding choices', path: '/reset', group: 'Quick actions', keywords: 'pause craving panic grounding breathe support', icon: Wind, featured: true },
  { id: 'find-meeting', label: 'Find a meeting', detail: 'Browse local and online meeting listings', path: '/meetings', group: 'Quick actions', keywords: 'AA NA FA SMART recovery support Fresno Mariposa Merced online map', icon: CalendarDays, featured: true },
  { id: 'start-meditation', label: 'Begin a meditation', detail: 'Choose a short, optional guided practice', path: '/meditation', group: 'Quick actions', keywords: 'breathe relax calm audio mindfulness', icon: Heart, featured: true },
  { id: 'open-charms', label: 'Explore progress charms', detail: 'View earned charms and recovery-time tokens', path: '/charms', group: 'Quick actions', keywords: 'keytag medallion milestone badge token progress', icon: Sparkles, featured: true },
  { id: 'open-journal', label: 'Write a private note', detail: 'Open your on-device journal', path: '/journal', group: 'Quick actions', keywords: 'journal reflection gratitude feelings private', icon: BookOpen, featured: true },
  { id: 'open-today', label: 'Today', detail: 'Your daily recovery companion', path: '/', group: 'Pages', keywords: 'home dashboard reflection scripture counter', icon: Home },
  { id: 'open-progress', label: 'Progress', detail: 'Activity, milestones, and personal timeline', path: '/progress', group: 'Pages', keywords: 'statistics activity timeline growth', icon: ChartNoAxesColumnIncreasing },
  { id: 'open-journal', label: 'Journal', detail: 'Private notes saved on this device', path: '/journal', group: 'Pages', keywords: 'writing diary reflection', icon: BookOpen },
  { id: 'open-meditation', label: 'Meditation', detail: 'Breathing, grounding, and quiet practices', path: '/meditation', group: 'Pages', keywords: 'breathing audio relaxation', icon: Heart },
  { id: 'open-meetings', label: 'Meeting finder', detail: 'Offline AA, NA, FA, and SMART listings', path: '/meetings', group: 'Pages', keywords: 'AA NA FA SMART directory recovery support map', icon: CalendarDays },
  { id: 'open-library', label: 'Library', detail: 'Browse readings and recovery tools', path: '/library', group: 'Pages', keywords: 'reading scripture tools explore', icon: Compass },
  { id: 'open-charms-page', label: 'Journey Collection', detail: 'Charms, keytags, and medallions', path: '/charms', group: 'Pages', keywords: 'charms keytags tokens milestones', icon: Sparkles },
  { id: 'open-garden', label: 'Living Garden', detail: 'A visual record of care over time', path: '/garden', group: 'Pages', keywords: 'garden plants scenery activity', icon: Flower2 },
  { id: 'open-field-guide', label: 'Personal Recovery Field Guide', detail: 'Your private, locally saved playbook', path: '/field-guide', group: 'Pages', keywords: 'coping strategy triggers contacts support private', icon: Leaf },
  { id: 'open-settings', label: 'Settings & privacy', detail: 'Themes, accessibility, reminders, and data tools', path: '/settings', group: 'Pages', keywords: 'backup restore json export import privacy colors accessible', icon: Shield },
  { id: 'open-preferences', label: 'Settings', detail: 'Manage preferences and local data', path: '/settings', group: 'Quick actions', keywords: 'settings preferences accessibility theme backup restore export import', icon: Settings },
];

const quickFindGroups: QuickFindItem['group'][] = ['Quick actions', 'Pages'];

/** A global, local-only launcher for Stillpoint pages and safe built-in actions. */
export function QuickFindDialog({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(open, onClose);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.shiftKey;
      if (!isShortcut || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const [query, setQuery] = useSearchQuery(open);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(() => quickFindItems.filter((item) => {
    if (!normalizedQuery && !item.featured) return false;
    if (!normalizedQuery) return true;
    return `${item.label} ${item.detail} ${item.keywords}`.toLocaleLowerCase().includes(normalizedQuery);
  }), [normalizedQuery]);

  const focusResult = (index: number) => {
    const links = dialogRef.current?.querySelectorAll<HTMLAnchorElement>('[data-quick-find-result]');
    if (!links?.length) return;
    links[Math.max(0, Math.min(index, links.length - 1))]?.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      focusResult(0);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      focusResult(0);
    }
  };

  const handleResultKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusResult(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) inputRef.current?.focus();
      else focusResult(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusResult(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusResult(results.length - 1);
    }
  };

  if (!open) return null;
  let flatIndex = 0;

  return (
    <div className="dialog-backdrop quick-find-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog-card quick-find-panel" role="dialog" aria-modal="true" aria-labelledby="quick-find-title" ref={dialogRef} tabIndex={-1}>
        <div className="quick-find-header">
          <div>
            <p className="eyebrow">A local shortcut</p>
            <h2 id="quick-find-title">Quick Find</h2>
          </div>
          <button className="icon-button quick-find-close" type="button" aria-label="Close Quick Find" onClick={onClose}>×</button>
        </div>

        <label className="quick-find-search-wrap" htmlFor="quick-find-search">
          <SearchIcon />
          <input
            ref={inputRef}
            id="quick-find-search"
            type="search"
            role="searchbox"
            aria-label="Search Stillpoint pages and actions"
            placeholder="Find a page or action…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </label>

        <p className="quick-find-privacy">Only built-in Stillpoint pages and actions are searched. Your writing and recovery records are not searched, stored, or sent.</p>
        <p className="quick-find-result-count" role="status" aria-live="polite" aria-atomic="true">
          {results.length === 0 ? 'No matches.' : `${results.length} ${results.length === 1 ? 'suggestion' : 'suggestions'}`}
        </p>

        <div className="quick-find-results">
          {quickFindGroups.map((group) => {
            const groupItems = results.filter((item) => item.group === group);
            if (!groupItems.length) return null;
            return (
              <section className="quick-find-group" key={group} aria-labelledby={`quick-find-group-${group === 'Pages' ? 'pages' : 'actions'}`}>
                <h3 id={`quick-find-group-${group === 'Pages' ? 'pages' : 'actions'}`}>{group}</h3>
                <ul>
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const index = flatIndex++;
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          className="quick-find-result"
                          data-quick-find-result
                          onClick={onClose}
                          onKeyDown={(event) => handleResultKeyDown(event, index)}
                        >
                          <span className="quick-find-result-icon"><Icon size={18} aria-hidden="true" /></span>
                          <span className="quick-find-result-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                          <ArrowRight className="quick-find-result-arrow" size={16} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {results.length === 0 && <p className="quick-find-empty">Try “meeting”, “meditation”, “tokens”, or “backup”.</p>}
        </div>
      </section>
    </div>
  );
}

function useSearchQuery(open: boolean): [string, (value: string) => void] {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  return [query, setQuery];
}

function SearchIcon() {
  return <svg className="quick-find-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" /></svg>;
}
