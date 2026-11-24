import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, CircleAlert, Plus, Search, Settings as Cog, Timer, Trophy, Wallet } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Appointment } from '../lib/types';
import { allAlerts, type Alert } from '../lib/analytics/insights';
import { latestCheckIn, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { prTimeline } from '../lib/analytics/strength';
import { addDays, dayKey, firstName, fmtDay, fmtTime, fmtNum, fmtWeight, today, weekStart } from '../lib/util';
import { openSearch } from '../components/Layout';
import { StartWorkoutSheet } from '../components/sheets';
import { APPT_TYPE, AppointmentActions, AppointmentRow } from '../components/appointments';
import { ClassRow } from '../components/classes';
import { TodayWidgets } from '../components/today';
import { Avatar, Button, Card, Empty, IconButton, Page, Section, ZonePill } from '../components/ui';
import { Sparkline } from '../components/charts';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Where an alert's one-tap action goes. */
const ALERT_ACTION: Record<Alert['kind'], { label: string; path: string }> = {
  readiness: { label: 'Review', path: '?tab=recovery' },
  load: { label: 'Review', path: '?tab=recovery' },
  inactive: { label: 'Open', path: '' },
  package: { label: 'Renew', path: '?tab=profile' },
  payment: { label: 'Payment', path: '?tab=profile' },
  checkin: { label: 'Check in', path: '/check-in' },
  birthday: { label: 'Open', path: '' },
  goal: { label: 'Goal', path: '?tab=goals' },
};

const endOf = (x: { start: string; durationMin: number }) => Date.parse(x.start) + x.durationMin * 60_000;

/** Current time, refreshed each minute so "up next" and finished rows stay right. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Dashboard() {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [appt, setAppt] = useState<Appointment>();
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [start, setStart] = useState<string>();
  const now = useNow();
  const t = today();
  const units = data.settings.units;

  const todays = useMemo(
    () =>
      [
        ...data.appointments.filter((a) => dayKey(new Date(a.start)) === t).map((a) => ({ kind: 'appt' as const, start: a.start, a })),
        ...data.groupClasses.filter((g) => dayKey(new Date(g.start)) === t).map((g) => ({ kind: 'class' as const, start: g.start, g })),
      ].sort((x, y) => x.start.localeCompare(y.start)),
    [data.appointments, data.groupClasses, t],
  );
  // The session running now or coming up soonest (next 7 days), plus anything finished but still unmarked.
  const next = useMemo(() => {
    const horizon = now + 7 * 86_400_000;
    return [
      ...data.appointments.filter((a) => a.status === 'scheduled').map((a) => ({ kind: 'appt' as const, start: a.start, end: endOf(a), a })),
      ...data.groupClasses.filter((g) => g.status === 'scheduled').map((g) => ({ kind: 'class' as const, start: g.start, end: endOf(g), g })),
    ]
      .filter((x) => x.end > now && Date.parse(x.start) < horizon)
      .sort((x, y) => Date.parse(x.start) - Date.parse(y.start))[0];
  }, [data.appointments, data.groupClasses, now]);
  const toMark = todays.filter((x) => (x.kind === 'appt' ? x.a : x.g).status === 'scheduled' && endOf(x.kind === 'appt' ? x.a : x.g) <= now).length;
  const alerts = useMemo(() => allAlerts(data), [data]);
  const active = data.clients.filter((c) => c.status === 'active');
  const clientById = new Map(data.clients.map((c) => [c.id, c]));


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
      center
      title={`${greeting()}${data.settings.trainerName ? `, ${firstName(data.settings.trainerName.replace(/^coach\s+/i, ''))}` : ''}`}
      eyebrow={fmtDay(t, { weekday: true })}
      actions={
        <>
        <IconButton label="Search" onClick={openSearch}>
          <Search size={20} />
        </IconButton>
        <IconButton label="Settings" onClick={() => nav('/settings')}>
          <Cog size={20} />
        </IconButton>
        </>
      }
    >
      <button className="ask" onClick={openSearch}>
        Find a client, lesson or exercise
      </button>

      {(next || toMark > 0) && (
        <section className="hero" aria-label="Up next">
          <div className="hero-main">
            <div className="eyebrow">
              {!next
                ? 'Today'
                : Date.parse(next.start) <= now
                  ? 'Now'
                  : `Up next · ${dayKey(new Date(next.start)) === t ? 'today' : dayKey(new Date(next.start)) === addDays(t, 1) ? 'tomorrow' : fmtDay(dayKey(new Date(next.start)), { weekday: true })}`}
            </div>
            <div className="hero-title">
              {next ? `${fmtTime(next.start)} · ${next.kind === 'appt' ? (clientById.get(next.a.clientId)?.name ?? 'Client') : `${next.g.programType} class`}` : 'Nothing else booked this week'}
            </div>
            <div className="small muted mt-1">
              {[
                next && (next.kind === 'appt' ? `${APPT_TYPE[next.a.type].label} · ${next.a.durationMin} min` : `${next.g.attendees.length} booked · ${next.g.durationMin} min`),
                toMark > 0 && `${toMark} finished today still to mark`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          {next && (
            <div className="hero-actions">
              {next.kind === 'class' ? (
                <Button variant="primary" onClick={() => nav(`/classes/session/${next.g.id}`)}>
                  Open class
                </Button>
              ) : (
                <>
                  {dayKey(new Date(next.start)) !== t ? null : next.a.type === 'check_in' ? (
                    <Button variant="primary" onClick={() => nav(`/clients/${next.a.clientId}/check-in`)}>
                      Check in
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => setStart(next.a.clientId)}>
                      Start workout
                    </Button>
                  )}
                  <Button onClick={() => setAppt(next.a)}>Details</Button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <div className="toolbar">
        <button className="chip" onClick={() => nav('/schedule')}>
          <CalendarDays size={16} aria-hidden /> {fmtDay(weekStart(t))} – {fmtDay(addDays(weekStart(t), 6))}
        </button>
        <button className="chip" onClick={() => nav('/schedule?new=1')}>
          <Plus size={16} aria-hidden /> Book session
        </button>
        <button className="chip" onClick={() => nav('/classes')}>
          <Timer size={16} aria-hidden /> Classes
        </button>
        <button className="chip" onClick={() => nav('/business')}>
          <Wallet size={16} aria-hidden /> Business
        </button>
      </div>

      <TodayWidgets data={data} />

      <div className="cols">
        <Section title="Needs attention" action={alerts.length > 5 ? <button className="section-link" onClick={() => setShowAllAlerts((v) => !v)}>{showAllAlerts ? 'Less' : `All ${alerts.length}`}</button> : undefined}>
          <div className="card flush">
            {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((a) => {
              const c = clientById.get(a.clientId)!;
              return (
                <button key={a.id} className="list-item" onClick={() => nav(`/clients/${c.id}${ALERT_ACTION[a.kind].path}`)}>
                  <span className="status-bar" style={{ background: `var(--${a.severity})` }} aria-hidden />
                  <div className="grow">
                    <div className="row-title">
                      <span className="bold">{firstName(c.name)}</span>
                      <ZonePill zone={a.severity}>{a.title}</ZonePill>
                    </div>
                    <div className="small muted two-line mt-1">{a.detail}</div>
                  </div>
                  <span className="row-action">{ALERT_ACTION[a.kind].label}</span>
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

        <Section
          title="Today’s schedule"
          action={
            <button className="section-link" onClick={() => nav('/schedule')}>
              Schedule
            </button>
          }
        >
          <div className="card flush">
            {todays.map((x) =>
              x.kind === 'appt' ? <AppointmentRow key={x.a.id} a={x.a} past={endOf(x.a) <= now} onClick={() => setAppt(x.a)} /> : <ClassRow key={x.g.id} g={x.g} past={endOf(x.g) <= now} onClick={() => nav(`/classes/session/${x.g.id}`)} />,
            )}
            {!todays.length && (
              <Empty icon={<CalendarDays />} title="Nothing booked today">
                Tap + to book a session or start a workout.
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
                  <div className="quick-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
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

      {start && <StartWorkoutSheet open clientId={start} onClose={() => setStart(undefined)} />}
      <AppointmentActions appt={appt} onClose={() => setAppt(undefined)} />
    </Page>
  );
}
