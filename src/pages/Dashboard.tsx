import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, CircleAlert, Dumbbell, Settings as Cog, Trophy, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Appointment } from '../lib/types';
import { allAlerts, monthStart, revenueBetween } from '../lib/analytics/insights';
import { latestCheckIn, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { completed, prTimeline } from '../lib/analytics/strength';
import { addDays, dayKey, firstName, fmtDay, fmtNum, fmtWeight, mean, money, today, weekStart } from '../lib/util';
import { AppointmentActions, AppointmentRow } from '../components/appointments';
import { Avatar, Card, Empty, IconButton, Page, Section, Stat, ZonePill } from '../components/ui';
import { Sparkline } from '../components/charts';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [appt, setAppt] = useState<Appointment>();
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const t = today();
  const units = data.settings.units;

  const todays = useMemo(
    () => data.appointments.filter((a) => dayKey(new Date(a.start)) === t).sort((a, b) => a.start.localeCompare(b.start)),
    [data.appointments, t],
  );
  const alerts = useMemo(() => allAlerts(data), [data]);
  const active = data.clients.filter((c) => c.status === 'active');
  const clientById = new Map(data.clients.map((c) => [c.id, c]));

  const weekSessions = completed(data.sessions).filter((s) => s.date >= weekStart(t)).length;
  const lastWeekSessions = completed(data.sessions).filter((s) => s.date >= addDays(weekStart(t), -7) && s.date < weekStart(t)).length;
  const revenue = revenueBetween(data, monthStart(t), t);

  const readinessBoard = useMemo(
    () =>
      active
        .map((c) => {
          const ci = latestCheckIn(data.checkIns, c.id);
          const fresh = ci && ci.date >= addDays(t, -1);
          const history = data.checkIns
            .filter((x) => x.clientId === c.id && x.date >= addDays(t, -13))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((x) => readinessFor(data.checkIns, x));
          return { c, score: fresh ? readinessFor(data.checkIns, ci) : undefined, date: ci?.date, history };
        })
        .sort((a, b) => (a.score ?? 101) - (b.score ?? 101)),
    [active, data.checkIns, t],
  );
  const scored = readinessBoard.filter((r) => r.score != null).map((r) => r.score!);

  const recentPRs = useMemo(
    () =>
      active
        .flatMap((c) => prTimeline(data.sessions, c.id).filter((p) => p.date >= addDays(t, -7) && p.kind === 'e1rm'))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [active, data.sessions, t],
  );
  const exName = new Map(data.exercises.map((e) => [e.id, e.name]));

  return (
    <Page
      title={`${greeting()}${data.settings.trainerName ? `, ${firstName(data.settings.trainerName.replace(/^coach\s+/i, ''))}` : ''}`}
      subtitle={fmtDay(t, { weekday: true })}
      actions={
        <IconButton label="Settings" onClick={() => nav('/settings')}>
          <Cog size={20} />
        </IconButton>
      }
    >
      <div className="grid-4">
        <Stat label="Sessions this week" icon={<Dumbbell size={14} />} value={weekSessions} delta={<span className="faint">{lastWeekSessions} last week</span>} />
        <Stat label="Active clients" icon={<Users size={14} />} value={active.length} />
        <Stat label="Avg readiness" icon={<Activity size={14} />} value={scored.length ? Math.round(mean(scored)) : '–'} delta={<span className="faint">{scored.length} checked in</span>} />
        <Stat label="Revenue this month" value={money(revenue, data.settings.currency)} />
      </div>

      <div className="cols">
        <Section
          title="Today’s schedule"
          action={
            <button className="section-link" onClick={() => nav('/schedule')}>
              Schedule
            </button>
          }
        >
          <div className="card flush">
            {todays.map((a) => (
              <AppointmentRow key={a.id} a={a} onClick={() => setAppt(a)} />
            ))}
            {!todays.length && (
              <Empty icon={<CalendarDays />} title="Nothing booked today">
                Tap + to book a session or start a workout.
              </Empty>
            )}
          </div>
        </Section>

        <Section title="Needs attention" action={alerts.length > 5 ? <button className="section-link" onClick={() => setShowAllAlerts((v) => !v)}>{showAllAlerts ? 'Less' : `All ${alerts.length}`}</button> : undefined}>
          <div className="card flush">
            {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((a) => {
              const c = clientById.get(a.clientId)!;
              return (
                <button key={a.id} className="list-item" onClick={() => nav(`/clients/${c.id}`)} style={{ alignItems: 'flex-start' }}>
                  <Avatar name={c.name} color={c.color} size={34} />
                  <div className="grow">
                    <div className="row" style={{ gap: 6 }}>
                      <span className="bold truncate">{firstName(c.name)}</span>
                      <ZonePill zone={a.severity}>{a.title}</ZonePill>
                    </div>
                    <div className="small faint mt-1">{a.detail}</div>
                  </div>
                </button>
              );
            })}
            {!alerts.length && (
              <Empty icon={<CircleAlert />} title="All clear">
                No flags across your clients right now.
              </Empty>
            )}
          </div>
        </Section>

        <Section title="Readiness board">
          <div className="card flush">
            {readinessBoard.map(({ c, score, history, date }) => {
              const z = score != null ? readinessZone(score) : undefined;
              return (
                <button key={c.id} className="list-item" onClick={() => nav(`/clients/${c.id}?tab=recovery`)}>
                  <Avatar name={c.name} color={c.color} size={34} />
                  <div className="grow">
                    <div className="bold truncate">{c.name}</div>
                    <div className="small faint">{score != null ? z!.label : date ? `Last check-in ${fmtDay(date)}` : 'No check-ins'}</div>
                  </div>
                  <Sparkline values={history} />
                  <div style={{ width: 64, textAlign: 'right' }}>
                    {z ? <ZonePill zone={z.zone}>{score}</ZonePill> : <span className="faint">–</span>}
                  </div>
                </button>
              );
            })}
            {!readinessBoard.length && <Empty icon={<Activity />} title="No active clients" />}
          </div>
        </Section>

        <Section title="Recent PRs">
          <div className="card flush">
            {recentPRs.map((p, i) => {
              const c = data.clients.find((x) => x.id === data.sessions.find((s) => s.id === p.sessionId)?.clientId);
              return (
                <button key={i} className="list-item" onClick={() => nav(`/sessions/${p.sessionId}`)}>
                  <div className="quick-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <Trophy size={18} />
                  </div>
                  <div className="grow">
                    <div className="bold truncate">
                      {c ? firstName(c.name) : ''} · {exName.get(p.exerciseId)}
                    </div>
                    <div className="small faint">
                      {fmtWeight(p.weight, units)} × {p.reps} · est. 1RM {fmtWeight(p.value, units)} (+{fmtNum(((p.value - p.previous) / p.previous) * 100)}%)
                    </div>
                  </div>
                  <span className="small faint">{fmtDay(p.date)}</span>
                </button>
              );
            })}
            {!recentPRs.length && (
              <Empty icon={<Trophy />} title="No PRs this week">
                PRs are detected automatically as you log sets.
              </Empty>
            )}
          </div>
        </Section>
      </div>

      {data.clients.length === 0 && (
        <Card>
          <div className="bold">Add your first client</div>
          <p className="small muted mt-1">Tap the + button, or load the demo studio from Settings to explore every feature.</p>
        </Card>
      )}

      <AppointmentActions appt={appt} onClose={() => setAppt(undefined)} />
    </Page>
  );
}
