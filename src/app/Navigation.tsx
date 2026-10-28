import { useCallback, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, Compass, Heart, Home, Search, Settings, Wind } from 'lucide-react';
import { QuickFindDialog } from '../components/QuickFindDialog';

const items = [
  { to: '/', label: 'Today', mobileLabel: 'Today', icon: Home, end: true },
  { to: '/progress', label: 'Progress', mobileLabel: 'Progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/journal', label: 'Journal', mobileLabel: 'Journal', icon: BookOpen },
  { to: '/meditation', label: 'Meditation', mobileLabel: 'Meditate', icon: Heart },
  { to: '/meetings', label: 'Meetings', mobileLabel: 'Meetings', icon: CalendarDays },
  { to: '/library', label: 'Library', mobileLabel: 'Library', icon: Compass },
];

/** Render primary navigation and route-aware page controls. */
export default function Navigation() {
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const openQuickFind = useCallback(() => setQuickFindOpen(true), []);
  const closeQuickFind = useCallback(() => setQuickFindOpen(false), []);
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  return (
    <>
      <aside className="desktop-sidebar" aria-label="Main navigation">
        <NavLink className="brand-lockup" to="/" aria-label="Stillpoint Recovery, Today">
          <img src="/assets/branding/stillpoint-logo.svg" alt="" />
          <span><strong>Stillpoint</strong><small>Recovery, one day at a time</small></span>
        </NavLink>
        <nav className="side-links">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label} title={label} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
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
      <nav className="mobile-nav" aria-label="Mobile primary navigation">
        {items.map(({ to, label, mobileLabel, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <Icon size={21} aria-hidden="true" /><span aria-hidden="true">{mobileLabel ?? label}</span>
          </NavLink>
        ))}
        <button type="button" className="quick-find-trigger quick-find-trigger--mobile" aria-label="Search Stillpoint" title={`Quick Find (${shortcutLabel})`} onClick={openQuickFind}>
          <Search aria-hidden="true" /><span aria-hidden="true">Search</span>
        </button>
      </nav>
      <QuickFindDialog open={quickFindOpen} onOpen={openQuickFind} onClose={closeQuickFind} />
    </>
  );
}
