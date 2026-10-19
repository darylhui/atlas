import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, Dumbbell, House, Menu, Plus, Timer, Users } from 'lucide-react';
import { useData } from '../lib/store';
import { firstName } from '../lib/util';
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

const TABS = [
  { to: '/', label: 'Today', icon: House, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/classes', label: 'Classes', icon: Timer },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/library', label: 'Library', icon: ClipboardList },
  { to: '/more', label: 'More', icon: Menu },
];

export function Layout() {
  const [quick, setQuick] = useState(false);
  const sessions = useData((d) => d.sessions);
  const clients = useData((d) => d.clients);
  const nav = useNavigate();
  const loc = useLocation();
  const live = sessions.find((s) => s.status === 'in_progress');
  const liveClient = live && clients.find((c) => c.id === live.clientId);

  const tab = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
      <t.icon size={24} strokeWidth={1.9} aria-hidden />
      <span>{t.label}</span>
    </NavLink>
  );

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <div className="rail-brand">
          <Logo size={34} />
          <span className="rail-word">Atlas</span>
        </div>
        <button className="tab-fab" onClick={() => setQuick(true)} aria-label="Quick add">
          <Plus size={22} strokeWidth={2.4} aria-hidden />
          <span className="rail-word">New</span>
        </button>
        {TABS.map(tab)}
        <div className="rail-spacer" />
      </nav>

      <main className="main" style={live ? { paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 104px)' } : undefined}>
        <Outlet />
      </main>

      {live && liveClient && !loc.pathname.startsWith('/workout') && (
        <button
          className="rest-bar"
          style={{ bottom: `calc(var(--tabbar-h) + var(--safe-bottom) + 10px)`, cursor: 'pointer' }}
          onClick={() => nav(`/workout/${live.id}`)}
        >
          <Dumbbell size={20} color="var(--accent)" />
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
          {tab(TABS[0])}
          {tab(TABS[1])}
          {tab(TABS[2])}
          {tab(TABS[5])}
        </div>
        <button className="tab-fab" onClick={() => setQuick(true)} aria-label="Quick add">
          <Plus size={28} strokeWidth={2.2} aria-hidden />
        </button>
      </nav>

      <QuickActions open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
