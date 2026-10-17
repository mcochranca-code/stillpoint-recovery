import { NavLink } from 'react-router-dom';
import { BookOpen, ChartNoAxesColumnIncreasing, Compass, Heart, Home, Settings, Wind } from 'lucide-react';

const items = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/meditation', label: 'Meditation', icon: Heart },
  { to: '/library', label: 'Library', icon: Compass },
];

export default function Navigation() {
  return (
    <>
      <aside className="desktop-sidebar" aria-label="Main navigation">
        <NavLink className="brand-lockup" to="/" aria-label="Stillpoint Recovery, Today">
          <img src="/assets/branding/stillpoint-logo.svg" alt="" />
          <span><strong>Stillpoint</strong><small>Recovery, one day at a time</small></span>
        </NavLink>
        <nav className="side-links">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/reset" className={({ isActive }) => `sidebar-reset${isActive ? ' active' : ''}`}><Wind size={17} aria-hidden="true" /><span>I need a moment</span></NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-settings${isActive ? ' active' : ''}`}>
          <Settings size={18} aria-hidden="true" /><span>Settings & privacy</span>
        </NavLink>
        <p className="sidebar-quote">“For this day, this moment, this breath.”</p>
      </aside>
      <nav className="mobile-nav" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <Icon size={21} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
