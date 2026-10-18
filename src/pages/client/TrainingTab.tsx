import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { Client, MuscleGroup } from '../../lib/types';
import { MUSCLE_LABEL } from '../../lib/seed/exercises';
import { completed, exerciseHistory, prTimeline, sessionSetCount, sessionVolume, setsPerMuscle, topExercises, weeklyTotals } from '../../lib/analytics/strength';
import { addDays, compact, dayKey, fmtDay, fmtNum, fmtShortDay, fmtWeight, relativeDay, round, toDisplayWeight, today, weightUnit } from '../../lib/util';
import { classTitle } from '../../lib/classes';
import { BarChart, ChartCard, HBars, Heatmap, LineChart } from '../../components/charts';
import { Chips, Empty, ListItem, Section, Segmented, Stat } from '../../components/ui';

export default function TrainingTab({ client }: { client: Client }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const units = data.settings.units;
  const t = today();
  const exMap = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
  const sessions = useMemo(() => completed(data.sessions, client.id), [data.sessions, client.id]);
  const weeks = useMemo(() => weeklyTotals(data.sessions, 12, client.id), [data.sessions, client.id]);
  const top = useMemo(() => topExercises(data.sessions, client.id, exMap, 8), [data.sessions, client.id, exMap]);
  const [lift, setLift] = useState<string | undefined>(top[0]);
  const liftId = lift ?? top[0];
  const history = useMemo(() => (liftId ? exerciseHistory(data.sessions, liftId, client.id) : []), [data.sessions, liftId, client.id]);
  const prs = useMemo(() => prTimeline(data.sessions, client.id), [data.sessions, client.id]);
  const [range, setRange] = useState<'7' | '28'>('7');
  const [showAll, setShowAll] = useState(false);
  const muscles = useMemo(() => {
    const days = Number(range);
    const per = setsPerMuscle(data.sessions, exMap, addDays(t, -(days - 1)), t, client.id);
    const scale = days === 28 ? 4 : 1;
    return (Object.entries(per) as [MuscleGroup, number][])
      .filter(([m]) => m !== 'cardio' && m !== 'full_body')
      .map(([m, v]) => ({ label: MUSCLE_LABEL[m], value: v / scale }))
      .sort((a, b) => b.value - a.value);
  }, [data.sessions, exMap, range, t, client.id]);
  const groupClasses = useMemo(
    () =>
      data.groupClasses
        .filter((g) => g.status === 'completed' && g.attendees.some((a) => a.clientId === client.id && a.present))
        .sort((a, b) => b.start.localeCompare(a.start)),
    [data.groupClasses, client.id],
  );
  const attendance = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + 1);
    for (const g of groupClasses) {
      const k = dayKey(new Date(g.start));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [sessions, groupClasses]);

  if (!sessions.length)
    return (
      <Empty icon={<Dumbbell />} title="No training data yet">
        Complete a workout to unlock strength, volume and attendance analytics.
      </Empty>
    );

  const totalVol = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const avgDur = Math.round(sessions.reduce((a, s) => a + (s.durationMin ?? 0), 0) / sessions.length);
  const last4 = weeks.slice(-4).reduce((a, w) => a + w.sessions, 0) / 4;
  const best = history.length ? history.reduce((a, h) => (h.bestE1rm > a.bestE1rm ? h : a)) : undefined;
  const first = history[0];
  const liftPRs = prs.filter((p) => p.exerciseId === liftId && p.kind === 'e1rm').length;
  const wu = weightUnit(units);

  return (
    <div className="stack-lg">
      <div className="grid-4">
        <Stat label="Total sessions" value={sessions.length} />
        <Stat label="Per week (4 wk avg)" value={fmtNum(last4)} />
        <Stat label="Avg duration" value={avgDur} unit="min" />
        <Stat label="Lifetime volume" value={compact(toDisplayWeight(totalVol, units))} unit={wu} />
      </div>

      {top.length > 0 && (
        <Section title="Strength progress">
          <div className="stack">
            <Chips value={liftId!} onChange={setLift} options={top.map((id) => ({ value: id, label: exMap.get(id)?.name ?? id }))} />
            <ChartCard
              title={`${exMap.get(liftId!)?.name} — estimated 1RM`}
              subtitle={
                best && first
                  ? `Best ${fmtWeight(best.bestE1rm, units)} · ${best.bestE1rm > first.bestE1rm ? '+' : ''}${fmtNum(((best.bestE1rm - first.bestE1rm) / first.bestE1rm) * 100)}% since first logged · ${liftPRs} PRs`
                  : undefined
              }
              table={{
                columns: ['Date', 'Top set', `e1RM (${wu})`],
                rows: [...history].reverse().map((h) => [fmtDay(h.date), `${fmtWeight(h.topWeight, units, false)} × ${h.topReps}`, fmtNum(toDisplayWeight(h.bestE1rm, units))]),
              }}
            >
              <LineChart
                ariaLabel="Estimated one rep max over time"
                series={[{ name: 'e1RM', color: 'var(--series-1)', area: true, points: history.map((h) => ({ x: h.date, y: round(toDisplayWeight(h.bestE1rm, units), 1) })) }]}
                yFormat={(v) => fmtNum(v, 0)}
                tipFormat={(v) => `${fmtNum(v)} ${wu}`}
              />
            </ChartCard>
          </div>
        </Section>
      )}

      <div className="cols">
        <ChartCard
          title="Weekly volume"
          subtitle={`Working-set tonnage (${wu}), last 12 weeks`}
          table={{ columns: ['Week of', `Volume (${wu})`, 'Sets', 'Sessions'], rows: [...weeks].reverse().map((w) => [fmtDay(w.week), Math.round(toDisplayWeight(w.volume, units)).toLocaleString(), w.sets, w.sessions]) }}
        >
          <BarChart
            ariaLabel="Weekly training volume"
            data={weeks.map((w) => ({ key: w.week, label: fmtShortDay(w.week), value: Math.round(toDisplayWeight(w.volume, units)), tip: `Week of ${fmtDay(w.week)} · ${w.sessions} sessions` }))}
          />
        </ChartCard>

        <ChartCard
          title="Sets per muscle"
          subtitle={range === '7' ? 'Last 7 days · line = 10 sets/week guideline' : 'Weekly average, last 4 weeks · line = 10 sets/week'}
          right={<Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7d' }, { value: '28', label: '4w' }]} />}
          table={{ columns: ['Muscle', 'Sets / week'], rows: muscles.map((m) => [m.label, fmtNum(m.value)]) }}
        >
          {muscles.length ? <HBars rows={muscles} refValue={10} format={(v) => fmtNum(v)} /> : <div className="small faint">No sets logged in this window.</div>}
        </ChartCard>
      </div>

      <ChartCard title="Attendance" subtitle={`Last 12 weeks · ${weeks.reduce((a, w) => a + w.sessions, 0)} PT sessions${groupClasses.length ? ' + group classes' : ''}`}>
        <Heatmap days={attendance} label={(k, v) => `${fmtDay(k)}: ${v ? `${v} session${v > 1 ? 's' : ''}` : 'rest'}`} />
        <div className="row-between xs faint mt-1">
          <span>12 weeks ago</span>
          <span className="row" style={{ gap: 6 }}>
            <i className="key-rect" style={{ background: 'var(--surface-3)' }} /> Rest
            <i className="key-rect" style={{ background: '#2a6dbd', marginLeft: 6 }} /> Trained
          </span>
          <span>This week</span>
        </div>
      </ChartCard>

      {groupClasses.length > 0 && (
        <Section title={`Group classes · ${groupClasses.length}`}>
          <div className="card flush">
            {groupClasses.slice(0, 8).map((g) => (
              <ListItem
                key={g.id}
                title={`${g.programType} · ${classTitle(g, data.lessons)}`}
                subtitle={`${relativeDay(dayKey(new Date(g.start)))} · ${g.durationMin} min · counts toward training load`}
                onClick={() => nav(`/classes/session/${g.id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Session history" action={sessions.length > 12 ? <button className="section-link" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show less' : `All ${sessions.length}`}</button> : undefined}>
        <div className="card flush">
          {[...sessions].reverse().slice(0, showAll ? undefined : 12).map((s) => (
            <ListItem
              key={s.id}
              title={s.name}
              subtitle={`${relativeDay(s.date)} · ${sessionSetCount(s)} sets · ${compact(toDisplayWeight(sessionVolume(s), units))} ${wu}${s.sessionRpe ? ` · RPE ${s.sessionRpe}` : ''}`}
              onClick={() => nav(`/sessions/${s.id}`)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
