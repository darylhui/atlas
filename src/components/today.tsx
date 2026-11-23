import { useId, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BatteryCharging, BedDouble, CalendarClock, Gauge, Heart, Leaf, Moon, Smile, Wallet, Zap, type LucideIcon } from 'lucide-react';
import type { AppData, CheckIn } from '../lib/types';
import { monthStart, revenueBetween } from '../lib/analytics/insights';
import { baseline, latestCheckIn, readiness, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { classPay } from '../lib/classes';
import { addDays, dayKey, dayRange, dowShort, fmtDay, fmtTime, mean, money, today } from '../lib/util';

const hm = (h: number) => {
  const m = Math.round(h * 60);
  return (
    <>
      {Math.floor(m / 60)}
      <small>h</small> {m % 60}
      <small>m</small>
    </>
  );
};

function Widget({ className = '', icon: Icon, title, note, to, label, children }: { className?: string; icon?: LucideIcon; title: string; note?: ReactNode; to: string; label: string; children: ReactNode }) {
  const nav = useNavigate();
  return (
    <button className={`card widget ${className}`} onClick={() => nav(to)} aria-label={label}>
      <span className="widget-head">
        {Icon && (
          <span className="widget-icon">
            <Icon size={18} aria-hidden />
          </span>
        )}
        <span className="widget-title">{title}</span>
        {note && <span className="widget-note">{note}</span>}
      </span>
      {children}
    </button>
  );
}

const Blank = ({ children }: { children: ReactNode }) => <span className="widget-blank">{children}</span>;

/** Catmull-Rom smoothing through the points. */
function smooth(p: [number, number][]): string {
  if (p.length < 2) return '';
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [p[Math.max(0, i - 1)], p[i], p[i + 1], p[Math.min(p.length - 1, i + 2)]];
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
  }
  return d;
}

// ---------- Booked today: which part of the day each kind of work falls in ----------

function BookedCard({ data, t }: { data: AppData; t: string }) {
  const rows = useMemo(() => {
    type Block = { id: string; start: string; durationMin: number };
    const on = (iso: string) => dayKey(new Date(iso)) === t;
    const appts = data.appointments.filter((a) => a.status !== 'cancelled' && on(a.start));
    const out: { label: string; items: Block[] }[] = [
      { label: 'PT', items: appts.filter((a) => a.type === 'session' || a.type === 'assessment') },
      { label: 'Online', items: appts.filter((a) => a.type === 'online' || a.type === 'check_in') },
      { label: 'Classes', items: data.groupClasses.filter((g) => g.status !== 'cancelled' && on(g.start)) },
    ];
    return out;
  }, [data.appointments, data.groupClasses, t]);
  const all = rows.flatMap((r) => r.items);
  const hours = all.reduce((s, x) => s + x.durationMin, 0) / 60;
  const hourOf = (iso: string) => new Date(iso).getHours() + new Date(iso).getMinutes() / 60;
  const lo = Math.min(6, ...all.map((x) => Math.floor(hourOf(x.start))));
  const hi = Math.max(21, ...all.map((x) => Math.ceil(hourOf(x.start) + x.durationMin / 60)));
  const x = (h: number) => 52 + ((h - lo) / (hi - lo)) * 168;
  return (
    <Widget icon={CalendarClock} title="Booked" note="Today" to="/schedule" label={`Booked today: ${all.length} sessions, ${hours.toFixed(1)} hours. Open schedule`}>
      <svg viewBox="0 0 224 78" className="widget-plot" aria-hidden>
        {rows.map((r, i) => (
          <g key={r.label}>
            <text x={46} y={16 + i * 20} textAnchor="end">
              {r.label}
            </text>
            <line x1={52} x2={220} y1={12 + i * 20} y2={12 + i * 20} stroke="var(--grid)" />
            {r.items.map((s) => (
              <rect key={s.id} x={x(hourOf(s.start))} y={5 + i * 20} width={Math.max(5, (s.durationMin / 60 / (hi - lo)) * 168 - 2)} height={14} rx={4} fill="var(--series-1)" stroke="var(--bg)" strokeWidth={1}>
                <title>{`${r.label} · ${fmtTime(s.start)} · ${s.durationMin} min`}</title>
              </rect>
            ))}
          </g>
        ))}
        {[0, 1, 2, 3].map((k) => {
          const h = Math.round(lo + ((hi - lo) * k) / 3);
          return (
            <text key={k} x={x(h)} y={75} textAnchor={k === 0 ? 'start' : k === 3 ? 'end' : 'middle'}>
              {String(h).padStart(2, '0')}
            </text>
          );
        })}
      </svg>
      <span className="widget-value">{hm(hours)}</span>
      <span className="widget-sub">{all.length ? `${all.length} on the calendar` : 'Nothing booked today'}</span>
    </Widget>
  );
}

