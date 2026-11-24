import { Fragment, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Banknote, Calculator, CalendarDays, ClipboardList, Dumbbell, House, MapPin, Menu, Plus, Search, Timer, Users } from 'lucide-react';
import { useData, useStore } from '../lib/store';
import { allAlerts } from '../lib/analytics/insights';
import { firstName, initials } from '../lib/util';
import { CommandPalette } from './CommandPalette';
import { QuickActions } from './sheets';

/** Atlas mark: a circle (the world) held up by a square. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="9" y="15" width="14" height="14" fill="var(--md-secondary)" />
      <circle cx="16" cy="9" r="6" fill="var(--md-primary)" />
    </svg>
  );
}

const NAV = {
  today: { to: '/', label: 'Today', icon: House, end: true },
  schedule: { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  clients: { to: '/clients', label: 'Clients', icon: Users },
  classes: { to: '/classes', label: 'Classes', icon: Timer },
  library: { to: '/library', label: 'Library', icon: ClipboardList },
  locations: { to: '/locations', label: 'Locations', icon: MapPin },
  business: { to: '/business', label: 'Business', icon: Banknote },
  tools: { to: '/tools', label: 'Coach tools', icon: Calculator },
  more: { to: '/more', label: 'More', icon: Menu },
};
type NavEntry = { to: string; label: string; icon: typeof House; end?: boolean };

const GROUPS: { label: string; items: NavEntry[] }[] = [
  { label: 'Start here', items: [NAV.today, NAV.schedule] },
  { label: 'Coaching', items: [NAV.clients, NAV.classes, NAV.library, NAV.locations] },
  { label: 'Manage', items: [NAV.business, NAV.tools, NAV.more] },
];

// Opened from elsewhere (e.g. the search button in the Today header).
const OPEN_SEARCH = 'atlas:search';
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH));

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Layout() {
  const [quick, setQuick] = useState(false);
  const sessions = useData((d) => d.sessions);
  const clients = useData((d) => d.clients);
  const [search, setSearch] = useState(false);
  const data = useStore((s) => s.data);
  const settings = data.settings;
  const alertCount = useMemo(() => allAlerts(data).length, [data]);
  const nav = useNavigate();
  const loc = useLocation();
  const live = sessions.find((s) => s.status === 'in_progress');
  const liveClient = live && clients.find((c) => c.id === live.clientId);

  useEffect(() => {
    const open = () => setSearch(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      // Leave an open dialog alone rather than stacking search on top of it.
      if (!document.querySelector('[role="dialog"]')) open();
    };
    window.addEventListener(OPEN_SEARCH, open);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH, open);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const tab = (t: NavEntry) => (
    <NavLink key={t.to} to={t.to} end={t.end} title={t.label} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
      <t.icon size={22} strokeWidth={1.9} aria-hidden />
      <span>{t.label}</span>
      {t.to === '/' && alertCount > 0 && (
        <b className="nav-badge">
          {alertCount}
          <i className="sr-only"> need attention</i>
        </b>
      )}
    </NavLink>
  );

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault(); // the hash belongs to the router
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="backdrop" aria-hidden>
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMin slice">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${-80 - i * 70} 820 C ${180 - i * 60} 420, ${420 - i * 20} ${60 - i * 30}, ${760 + i * 30} ${150 - i * 46} S ${1230 + i * 40} 420, ${1330 + i * 60} 820`} />
          ))}
        </svg>
      </div>
      <nav className="rail" aria-label="Main">
        <div className="rail-brand">
          <Logo size={34} />
          <span className="rail-word">Atlas</span>
        </div>
        <button className="tab-fab" onClick={() => setQuick(true)} aria-label="Quick add">
          <Plus size={22} strokeWidth={2.4} aria-hidden />
          <span className="rail-word">New</span>
        </button>
        <button className="rail-search" title={`Search (${isMac ? '⌘K' : 'Ctrl K'})`} onClick={() => setSearch(true)}>
          <Search size={20} aria-hidden />
          <span>Search</span>
        </button>
        {GROUPS.map((g) => (
          <Fragment key={g.label}>
            <div className="rail-group eyebrow">{g.label}</div>
            {g.items.map(tab)}
          </Fragment>
        ))}
        <div className="rail-spacer" />
        <button className="rail-profile" aria-label="Settings & backup" title="Settings & backup" onClick={() => nav('/settings')}>
          <div className="avatar" style={{ width: 36, height: 36, '--c': 'var(--accent)' } as React.CSSProperties} aria-hidden>
            {initials(settings.trainerName || 'Atlas')}
          </div>
        </button>
      </nav>

      <main id="main" tabIndex={-1} className="main" style={live ? { outline: 'none', paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 104px)' } : { outline: 'none' }}>
        <Outlet />
      </main>

      {live && liveClient && !loc.pathname.startsWith('/workout') && (
        <button
          className="rest-bar"
          style={{ bottom: `calc(var(--tabbar-h) + var(--safe-bottom) + 10px)`, cursor: 'pointer' }}
          onClick={() => nav(`/workout/${live.id}`)}
        >
          <Dumbbell size={20} color="var(--accent-text)" />
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="bold">Workout in progress</div>
            <div className="small muted">
              {firstName(liveClient.name)} · {live.name}
            </div>
          </div>
          <span className="btn btn-primary btn-sm">Resume</span>
        </button>
      )}

      {/* Floating glass tab bar: tabs in one capsule, quick add beside it */}
      <nav className="tabbar" aria-label="Main">
        <div className="tab-capsule">
          {tab(NAV.today)}
          {tab(NAV.clients)}
          {tab(NAV.classes)}
          {tab(NAV.more)}
        </div>
        <button className="tab-fab" onClick={() => setQuick(true)} aria-label="Quick add">
          <Plus size={28} strokeWidth={2.2} aria-hidden />
        </button>
      </nav>

      {search && <CommandPalette onClose={() => setSearch(false)} />}
      <QuickActions open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
