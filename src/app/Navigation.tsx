import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Accessibility, Award, BookOpen, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight, Compass, Handshake, Home, Menu, MessageCircle, Search, Settings, Wind, X, type LucideIcon } from 'lucide-react';
import { QuickFindDialog } from '../components/QuickFindDialog';

type NavigationItem = { to: string; label: string; mobileLabel?: string; accessibleLabel?: string; icon: LucideIcon; end?: boolean; breathingOrb?: boolean };

const items: NavigationItem[] = [
  { to: '/', label: 'Home', mobileLabel: 'Home', icon: Home, end: true },
  { to: '/progress', label: 'Progress', mobileLabel: 'Progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/tokens', label: 'Tokens', mobileLabel: 'Tokens', accessibleLabel: 'Current milestone token', icon: Award },
  { to: '/journal', label: 'Journal', mobileLabel: 'Journal', icon: BookOpen },
  { to: '/meditation', label: 'Meditation', mobileLabel: 'Meditate', icon: Wind, breathingOrb: true },
  { to: '/meetings', label: 'Meetings', mobileLabel: 'Meetings', icon: Handshake },
  { to: '/community', label: 'Community Notes', mobileLabel: 'Community', icon: MessageCircle },
  { to: '/library', label: 'Library', mobileLabel: 'Library', icon: Compass },
];
const DESKTOP_SIDEBAR_PREFERENCE = 'stillpoint-desktop-sidebar-collapsed-v1';

/** Render primary navigation and route-aware page controls. */
export default function Navigation({ communityNotesEnabled = false }: { communityNotesEnabled?: boolean }) {
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const location = useLocation();
  const openQuickFind = useCallback(() => setQuickFindOpen(true), []);
  const closeQuickFind = useCallback(() => setQuickFindOpen(false), []);
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  const visibleItems = communityNotesEnabled ? items : items.filter((item) => item.to !== '/community');
  const mobileItems = visibleItems.filter((item) => item.to !== '/');

  useEffect(() => {
    try { setDesktopCollapsed(window.localStorage.getItem(DESKTOP_SIDEBAR_PREFERENCE) === 'true'); } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(DESKTOP_SIDEBAR_PREFERENCE, String(desktopCollapsed)); } catch { /* Storage is optional. */ }
  }, [desktopCollapsed]);
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileHeaderHidden(false);
  }, [location.pathname]);
  useEffect(() => {
    let previousY = Math.max(0, window.scrollY);
    let lastDirectionChangeY = previousY;
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - previousY;
      if (Math.abs(delta) >= 5) {
        if (Math.abs(currentY - lastDirectionChangeY) >= 18 || delta < 0) {
          setMobileHeaderHidden(currentY > 72 && delta > 0);
          lastDirectionChangeY = currentY;
        }
        previousY = currentY;
      }
      if (currentY <= 24) setMobileHeaderHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      <aside className={`desktop-sidebar${desktopCollapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
        <NavLink className="brand-lockup" to="/" aria-label="Stillpoint Recovery, Home">
          <img src="/assets/branding/stillpoint-logo.svg" alt="" />
          <span><strong>Stillpoint</strong><small>Recovery, one day at a time</small></span>
        </NavLink>
        <button type="button" className="desktop-sidebar-toggle" aria-expanded={!desktopCollapsed} aria-controls="desktop-primary-navigation" aria-label={desktopCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'} title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setDesktopCollapsed((value) => !value)}>
          {desktopCollapsed ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
          <span>{desktopCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>
        <nav id="desktop-primary-navigation" className="side-links" aria-label="Primary navigation">
          {visibleItems.map(({ to, label, accessibleLabel, icon: Icon, end, breathingOrb }) => (
            <NavLink key={to} to={to} end={end} aria-label={accessibleLabel ?? label} title={accessibleLabel ?? label} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {breathingOrb ? <img className="nav-breathing-orb" src="/assets/meditation/breathing-orb.svg" alt="" /> : <Icon size={19} aria-hidden="true" />}<span>{label}</span>
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

      <header className={`mobile-header${mobileHeaderHidden && !mobileMenuOpen ? ' is-hidden' : ''}`}>
        <button type="button" className="mobile-header-menu" aria-expanded={mobileMenuOpen} aria-controls="mobile-side-drawer" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
        <span className="mobile-header-brand" aria-label="Stillpoint Recovery">Stillpoint</span>
        <div className="mobile-header-actions">
          <Link to="/settings#appearance-accessibility" className="mobile-header-action" aria-label="Accessibility options" title="Accessibility options"><Accessibility size={19} aria-hidden="true" /></Link>
          <Link to="/settings" className="mobile-header-action" aria-label="Settings and privacy" title="Settings and privacy"><Settings size={19} aria-hidden="true" /></Link>
        </div>
      </header>

      <div className={`mobile-drawer-backdrop${mobileMenuOpen ? ' is-open' : ''}`} aria-hidden={!mobileMenuOpen} onClick={() => setMobileMenuOpen(false)} />
      <aside id="mobile-side-drawer" className={`mobile-side-drawer${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Mobile navigation menu" aria-hidden={!mobileMenuOpen} ref={(element) => { if (element) element.toggleAttribute('inert', !mobileMenuOpen); }}>
        <div className="mobile-drawer-heading"><div><span className="eyebrow">Your recovery space</span><h2>Move through Stillpoint</h2></div><button type="button" className="mobile-drawer-close" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}><X size={19} aria-hidden="true" /></button></div>
        <nav className="mobile-drawer-links" aria-label="Mobile primary navigation">
          {mobileItems.map(({ to, label, mobileLabel, accessibleLabel, icon: Icon, end, breathingOrb }) => (
            <NavLink key={to} to={to} end={end} aria-label={accessibleLabel ?? label} title={accessibleLabel ?? label} className={({ isActive }) => `mobile-drawer-link${isActive ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              {breathingOrb ? <img className="nav-breathing-orb" src="/assets/meditation/breathing-orb.svg" alt="" /> : <Icon size={20} aria-hidden="true" />}<span>{mobileLabel ?? label}</span>
            </NavLink>
          ))}
          <button type="button" className="mobile-drawer-link" aria-label="Search Stillpoint" onClick={() => { setMobileMenuOpen(false); openQuickFind(); }}><Search size={20} aria-hidden="true" /><span>Search</span></button>
        </nav>
        <div className="mobile-drawer-footer">
          <NavLink to="/settings" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}><Settings size={19} aria-hidden="true" /><span>Settings &amp; privacy</span></NavLink>
          <Link to="/settings#appearance-accessibility" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}><Accessibility size={19} aria-hidden="true" /><span>Accessibility options</span></Link>
          <Link to="/reset" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}><Wind size={19} aria-hidden="true" /><span>I need a moment</span></Link>
        </div>
      </aside>

      <NavLink to="/" end className={({ isActive }) => `mobile-home-fab${isActive ? ' active' : ''}`} aria-label="Home" title="Home"><Home size={22} aria-hidden="true" /></NavLink>
      <QuickFindDialog open={quickFindOpen} onOpen={openQuickFind} onClose={closeQuickFind} communityNotesEnabled={communityNotesEnabled} />
    </>
  );
}
