import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, Dumbbell, House, Menu, Plus, Users } from 'lucide-react';
import { useData } from '../lib/store';
import { firstName } from '../lib/util';
import { QuickActions } from './sheets';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9.5 24 16 8l6.5 16" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18.5h20" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="5" y="15.5" width="2.6" height="6" rx="1" fill="var(--accent-ink)" />
      <rect x="24.4" y="15.5" width="2.6" height="6" rx="1" fill="var(--accent-ink)" />
    </svg>
  );
}

const TABS = [
  { to: '/', label: 'Today', icon: House, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
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
      <t.icon size={23} strokeWidth={2} />
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
          <Plus size={24} strokeWidth={2.6} />
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

      <nav className="tabbar" aria-label="Main">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <button className="tab-fab" onClick={() => setQuick(true)} aria-label="Quick add">
          <Plus size={26} strokeWidth={2.6} />
        </button>
        {tab(TABS[2])}
        {tab(TABS[4])}
      </nav>

      <QuickActions open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
