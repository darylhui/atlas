import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Calculator, CalendarDays, ClipboardList, Dumbbell, House, MapPin, Search, Settings, Timer, Users, type LucideIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar, Empty, SearchInput, Sheet } from './ui';

interface Hit {
  id: string;
  title: string;
  sub: string;
  to: string;
  icon: React.ReactNode;
}

const PAGES: { title: string; to: string; icon: LucideIcon; words: string }[] = [
  { title: 'Today', to: '/', icon: House, words: 'dashboard home' },
  { title: 'Schedule', to: '/schedule', icon: CalendarDays, words: 'calendar bookings' },
  { title: 'Book a PT session', to: '/schedule?new=1', icon: CalendarDays, words: 'appointment new' },
  { title: 'Clients', to: '/clients', icon: Users, words: 'people members' },
  { title: 'New client', to: '/clients/new', icon: Users, words: 'add' },
  { title: 'Classes', to: '/classes', icon: Timer, words: 'group studio timetable' },
  { title: 'Library', to: '/library', icon: ClipboardList, words: 'templates exercises lessons' },
  { title: 'Locations', to: '/locations', icon: MapPin, words: 'gyms machines equipment studios' },
  { title: 'Business', to: '/business', icon: Banknote, words: 'income revenue packages' },
  { title: 'Coach tools', to: '/tools', icon: Calculator, words: '1rm plates interval timer rpe' },
  { title: 'Settings & backup', to: '/settings', icon: Settings, words: 'display text theme units' },
];

const LIMIT = 6;

function Tile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="icon-tile">
      <Icon size={18} aria-hidden />
    </div>
  );
}

/** Jump to any client, page, lesson, template or exercise (⌘K / Ctrl K). */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const has = (s: string) => s.toLowerCase().includes(ql);
    const clients: Hit[] = data.clients
      .filter((c) => (ql ? has(c.name) : c.status === 'active'))
      .map((c) => ({ id: `c-${c.id}`, title: c.name, sub: c.status === 'active' ? 'Client' : `Client · ${c.status}`, to: `/clients/${c.id}`, icon: <Avatar name={c.name} color={c.color} size={36} /> }));
    const pages: Hit[] = PAGES.filter((p) => has(p.title) || (ql && p.words.includes(ql))).map((p) => ({ id: `p-${p.to}`, title: p.title, sub: 'Go to', to: p.to, icon: <Tile icon={p.icon} /> }));
    const library: Hit[] = !ql
      ? []
      : [
          ...data.machines.filter((m) => has(m.name)).map((m) => ({ id: `m-${m.id}`, title: m.name, sub: `Machine · ${data.studios.find((s) => s.id === m.studioId)?.name ?? ''}`, to: `/locations/${m.studioId}?machine=${m.id}`, icon: <Tile icon={MapPin} /> })),
          ...data.lessons.filter((l) => has(l.title) || has(l.programType)).map((l) => ({ id: `l-${l.id}`, title: l.title, sub: `Lesson · ${l.programType}`, to: `/classes/lesson/${l.id}`, icon: <Tile icon={Timer} /> })),
          ...data.templates.filter((t) => has(t.name)).map((t) => ({ id: `t-${t.id}`, title: t.name, sub: 'Workout template', to: `/library/template/${t.id}`, icon: <Tile icon={ClipboardList} /> })),
          ...data.exercises.filter((e) => has(e.name)).map((e) => ({ id: `e-${e.id}`, title: e.name, sub: 'Exercise', to: `/library/exercise/${e.id}`, icon: <Tile icon={Dumbbell} /> })),
        ];
    return [
      { label: 'Clients', hits: clients.slice(0, LIMIT) },
      { label: 'Pages & actions', hits: pages.slice(0, ql ? LIMIT : PAGES.length) },
      { label: 'Machines & library', hits: library.slice(0, LIMIT) },
    ].filter((g) => g.hits.length);
  }, [q, data]);

  const flat = groups.flatMap((g) => g.hits);
  const go = (h: Hit) => {
    onClose();
    nav(h.to);
  };
  const move = (d: number) => {
    if (!flat.length) return;
    const next = (sel + d + flat.length) % flat.length;
    setSel(next);
    document.getElementById(`hit-${flat[next].id}`)?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <Sheet open onClose={onClose} title="Search">
      <div
        className="stack"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') move(1);
          else if (e.key === 'ArrowUp') move(-1);
          else if (e.key === 'Enter' && flat[sel] && (e.target as HTMLElement).tagName === 'INPUT') go(flat[sel]);
          else return;
          e.preventDefault();
        }}
      >
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setSel(0);
          }}
          placeholder="Search clients, lessons, exercises…"
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-hits"
          aria-activedescendant={flat[sel] && `hit-${flat[sel].id}`}
        />
        <div id="palette-hits" role="listbox" aria-label="Results" className="stack">
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="eyebrow" style={{ padding: '4px 0 8px' }}>
                {g.label}
              </div>
              <div className="card flush">
                {g.hits.map((h) => (
                  <button
                    key={h.id}
                    id={`hit-${h.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={flat[sel]?.id === h.id}
                    className={`list-item palette-row${flat[sel]?.id === h.id ? ' sel' : ''}`}
                    onMouseMove={() => setSel(flat.indexOf(h))}
                    onClick={() => go(h)}
                  >
                    {h.icon}
                    <div className="grow">
                      <div className="bold truncate">{h.title}</div>
                      <div className="small faint truncate">{h.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!flat.length && (
          <Empty icon={<Search />} title="No matches">
            Try a client’s name, a lesson or an exercise.
          </Empty>
        )}
      </div>
    </Sheet>
  );
}