// ---------- Sleep: last 7 days against the 7 before ----------

function SleepCard({ checkIns, t }: { checkIns: CheckIn[]; t: string }) {
  const series = (from: string) =>
    dayRange(from, addDays(from, 6)).map((d) => {
      const xs = checkIns.filter((c) => c.date === d).map((c) => c.sleepHours);
      return xs.length ? mean(xs) : undefined;
    });
  const from = addDays(t, -6);
  const now = series(from);
  const prev = series(addDays(t, -13));
  const val = (s: (number | undefined)[]) => s.filter((v): v is number => v != null);
  const a = val(now);
  const b = val(prev);
  const delta = a.length && b.length ? Math.round((mean(a) - mean(b)) * 60) : undefined;
  const lo = Math.floor(Math.min(6, ...a, ...b));
  const hi = Math.ceil(Math.max(8, ...a, ...b));
  const y = (v: number) => 60 - ((v - lo) / (hi - lo)) * 52;
  const pts = (s: (number | undefined)[]) => s.flatMap((v, i): [number, number][] => (v == null ? [] : [[24 + i * 32, y(v)]]));
  return (
    <Widget icon={BedDouble} title="Sleep" note="Last 7 days" to="/clients" label={a.length ? `Average client sleep ${mean(a).toFixed(1)} hours over the last 7 days. Open clients` : 'No sleep logged in the last 7 days. Open clients'}>
      <svg viewBox="0 0 224 78" className="widget-plot" aria-hidden>
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={20} x2={220} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={14} y={y(v) + 3} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <path d={smooth(pts(prev))} fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="3 4" strokeLinecap="round" />
        <path d={smooth(pts(now))} fill="none" stroke="var(--amber)" strokeWidth={2} strokeLinecap="round" />
        {now.map((v, i) =>
          v == null ? null : (
            <circle key={i} cx={24 + i * 32} cy={y(v)} r={10} fill="transparent">
              <title>{`${fmtDay(addDays(from, i))} · ${v.toFixed(1)} h`}</title>
            </circle>
          ),
        )}
        {now.map((_, i) => (
          <text key={i} x={24 + i * 32} y={75} textAnchor="middle">
            {dowShort(addDays(from, i))[0]}
          </text>
        ))}
      </svg>
      <span className="widget-value">{a.length ? hm(mean(a)) : '–'}</span>
      <span className="widget-sub">{delta == null ? 'Client average' : `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)}m vs week before (dashed)`}</span>
    </Widget>
  );
}

// ---------- Heart: daily range of resting heart rate across clients ----------

function HeartCard({ checkIns, t }: { checkIns: CheckIn[]; t: string }) {
  const days = dayRange(addDays(t, -6), t).map((d) => ({ d, xs: checkIns.filter((c) => c.date === d && c.restingHr != null).map((c) => c.restingHr!) }));
  const all = days.flatMap((d) => d.xs);
  const lo = Math.min(...all) - 3;
  const hi = Math.max(...all) + 3;
  const y = (v: number) => 58 - ((v - lo) / (hi - lo)) * 54;
  return (
    <Widget icon={Heart} title="Heart" note="Last 7 days" to="/clients" label={all.length ? `Average resting heart rate ${Math.round(mean(all))} beats per minute. Open clients` : 'No resting heart rate logged. Open clients'}>
      <svg viewBox="0 0 224 78" className="widget-plot" aria-hidden>
        {days.map(({ d, xs }, i) => (
          <g key={d}>
            <rect x={8 + i * 31} y={4} width={22} height={56} rx={5} fill="var(--fill-3)" />
            {xs.length > 0 && (
              <rect x={8 + i * 31} y={y(Math.max(...xs))} width={22} height={Math.max(5, y(Math.min(...xs)) - y(Math.max(...xs)))} rx={5} fill="var(--amber)">
                <title>{`${fmtDay(d)} · ${Math.min(...xs)}–${Math.max(...xs)} bpm`}</title>
              </rect>
            )}
            <text x={19 + i * 31} y={75} textAnchor="middle">
              {dowShort(d)[0]}
            </text>
          </g>
        ))}
      </svg>
      <span className="widget-value">
        {all.length ? Math.round(mean(all)) : '–'} <small>bpm</small>
      </span>
      <span className="widget-sub">{all.length ? 'Resting · lowest to highest client' : 'No heart rate logged'}</span>
    </Widget>
  );
}

