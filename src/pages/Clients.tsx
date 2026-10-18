import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { sessionsRemaining, useStore } from '../lib/store';
import type { Client } from '../lib/types';
import { latestCheckIn, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { daysSinceLastSession } from '../lib/analytics/strength';
import { addDays, today } from '../lib/util';
import { Avatar, Button, Chips, Empty, IconButton, Page, SearchInput, ZonePill } from '../components/ui';
import { ChevronRight } from 'lucide-react';
import { fs } from '../lib/display';

type Filter = 'active' | 'paused' | 'archived' | 'all';

export default function Clients() {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('active');

  const rows = useMemo(() => {
    const t = today();
    return data.clients
      .filter((c) => (filter === 'all' || c.status === filter) && c.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const ci = latestCheckIn(data.checkIns, c.id);
        const score = ci && ci.date >= addDays(t, -1) ? readinessFor(data.checkIns, ci) : undefined;
        return { c, score, left: sessionsRemaining(data.packages, c.id), idle: daysSinceLastSession(data.sessions, c.id) };
      });
  }, [data, q, filter]);

  const counts = (s: Client['status']) => data.clients.filter((c) => c.status === s).length;

  return (
    <Page
      title="Clients"
      subtitle={`${counts('active')} active`}
      actions={
        <IconButton label="New client" className="accent" onClick={() => nav('/clients/new')}>
          <UserPlus size={20} />
        </IconButton>
      }
    >
      <div className="stack">
        <SearchInput value={q} onChange={setQ} placeholder="Search clients" />
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: `Active ${counts('active')}` },
            { value: 'paused', label: `Paused ${counts('paused')}` },
            { value: 'archived', label: `Archived ${counts('archived')}` },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <div className="card flush">
        {rows.map(({ c, score, left, idle }) => (
          <button key={c.id} className="list-item" onClick={() => nav(`/clients/${c.id}`)}>
            <Avatar name={c.name} color={c.color} size={44} />
            <div className="grow">
              <div className="bold truncate" style={{ fontSize: fs(16) }}>
                {c.name}
              </div>
              <div className="small faint truncate">
                {[idle == null ? 'No sessions yet' : idle === 0 ? 'Trained today' : `Last session ${idle}d ago`, left != null ? `${left} sessions left` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            {score != null && <ZonePill zone={readinessZone(score).zone}>{score}</ZonePill>}
            <ChevronRight size={18} className="chev" />
          </button>
        ))}
        {!rows.length && (
          <Empty icon={<UserPlus />} title={data.clients.length ? 'No matches' : 'No clients yet'} action={<Button variant="primary" onClick={() => nav('/clients/new')}>Add client</Button>}>
            {data.clients.length ? 'Try a different search or filter.' : 'Add your first client to start tracking.'}
          </Empty>
        )}
      </div>
    </Page>
  );
}
