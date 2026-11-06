import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Award, BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Compass, Heart, Home, Search, Settings, Wind, type LucideIcon } from 'lucide-react';
import { QuickFindDialog } from '../components/QuickFindDialog';

type NavigationItem = { to: string; label: string; mobileLabel?: string; accessibleLabel?: string; icon: LucideIcon; end?: boolean };

const items: NavigationItem[] = [
  { to: '/', label: 'Today', mobileLabel: 'Today', icon: Home, end: true },
  { to: '/progress', label: 'Progress', mobileLabel: 'Progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/tokens', label: 'Tokens', mobileLabel: 'Tokens', accessibleLabel: 'Current milestone token', icon: Award },
  { to: '/journal', label: 'Journal', mobileLabel: 'Journal', icon: BookOpen },
  { to: '/meditation', label: 'Meditation', mobileLabel: 'Meditate', icon: Heart },
  { to: '/meetings', label: 'Meetings', mobileLabel: 'Meetings', icon: CalendarDays },
  { to: '/library', label: 'Library', mobileLabel: 'Library', icon: Compass },
];
const MOBILE_NAV_PREFERENCE = 'stillpoint-mobile-nav-expanded-v1';
const DESKTOP_SIDEBAR_PREFERENCE = 'stillpoint-desktop-sidebar-collapsed-v1';

/** Render primary navigation and route-aware page controls. */
export default function Navigation() {
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const openQuickFind = useCallback(() => setQuickFindOpen(true), []);
  const closeQuickFind = useCallback(() => setQuickFindOpen(false), []);
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  useEffect(() => {
    try { setMobileExpanded(window.localStorage.getItem(MOBILE_NAV_PREFERENCE) === 'true'); } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.mobileNavExpanded = String(mobileExpanded);
    try { window.localStorage.setItem(MOBILE_NAV_PREFERENCE, String(mobileExpanded)); } catch { /* Storage is optional. */ }
    return () => { delete document.documentElement.dataset.mobileNavExpanded; };
  }, [mobileExpanded]);
  useEffect(() => {
    try { setDesktopCollapsed(window.localStorage.getItem(DESKTOP_SIDEBAR_PREFERENCE) === 'true'); } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(DESKTOP_SIDEBAR_PREFERENCE, String(desktopCollapsed)); } catch { /* Storage is optional. */ }
  }, [desktopCollapsed]);

  return (
    <>
      <aside className={`desktop-sidebar${desktopCollapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
        <NavLink className="brand-lockup" to="/" aria-label="Stillpoint Recovery, Today">
          <img src="/assets/branding/stillpoint-logo.svg" alt="" />
          <span><strong>Stillpoint</strong><small>Recovery, one day at a time</small></span>
        </NavLink>
        <button type="button" className="desktop-sidebar-toggle" aria-expanded={!desktopCollapsed} aria-controls="desktop-primary-navigation" aria-label={desktopCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'} title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setDesktopCollapsed((value) => !value)}>
          {desktopCollapsed ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
          <span>{desktopCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>
        <nav id="desktop-primary-navigation" className="side-links" aria-label="Primary navigation">
          {items.map(({ to, label, accessibleLabel, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={accessibleLabel ?? label} title={accessibleLabel ?? label} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="quick-find-trigger" aria-label="Open Quick Find" title={`Quick Find (${shortcutLabel})`} onClick={openQuickFind}>
          <Search size={18} aria-hidden="true" /><span>Quick Find</span><kbd aria-hidden="true">{shortcutLabel}</kbd>
        </button>
        <NavLink to="/reset" aria-label="I need a moment" title="I need a moment" className={({ isActive }) => `sidebar-reset${isActive ? ' active' : ''}`}><Wind size={17} aria-hidden="true" /><span>I need a moment</span></NavLink>
        <NavLink to="/settings" aria-label="Settings and privacy" title="Settings and privacy" className={({ isActive }) => `sidebar-settings${isActive ? ' active' : ''}`}>
          <Settings size={18} aria-hidden="true" /><span>Settings &amp; privacy</span>
        </NavLink>
        <p className="sidebar-quote">“For this day, this moment, this breath.”</p>
      </aside>
      <div className={`mobile-nav-wrap${mobileExpanded ? ' expanded' : ''}`}>
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={mobileExpanded}
          aria-controls="mobile-primary-navigation"
          aria-label={mobileExpanded ? 'Collapse mobile navigation labels' : 'Expand mobile navigation labels'}
          title={mobileExpanded ? 'Collapse navigation' : 'Expand navigation'}
          onClick={() => setMobileExpanded((value) => !value)}
        >
          {mobileExpanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        </button>
        <nav id="mobile-primary-navigation" className="mobile-nav" aria-label="Mobile primary navigation">
          {items.map(({ to, label, mobileLabel, accessibleLabel, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={accessibleLabel ?? label} title={accessibleLabel ?? label} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
              <Icon size={21} aria-hidden="true" /><span>{mobileLabel ?? label}</span>
            </NavLink>
          ))}
          <button type="button" className="quick-find-trigger quick-find-trigger--mobile" aria-label="Search Stillpoint" title={`Quick Find (${shortcutLabel})`} onClick={openQuickFind}>
            <Search aria-hidden="true" /><span>Search</span>
          </button>
        </nav>
      </div>
      <QuickFindDialog open={quickFindOpen} onOpen={openQuickFind} onClose={closeQuickFind} />
    </>
  );
}