// ---------- Readiness: every client, with the team average on top ----------

function ReadinessCard({ data, ids, t }: { data: AppData; ids: string[]; t: string }) {
  const { lines, avg, week, prev } = useMemo(() => {
    const days = dayRange(addDays(t, -13), t);
    const byDay = new Map<string, number[]>();
    const lines = ids.map((id) =>
      days.map((d) => {
        const ci = data.checkIns.find((c) => c.clientId === id && c.date === d);
        if (!ci) return undefined;
        const s = readinessFor(data.checkIns, ci);
        byDay.set(d, [...(byDay.get(d) ?? []), s]);
        return s;
      }),
    );
    const of = (ds: string[]) => ds.flatMap((d) => byDay.get(d) ?? []);
    return { lines, avg: days.map((d) => (byDay.has(d) ? mean(byDay.get(d)!) : undefined)), week: of(days.slice(7)), prev: of(days.slice(0, 7)) };
  }, [data.checkIns, ids, t]);
  const score = week.length ? Math.round(mean(week)) : undefined;
  const diff = score != null && prev.length ? score - Math.round(mean(prev)) : undefined;
  const path = (s: (number | undefined)[]) => smooth(s.flatMap((v, i): [number, number][] => (v == null ? [] : [[4 + i * 24, 70 - (v / 100) * 66]])));
  const checked = ids.filter((id) => (latestCheckIn(data.checkIns, id)?.date ?? '') >= addDays(t, -1)).length;
  return (
    <Widget className="wide" icon={Activity} title="Readiness" note="Last 7 days" to="/clients" label={score != null ? `Team readiness ${score} of 100, ${readinessZone(score).label}. Open clients` : 'No check-ins this week. Open clients'}>
      <span className="widget-center">
        <b className="widget-score">{score ?? '–'}</b>
        <span className="bold">{score != null ? readinessZone(score).label : 'No check-ins this week'}</span>
        {diff != null && <span className="small muted">{diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : 'No change'} vs week before</span>}
      </span>
      <svg viewBox="0 0 320 74" className="widget-plot tall" preserveAspectRatio="none" aria-hidden>
        {lines.map((l, i) => (
          <path key={i} d={path(l)} fill="none" stroke="var(--text-3)" strokeOpacity={0.55} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={path(avg)} fill="none" stroke="var(--series-1)" strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="widget-foot">
        <span>
          <i className="key-line" style={{ background: 'var(--series-1)' }} /> Team average
        </span>
        <span>
          <i className="key-line" style={{ background: 'var(--text-3)' }} /> Each client
        </span>
        <span>
          {checked} of {ids.length} checked in
        </span>
      </span>
    </Widget>
  );
}

// ---------- Income: one bar per day ----------

function IncomeCard({ data, t }: { data: AppData; t: string }) {
  const from = addDays(t, -29);
  const days = useMemo(() => dayRange(from, t).map((d) => ({ d, v: revenueBetween(data, d, d) + classPay(data.groupClasses, data.studios, d, d) })), [data, from, t]);
  const pt = revenueBetween(data, monthStart(t), t);
  const cls = classPay(data.groupClasses, data.studios, monthStart(t), t);
  const max = Math.max(1, ...days.map((d) => d.v));
  const cur = data.settings.currency;
  return (
    <Widget className="wide" icon={Wallet} title="Income" note="30 days" to="/business" label={`Income this month ${money(pt + cls, cur)}. Open business`}>
      <span className="widget-center">
        <b className="widget-score">{money(pt + cls, cur)}</b>
        <span className="bold">This month</span>
      </span>
      <svg viewBox="0 0 320 74" className="widget-plot tall" preserveAspectRatio="none" aria-hidden>
        {days.map(({ d, v }, i) => (
          <g key={d}>
            <rect x={4 + i * 10.5} y={70 - Math.max(3, (v / max) * 66)} width={4} height={Math.max(3, (v / max) * 66)} rx={2} fill={v > 0 ? 'var(--series-1)' : 'var(--fill-1)'} />
            <rect x={1 + i * 10.5} y={0} width={10} height={74} fill="transparent">
              <title>{`${fmtDay(d)} · ${money(v, cur)}`}</title>
            </rect>
          </g>
        ))}
      </svg>
      <span className="widget-foot">
        <span>PT {money(pt, cur)}</span>
        <span>Classes {money(cls, cur)}</span>
      </span>
    </Widget>
  );
}

// ---------- Gauge: tap a measure to see the team's level ----------

const PART_ICON: Record<string, { icon: LucideIcon; short: string }> = {
  sleepHours: { icon: Moon, short: 'Sleep' },
  sleepQuality: { icon: BedDouble, short: 'Sleep quality' },
  energy: { icon: Zap, short: 'Energy' },
  mood: { icon: Smile, short: 'Mood' },
  stress: { icon: Leaf, short: 'Calm' },
  soreness: { icon: BatteryCharging, short: 'Freshness' },
};

function GaugeCard({ data, ids, t }: { data: AppData; ids: string[]; t: string }) {
  const [sel, setSel] = useState('all');
  const name = useId();
  const metrics = useMemo(() => {
    const fresh = ids.flatMap((id) => {
      const c = latestCheckIn(data.checkIns, id);
      return c && c.date >= addDays(t, -1) ? [readiness(c, baseline(data.checkIns, id, c.date))] : [];
    });
    if (!fresh.length) return [];
    return [
      { key: 'all', icon: Gauge, short: 'Readiness', value: mean(fresh.map((f) => f.score)) },
      ...fresh[0].parts.map((p) => ({ key: p.key, ...PART_ICON[p.key], value: mean(fresh.map((f) => f.parts.find((x) => x.key === p.key)!.value)) * 100 })),
    ];
  }, [data.checkIns, ids, t]);
  const m = metrics.find((x) => x.key === sel) ?? metrics[0];
  const N = 56;
  return (
    <section className="card gauge" aria-label="Team state">
      {m ? (
        <>
          <div className="gauge-picks" role="group" aria-label="Measure" id={name}>
            {metrics.map((x) => (
              <button key={x.key} aria-pressed={x.key === m.key} aria-label={x.short} title={x.short} onClick={() => setSel(x.key)}>
                <x.icon size={17} aria-hidden />
              </button>
            ))}
          </div>
          <div className="gauge-dial">
            <svg viewBox="0 0 240 132" role="img" aria-label={`${m.short} ${Math.round(m.value)} percent`}>
              {Array.from({ length: N + 1 }, (_, i) => (
                <rect key={i} x={2} y={118} width={16} height={3.4} rx={1.5} transform={`rotate(${(i / N) * 180} 120 120)`} fill={(i / N) * 100 <= m.value ? 'var(--text)' : 'var(--fill-1)'} />
              ))}
              <path d="M0 -5 L5 5 L-5 5 Z" fill="var(--accent)" transform={`rotate(${(m.value / 100) * 180 - 90} 120 120) translate(120 32)`} />
            </svg>
            <div className="gauge-read" aria-live="polite">
              <span className="small muted">{m.short}</span>
              <b>{Math.round(m.value)}%</b>
            </div>
          </div>
          <div className="gauge-cap">
            <div className="bold">{readinessZone(m.value).label}</div>
            <div className="small muted">Average of the latest check-ins, higher is better</div>
          </div>
        </>
      ) : (
        <Blank>No check-ins since yesterday. Log one to see how your clients are doing.</Blank>
      )}
    </section>
  );
}

export function TodayWidgets({ data }: { data: AppData }) {
  const t = today();
  const ids = useMemo(() => data.clients.filter((c) => c.status === 'active').map((c) => c.id), [data.clients]);
  const checkIns = useMemo(() => data.checkIns.filter((c) => ids.includes(c.clientId)), [data.checkIns, ids]);
  return (
    <div className="widgets">
      <BookedCard data={data} t={t} />
      <SleepCard checkIns={checkIns} t={t} />
      <HeartCard checkIns={checkIns} t={t} />
      <ReadinessCard data={data} ids={ids} t={t} />
      <IncomeCard data={data} t={t} />
      <GaugeCard data={data} ids={ids} t={t} />
    </div>
  );
}
