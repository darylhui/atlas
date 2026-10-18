import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useStore } from '../../lib/store';
import { classLoadsFor } from '../../lib/classes';
import type { Client } from '../../lib/types';
import { MUSCLE_LABEL } from '../../lib/seed/exercises';
import { baseline, latestCheckIn, loadSeries, loadStatus, readiness, readinessFor, readinessZone, sorenessFrequency } from '../../lib/analytics/recovery';
import { addDays, fmtDay, fmtNum, mean, relativeDay, today } from '../../lib/util';
import { ChartCard, HBars, Legend, LineChart } from '../../components/charts';
import { Button, Card, Empty, ListItem, Ring, Section, Stat, ZonePill } from '../../components/ui';

export default function RecoveryTab({ client }: { client: Client }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const t = today();
  const from30 = addDays(t, -29);
  const checkIns = useMemo(
    () => data.checkIns.filter((c) => c.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date)),
    [data.checkIns, client.id],
  );
  const recent = checkIns.filter((c) => c.date >= from30);
  const latest = latestCheckIn(data.checkIns, client.id);
  const breakdown = latest ? readiness(latest, baseline(data.checkIns, client.id, latest.date)) : undefined;
  const zone = breakdown ? readinessZone(breakdown.score) : undefined;
  const classLoads = useMemo(() => classLoadsFor(data.groupClasses, client.id), [data.groupClasses, client.id]);
  const load = useMemo(() => loadStatus(data.sessions, client.id, today(), classLoads), [data.sessions, client.id, classLoads]);
  const series = useMemo(() => loadSeries(data.sessions, client.id, 42, today(), classLoads), [data.sessions, client.id, classLoads]);
  const recentClasses = classLoads.filter((c) => c.date >= addDays(t, -27)).length;
  const sore = useMemo(() => sorenessFrequency(data.checkIns, client.id, from30), [data.checkIns, client.id, from30]);
  const readinessPts = recent.map((c) => ({ x: c.date, y: readinessFor(data.checkIns, c) }));
  const hrv = recent.filter((c) => c.hrv != null).map((c) => ({ x: c.date, y: c.hrv! }));
  const rhr = recent.filter((c) => c.restingHr != null).map((c) => ({ x: c.date, y: c.restingHr! }));
  const sleep7 = checkIns.filter((c) => c.date >= addDays(t, -6));

  if (!checkIns.length && !load.acute && !load.chronic)
    return (
      <Empty icon={<Activity />} title="No recovery data yet" action={<Button variant="primary" onClick={() => nav(`/clients/${client.id}/check-in`)}>Do first check-in</Button>}>
        Daily check-ins take 30 seconds and power the readiness score. Session RPE from workouts powers the workload metrics.
      </Empty>
    );

  return (
    <div className="stack-lg">
      <div className="cols">
        <Card>
          <div className="row-between">
            <div className="card-title">Readiness</div>
            {latest && <span className="small faint">{relativeDay(latest.date)}</span>}
          </div>
          {breakdown && zone ? (
            <div className="row mt-2" style={{ gap: 16, alignItems: 'flex-start' }}>
              <Ring pct={breakdown.score / 100} size={110} color={`var(--${zone.zone})`}>
                <b>{breakdown.score}</b>
                <small>/ 100</small>
              </Ring>
              <div className="grow stack" style={{ gap: 7 }}>
                <ZonePill zone={zone.zone}>{zone.label}</ZonePill>
                {breakdown.parts.map((p) => (
                  <div key={p.key}>
                    <div className="row-between xs">
                      <span className="muted">{p.label}</span>
                      <span className="tabular faint">{Math.round(p.value * 100)}%</span>
                    </div>
                    <div className="bar-track" style={{ height: 5, marginTop: 3 }}>
                      <div className="bar-fill" style={{ width: `${p.value * 100}%`, background: 'var(--series-1)' }} />
                    </div>
                  </div>
                ))}
                {breakdown.adjustment !== 0 && (
                  <div className="xs faint">
                    {breakdown.adjustment > 0 ? '+' : ''}
                    {Math.round(breakdown.adjustment)} pts from HRV / resting HR vs 7-day baseline
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="small faint mt-2">No check-ins yet.</div>
          )}
          {zone && <p className="small muted mt-2">{zone.advice}</p>}
          <Button block className="mt-2" onClick={() => nav(`/clients/${client.id}/check-in`)}>
            <Activity size={18} /> New check-in
          </Button>
        </Card>

        <Card>
          <div className="row-between">
            <div className="card-title">Training load</div>
            {load.zone && <ZonePill zone={load.zone.zone}>{load.zone.label}</ZonePill>}
          </div>
          <div className="row mt-2" style={{ alignItems: 'baseline', gap: 8 }}>
            <span className="hero-num">{load.ratio != null ? load.ratio.toFixed(2) : '–'}</span>
            <span className="muted">acute : chronic</span>
          </div>
          <p className="small muted mt-1">{load.zone?.advice ?? 'Log a few weeks of sessions with session RPE to calculate the workload ratio.'}</p>
          <div className="grid-3 mt-2">
            <div>
              <div className="xs faint">Acute (7d)</div>
              <div className="bold tabular">{Math.round(load.acute).toLocaleString()}</div>
            </div>
            <div>
              <div className="xs faint">Chronic (28d/wk)</div>
              <div className="bold tabular">{Math.round(load.chronic).toLocaleString()}</div>
            </div>
            <div>
              <div className="xs faint">Monotony</div>
              <div className="bold tabular">{load.monotony != null ? load.monotony.toFixed(1) : '–'}</div>
            </div>
          </div>
          <div className="xs faint mt-2">
            Load = session RPE × minutes (AU)
            {recentClasses ? `, including ${recentClasses} group class${recentClasses > 1 ? 'es' : ''} in the last 4 weeks` : ''}. Sweet spot 0.8–1.3; above 1.5 is a spike. Monotony above 2 means too little variation.
          </div>
        </Card>
      </div>

      <ChartCard
        title="Readiness trend"
        subtitle="Last 30 days · line at 75 = ready to train hard"
        table={{ columns: ['Date', 'Score', 'Sleep', 'Stress', 'Soreness'], rows: [...recent].reverse().map((c) => [fmtDay(c.date), readinessFor(data.checkIns, c), `${c.sleepHours}h`, c.stress, c.soreness]) }}
      >
        {readinessPts.length ? (
          <LineChart ariaLabel="Readiness score over 30 days" series={[{ name: 'Readiness', color: 'var(--series-1)', points: readinessPts }]} refLine={{ y: 75, label: 'Ready' }} yFormat={(v) => String(Math.round(v))} />
        ) : (
          <div className="small faint">No check-ins in the last 30 days.</div>
        )}
      </ChartCard>

      <ChartCard
        title="Acute vs chronic load"
        subtitle="Last 6 weeks, weekly load in AU"
        legend={<Legend items={[{ name: 'Acute (7-day)', color: 'var(--series-2)' }, { name: 'Chronic (28-day avg)', color: 'var(--series-1)' }]} />}
        table={{ columns: ['Date', 'Acute', 'Chronic', 'Ratio'], rows: [...series].reverse().filter((_, i) => i % 3 === 0).map((p) => [fmtDay(p.date), Math.round(p.acute), Math.round(p.chronic), p.ratio != null ? p.ratio.toFixed(2) : '–']) }}
      >
        <LineChart
          ariaLabel="Acute and chronic training load"
          zeroBased
          series={[
            { name: 'Chronic', color: 'var(--series-1)', points: series.map((p) => ({ x: p.date, y: Math.round(p.chronic) })) },
            { name: 'Acute', color: 'var(--series-2)', points: series.map((p) => ({ x: p.date, y: Math.round(p.acute) })) },
          ]}
        />
      </ChartCard>

      <div className="grid-4">
        <Stat label="Sleep (7d avg)" value={sleep7.length ? fmtNum(mean(sleep7.map((c) => c.sleepHours))) : '–'} unit="h" />
        <Stat label="Sleep quality" value={sleep7.length ? fmtNum(mean(sleep7.map((c) => c.sleepQuality))) : '–'} unit="/ 5" />
        <Stat label="Stress (7d avg)" value={sleep7.length ? fmtNum(mean(sleep7.map((c) => c.stress))) : '–'} unit="/ 5" />
        <Stat label="Check-ins (30d)" value={recent.length} unit="/ 30" />
      </div>

      <div className="cols">
        <ChartCard title="Sleep duration" subtitle="Hours per night · line at 8h">
          {recent.length ? (
            <LineChart ariaLabel="Sleep hours" series={[{ name: 'Sleep', color: 'var(--series-1)', points: recent.map((c) => ({ x: c.date, y: c.sleepHours })) }]} refLine={{ y: 8, label: '8h' }} yFormat={(v) => `${fmtNum(v)}`} tipFormat={(v) => `${fmtNum(v)} h`} height={160} />
          ) : (
            <div className="small faint">No data.</div>
          )}
        </ChartCard>

        <ChartCard title="Soreness hotspots" subtitle="Times reported sore, last 30 days">
          {sore.length ? <HBars rows={sore.slice(0, 8).map(([m, n]) => ({ label: MUSCLE_LABEL[m], value: n }))} /> : <div className="small faint">No soreness reported.</div>}
        </ChartCard>

        {hrv.length > 2 && (
          <ChartCard title="Heart-rate variability" subtitle="Morning HRV (ms) · higher is generally better">
            <LineChart ariaLabel="HRV trend" series={[{ name: 'HRV', color: 'var(--series-3)', points: hrv }]} yFormat={(v) => String(Math.round(v))} tipFormat={(v) => `${v} ms`} height={160} />
          </ChartCard>
        )}
        {rhr.length > 2 && (
          <ChartCard title="Resting heart rate" subtitle="Morning RHR (bpm) · rising trend can signal fatigue">
            <LineChart ariaLabel="Resting heart rate trend" series={[{ name: 'RHR', color: 'var(--series-2)', points: rhr }]} yFormat={(v) => String(Math.round(v))} tipFormat={(v) => `${v} bpm`} height={160} />
          </ChartCard>
        )}
      </div>

      <Section title="Check-in log">
        <div className="card flush">
          {[...checkIns]
            .reverse()
            .slice(0, 14)
            .map((c) => {
              const s = readinessFor(data.checkIns, c);
              return (
                <ListItem
                  key={c.id}
                  title={relativeDay(c.date)}
                  subtitle={`Sleep ${c.sleepHours}h · Stress ${c.stress}/5 · Soreness ${c.soreness}/5${c.soreAreas.length ? ` (${c.soreAreas.map((m) => MUSCLE_LABEL[m]).join(', ')})` : ''}${c.notes ? ` · “${c.notes}”` : ''}`}
                  right={<ZonePill zone={readinessZone(s).zone}>{s}</ZonePill>}
                  onClick={() => nav(`/clients/${client.id}/check-in?id=${c.id}`)}
                />
              );
            })}
        </div>
      </Section>
    </div>
  );
}
