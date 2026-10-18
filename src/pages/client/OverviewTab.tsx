import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, Dumbbell, HeartPulse, Trophy } from 'lucide-react';
import { sessionsRemaining, useStore } from '../../lib/store';
import type { Client } from '../../lib/types';
import { clientAlerts } from '../../lib/analytics/insights';
import { goalProgress } from '../../lib/analytics/engagement';
import { latestCheckIn, readinessFor, readinessZone } from '../../lib/analytics/recovery';
import { completed, prTimeline, sessionVolume, weekStreak } from '../../lib/analytics/strength';
import { addDays, compact, dayKey, fmtDay, fmtTime, fmtWeight, relativeDay, toDisplayWeight, today, weightUnit } from '../../lib/util';
import { Button, Card, Delta, Empty, ListItem, Progress, Ring, Section, Stat, ZonePill } from '../../components/ui';
import { APPT_TYPE } from '../../components/appointments';

export default function OverviewTab({ client, onTab, onStart }: { client: Client; onTab: (t: 'training' | 'recovery' | 'goals' | 'body' | 'profile') => void; onStart: () => void }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const units = data.settings.units;
  const t = today();

  const sessions = useMemo(() => completed(data.sessions, client.id), [data.sessions, client.id]);
  const thisMonth = sessions.filter((s) => s.date.slice(0, 7) === t.slice(0, 7)).length;
  const streak = weekStreak(data.sessions, client.id);
  const ci = latestCheckIn(data.checkIns, client.id);
  const score = ci && ci.date >= addDays(t, -1) ? readinessFor(data.checkIns, ci) : undefined;
  const zone = score != null ? readinessZone(score) : undefined;
  const weights = data.measurements.filter((m) => m.clientId === client.id && m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date));
  const w0 = weights[0]?.weightKg;
  const w1 = weights[weights.length - 1]?.weightKg;
  const left = sessionsRemaining(data.packages, client.id);
  const alerts = useMemo(() => clientAlerts(client, data), [client, data]);
  const goals = data.goals.filter((g) => g.clientId === client.id).slice(0, 3);
  const prs = useMemo(() => prTimeline(data.sessions, client.id).filter((p) => p.kind === 'e1rm').slice(-3).reverse(), [data.sessions, client.id]);
  const next = data.appointments
    .filter((a) => a.clientId === client.id && a.status === 'scheduled' && a.start >= new Date(Date.now() - 3600_000).toISOString())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const exName = new Map(data.exercises.map((e) => [e.id, e.name]));
  const lossGoal = data.goals.find((g) => g.clientId === client.id && g.kind === 'bodyweight');
  const wantDown = lossGoal ? lossGoal.targetValue < lossGoal.startValue : undefined;

  return (
    <div className="stack-lg">
      {(client.injuries || client.medical || client.parq?.answers.some(Boolean)) && (
        <div className="banner danger">
          <HeartPulse size={18} style={{ flex: 'none', marginTop: 1 }} />
          <div>
            <div className="bold">Health flags</div>
            {client.injuries && <div className="small mt-1">{client.injuries}</div>}
            {client.medical && <div className="small mt-1">{client.medical}</div>}
            {client.parq?.answers.some(Boolean) && <div className="small mt-1 muted">PAR-Q has “yes” answers — check clearance.</div>}
          </div>
        </div>
      )}

      <div className="cols">
        <Card>
          <div className="row" style={{ gap: 16 }}>
            <Ring pct={(score ?? 0) / 100} size={104} color={zone ? `var(--${zone.zone})` : 'var(--surface-3)'}>
              <b>{score ?? '–'}</b>
              <small>readiness</small>
            </Ring>
            <div className="grow">
              {zone ? (
                <>
                  <ZonePill zone={zone.zone}>{zone.label}</ZonePill>
                  <p className="small muted mt-1">{zone.advice}</p>
                  <button className="section-link small mt-1" onClick={() => onTab('recovery')}>
                    View recovery →
                  </button>
                </>
              ) : (
                <>
                  <div className="bold">No check-in today</div>
                  <p className="small muted mt-1">{ci ? `Last one ${relativeDay(ci.date).toLowerCase()}.` : 'Start tracking readiness to guide training intensity.'}</p>
                  <Button size="sm" variant="primary" className="mt-2" onClick={() => nav(`/clients/${client.id}/check-in`)}>
                    <Activity size={16} /> Check in now
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        <div className="grid-2">
          <Stat label="Sessions" value={sessions.length} delta={<span className="faint">{thisMonth} this month</span>} />
          <Stat label="Week streak" value={streak} unit={streak === 1 ? 'week' : 'weeks'} delta={<span className="faint">{streak >= 4 ? 'On fire' : 'Keep it going'}</span>} />
          <Stat
            label="Bodyweight"
            value={w1 != null ? Math.round(toDisplayWeight(w1, units) * 10) / 10 : '–'}
            unit={w1 != null ? weightUnit(units) : undefined}
            delta={w0 != null && w1 != null && weights.length > 1 ? <Delta value={toDisplayWeight(w1 - w0, units)} goodWhen={wantDown == null ? 'none' : wantDown ? 'down' : 'up'} label="since start" /> : undefined}
          />
          <Stat label="Package" value={left ?? '–'} unit={left != null ? 'left' : undefined} delta={<span className="faint">{left == null ? 'No active package' : 'sessions remaining'}</span>} />
        </div>
      </div>

      {alerts.length > 0 && (
        <Section title="Flags">
          <div className="card flush">
            {alerts.map((a) => (
              <div key={a.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <ZonePill zone={a.severity}>{a.title}</ZonePill>
                  <div className="small faint mt-1">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="cols">
        <Section title="Next up">
          <div className="card flush">
            {next ? (
              <ListItem
                icon={<CalendarDays size={20} className="faint" />}
                title={`${relativeDay(dayKey(new Date(next.start)))} · ${fmtTime(next.start)}`}
                subtitle={`${APPT_TYPE[next.type].label} · ${next.durationMin} min${next.location ? ' · ' + next.location : ''}`}
                onClick={() => nav('/schedule')}
              />
            ) : (
              <ListItem icon={<CalendarDays size={20} className="faint" />} title="No upcoming sessions" subtitle="Book from the schedule" onClick={() => nav(`/schedule?new=1&client=${client.id}`)} />
            )}
            <ListItem icon={<Dumbbell size={20} color="var(--accent)" />} title="Start a workout now" onClick={onStart} />
          </div>
        </Section>

        <Section title="Goals" action={<button className="section-link" onClick={() => onTab('goals')}>All</button>}>
          <div className="card stack">
            {goals.map((g) => {
              const p = goalProgress(g, data);
              const isKg = g.unit === 'kg';
              return (
                <div key={g.id}>
                  <div className="row-between small">
                    <span className="bold truncate">{g.title}</span>
                    <span className="faint tabular">
                      {isKg ? fmtWeight(p.current, units) : Math.round(p.current)} / {isKg ? fmtWeight(g.targetValue, units) : `${g.targetValue} ${g.unit}`}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Progress pct={p.pct} color={p.achieved ? 'var(--good)' : undefined} />
                  </div>
                </div>
              );
            })}
            {!goals.length && <div className="small faint">No goals yet — set one to keep motivation high.</div>}
          </div>
        </Section>
      </div>

      <div className="cols">
        <Section title="Recent sessions" action={<button className="section-link" onClick={() => onTab('training')}>History</button>}>
          <div className="card flush">
            {sessions
              .slice(-4)
              .reverse()
              .map((s) => (
                <ListItem
                  key={s.id}
                  title={s.name}
                  subtitle={`${relativeDay(s.date)} · ${s.durationMin ?? '–'} min · ${compact(sessionVolume(s))} kg volume${s.sessionRpe ? ` · RPE ${s.sessionRpe}` : ''}`}
                  onClick={() => nav(`/sessions/${s.id}`)}
                />
              ))}
            {!sessions.length && <Empty icon={<Dumbbell />} title="No sessions yet" />}
          </div>
        </Section>

        <Section title="Latest PRs">
          <div className="card flush">
            {prs.map((p, i) => (
              <ListItem
                key={i}
                icon={<Trophy size={18} color="var(--accent)" />}
                title={exName.get(p.exerciseId)}
                subtitle={`${fmtWeight(p.weight, units)} × ${p.reps} · est. 1RM ${fmtWeight(p.value, units)} · ${fmtDay(p.date)}`}
                onClick={() => nav(`/sessions/${p.sessionId}`)}
              />
            ))}
            {!prs.length && <Empty icon={<Trophy />} title="No PRs yet">They’ll appear here automatically.</Empty>}
          </div>
        </Section>
      </div>
    </div>
  );
}
