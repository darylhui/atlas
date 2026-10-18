import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote } from 'lucide-react';
import { sessionsRemaining, useStore } from '../lib/store';
import { revenueBetween } from '../lib/analytics/insights';
import { completed } from '../lib/analytics/strength';
import { fmtDay, money, parseDay, today } from '../lib/util';
import { BarChart, ChartCard } from '../components/charts';
import { Avatar, Empty, ListItem, Page, Section, Stat, ZonePill } from '../components/ui';

function monthKey(offset: number) {
  const d = parseDay(today());
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Business() {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const cur = data.settings.currency;
  const t = today();

  const months = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => monthKey(5 - i)).map((m) => {
        const from = `${m}-01`;
        const to = `${m}-31`;
        return {
          m,
          label: parseDay(from).toLocaleString(undefined, { month: 'short' }),
          revenue: revenueBetween(data, from, to),
          sessions: completed(data.sessions).filter((s) => s.date.startsWith(m)).length,
        };
      }),
    [data],
  );

  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const outstanding = data.packages.filter((p) => !p.paid);
  const outstandingTotal = outstanding.reduce((a, p) => a + p.price, 0);
  const past = data.appointments.filter((a) => a.start < new Date().toISOString() && a.status !== 'scheduled' && a.status !== 'cancelled');
  const attended = past.filter((a) => a.status === 'completed').length;
  const attendance = past.length ? Math.round((attended / past.length) * 100) : undefined;
  const allTime = data.packages.filter((p) => p.paid).reduce((a, p) => a + p.price, 0);
  const delivered = completed(data.sessions).length;

  const low = data.clients
    .filter((c) => c.status === 'active')
    .map((c) => ({ c, left: sessionsRemaining(data.packages, c.id) }))
    .filter((x) => x.left != null && x.left <= 3)
    .sort((a, b) => (a.left ?? 0) - (b.left ?? 0));

  const clientName = new Map(data.clients.map((c) => [c.id, c]));

  return (
    <Page title="Business" back="/more" compact>
      <div className="grid-4">
        <Stat label="Revenue this month" value={money(thisMonth.revenue, cur)} delta={<span className="faint">{money(lastMonth.revenue, cur)} last month</span>} />
        <Stat label="Sessions this month" value={thisMonth.sessions} delta={<span className="faint">{lastMonth.sessions} last month</span>} />
        <Stat label="Attendance rate" value={attendance != null ? `${attendance}%` : '–'} delta={<span className="faint">completed vs no-shows</span>} />
        <Stat label="Outstanding" value={money(outstandingTotal, cur)} delta={<span className="faint">{outstanding.length} unpaid packages</span>} />
      </div>

      <div className="cols">
        <ChartCard title="Package revenue" subtitle={`Last 6 months · ${money(allTime, cur)} all time`} table={{ columns: ['Month', 'Revenue'], rows: [...months].reverse().map((m) => [m.label, money(m.revenue, cur)]) }}>
          <BarChart ariaLabel="Revenue by month" data={months.map((m) => ({ key: m.m, label: m.label, value: m.revenue, tip: m.m }))} yFormat={(v) => money(v, cur).replace(/\.00$/, '')} />
        </ChartCard>
        <ChartCard title="Sessions delivered" subtitle={`Last 6 months · ${delivered} all time`} table={{ columns: ['Month', 'Sessions'], rows: [...months].reverse().map((m) => [m.label, m.sessions]) }}>
          <BarChart ariaLabel="Sessions by month" data={months.map((m) => ({ key: m.m, label: m.label, value: m.sessions, tip: m.m }))} />
        </ChartCard>
      </div>

      <div className="cols">
        <Section title="Renewals due">
          <div className="card flush">
            {low.map(({ c, left }) => (
              <ListItem
                key={c.id}
                icon={<Avatar name={c.name} color={c.color} size={34} />}
                title={c.name}
                right={<ZonePill zone={left === 0 ? 'critical' : 'warning'}>{left} left</ZonePill>}
                onClick={() => nav(`/clients/${c.id}?tab=profile`)}
              />
            ))}
            {!low.length && <Empty icon={<Banknote />} title="No renewals due" />}
          </div>
        </Section>

        <Section title="Unpaid packages">
          <div className="card flush">
            {outstanding.map((p) => {
              const c = clientName.get(p.clientId);
              return (
                <ListItem
                  key={p.id}
                  icon={c ? <Avatar name={c.name} color={c.color} size={34} /> : undefined}
                  title={c?.name ?? 'Unknown'}
                  subtitle={`${p.name} · ${fmtDay(p.purchasedAt)}`}
                  right={<span className="bold">{money(p.price, cur)}</span>}
                  onClick={() => c && nav(`/clients/${c.id}?tab=profile`)}
                />
              );
            })}
            {!outstanding.length && <Empty icon={<Banknote />} title="All paid up" />}
          </div>
        </Section>
      </div>
      <p className="xs faint">Revenue counts paid packages by purchase date. As of {fmtDay(t, { year: true })}.</p>
    </Page>
  );
}
