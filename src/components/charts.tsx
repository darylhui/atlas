import { useMemo, useState, type ReactNode } from 'react';
import type { DayKey } from '../lib/types';
import { compact, fmtDay, fmtShortDay, parseDay } from '../lib/util';
import { useElementWidth } from './ui';

// Lightweight SVG charts tuned for touch: thin marks, recessive hairline grid,
// a crosshair you can scrub with a finger, and a table view for every chart.

export interface Point {
  x: DayKey;
  y: number;
}

export interface Series {
  name: string;
  color: string;
  points: Point[];
  area?: boolean;
}

function niceStep(range: number, count: number) {
  const raw = range / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1;
  return step * mag;
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

const t = (k: DayKey) => parseDay(k).getTime();

export function LineChart({
  series,
  height = 190,
  yFormat = (v) => compact(v),
  tipFormat,
  refLine,
  zeroBased = false,
  ariaLabel,
}: {
  series: Series[];
  height?: number;
  yFormat?: (v: number) => string;
  tipFormat?: (v: number) => string;
  refLine?: { y: number; label: string };
  zeroBased?: boolean;
  ariaLabel: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const fmtTip = tipFormat ?? yFormat;

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (!all.length || width === 0) return null;
    const xs = all.map((p) => t(p.x));
    let ys = all.map((p) => p.y);
    if (refLine) ys = [...ys, refLine.y];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (zeroBased) minY = Math.min(0, minY);
    const ticks = niceTicks(minY, maxY, 4);
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const m = { l: 36, r: series.length === 1 ? 40 : 14, t: 10, b: 24 };
    const iw = Math.max(10, width - m.l - m.r);
    const ih = height - m.t - m.b;
    const sx = (x: number) => m.l + (maxX === minX ? iw / 2 : ((x - minX) / (maxX - minX)) * iw);
    const sy = (y: number) => m.t + ih - ((y - y0) / (y1 - y0 || 1)) * ih;
    const uniq = [...new Set(xs)].sort((a, b) => a - b);
    const nX = Math.min(uniq.length, width < 380 ? 3 : 5);
    const xTicks = nX <= 1 ? uniq : Array.from({ length: nX }, (_, i) => uniq[Math.round((i * (uniq.length - 1)) / (nX - 1))]);
    return { sx, sy, ticks, m, iw, ih, uniq, xTicks, minX, maxX };
  }, [series, width, height, refLine, zeroBased]);

  const onMove = (e: React.PointerEvent) => {
    if (!geo) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = geo.uniq[0];
    let bd = Infinity;
    for (const x of geo.uniq) {
      const d = Math.abs(geo.sx(x) - px);
      if (d < bd) {
        bd = d;
        best = x;
      }
    }
    setHoverX(best);
  };

  const nearest = (s: Series, x: number) => {
    let best: Point | undefined;
    let bd = Infinity;
    for (const p of s.points) {
      const d = Math.abs(t(p.x) - x);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };

  return (
    <div
      ref={ref}
      className="chart"
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onMove}
      onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons ? onMove(e) : undefined)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHoverX(null)}
    >
      {geo && (
        <svg width={width} height={height}>
          {geo.ticks.map((v) => (
            <g key={v}>
              <line x1={geo.m.l} x2={geo.m.l + geo.iw} y1={geo.sy(v)} y2={geo.sy(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={geo.m.l - 8} y={geo.sy(v) + 4} textAnchor="end">
                {yFormat(v)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((x, i) => (
            <text key={x} x={geo.sx(x)} y={height - 6} textAnchor={i === 0 ? 'start' : i === geo.xTicks.length - 1 ? 'end' : 'middle'}>
              {fmtShortDay(keyFromTs(x))}
            </text>
          ))}
          {refLine && (
            <g>
              <line x1={geo.m.l} x2={geo.m.l + geo.iw} y1={geo.sy(refLine.y)} y2={geo.sy(refLine.y)} stroke="var(--text-3)" strokeWidth={1} />
              <text x={geo.m.l + geo.iw} y={geo.sy(refLine.y) - 5} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
                {refLine.label}
              </text>
            </g>
          )}
          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.x.localeCompare(b.x));
            if (!pts.length) return null;
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${geo.sx(t(p.x)).toFixed(1)},${geo.sy(p.y).toFixed(1)}`).join('');
            const base = geo.sy(geo.ticks[0]);
            const last = pts[pts.length - 1];
            return (
              <g key={s.name}>
                {s.area && (
                  <path
                    d={`${d}L${geo.sx(t(last.x)).toFixed(1)},${base}L${geo.sx(t(pts[0].x)).toFixed(1)},${base}Z`}
                    fill={s.color}
                    opacity={0.1}
                  />
                )}
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.length === 1 && <circle cx={geo.sx(t(last.x))} cy={geo.sy(last.y)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />}
                {series.length === 1 && (
                  <>
                    <circle cx={geo.sx(t(last.x))} cy={geo.sy(last.y)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                    <text x={geo.sx(t(last.x)) + 8} y={geo.sy(last.y) + 4} style={{ fill: 'var(--text)', fontWeight: 700 }}>
                      {yFormat(last.y)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {hoverX != null && (
            <g>
              <line x1={geo.sx(hoverX)} x2={geo.sx(hoverX)} y1={geo.m.t} y2={geo.m.t + geo.ih} stroke="var(--text-3)" strokeWidth={1} />
              {series.map((s) => {
                const p = nearest(s, hoverX);
                return p ? <circle key={s.name} cx={geo.sx(t(p.x))} cy={geo.sy(p.y)} r={4.5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
      )}
      {geo && hoverX != null && (
        <div
          className="chart-tip"
          style={
            geo.sx(hoverX) > width / 2
              ? { right: width - geo.sx(hoverX) + 10 }
              : { left: geo.sx(hoverX) + 10 }
          }
        >
          <div className="tip-date">{fmtDay(keyFromTs(hoverX), { weekday: true })}</div>
          {series.map((s) => {
            const p = nearest(s, hoverX);
            return p ? (
              <div className="tip-row" key={s.name}>
                <span className="key-line" style={{ background: s.color }} />
                <b>{fmtTip(p.y)}</b>
                {series.length > 1 && <span>{s.name}</span>}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function keyFromTs(ts: number): DayKey {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Bar {
  key: string;
  label: string;
  value: number;
  tip?: string;
}

export function BarChart({
  data,
  height = 170,
  color = 'var(--series-1)',
  yFormat = (v) => compact(v),
  refLine,
  ariaLabel,
  highlightLast = true,
}: {
  data: Bar[];
  height?: number;
  color?: string;
  yFormat?: (v: number) => string;
  refLine?: { y: number; label: string };
  ariaLabel: string;
  highlightLast?: boolean;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { l: 36, r: 6, t: 18, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value), refLine?.y ?? 0);
  const ticks = niceTicks(0, max, 3);
  const top = ticks[ticks.length - 1];
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const band = iw / Math.max(1, data.length);
  const bw = Math.min(24, Math.max(4, band - 2));
  const sy = (v: number) => m.t + ih - (v / top) * ih;
  const labelEvery = Math.ceil(data.length / (width < 380 ? 6 : 10));

  return (
    <div ref={ref} className="chart" style={{ height }} role="img" aria-label={ariaLabel} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
              <text x={m.l - 8} y={sy(v) + 4} textAnchor="end">
                {yFormat(v)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = m.l + band * i + band / 2;
            const h = Math.max(0, sy(0) - sy(d.value));
            const x = cx - bw / 2;
            const y = sy(d.value);
            const r = Math.min(4, h, bw / 2);
            const path = h > 0 ? `M${x},${sy(0)}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${sy(0)}Z` : '';
            const isLast = highlightLast && i === data.length - 1;
            return (
              <g key={d.key}>
                <rect
                  x={m.l + band * i}
                  y={m.t}
                  width={band}
                  height={ih}
                  fill="transparent"
                  onPointerDown={() => setActive(i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                />
                {path && <path d={path} fill={color} opacity={active == null || active === i ? 1 : 0.55} pointerEvents="none" />}
                {(i % labelEvery === 0 && data.length - 1 - i >= Math.max(1, labelEvery * 0.7)) || i === data.length - 1 ? (
                  <text x={cx} y={height - 6} textAnchor="middle" style={isLast ? { fill: 'var(--text-2)', fontWeight: 600 } : undefined}>
                    {d.label}
                  </text>
                ) : null}
                {isLast && d.value > 0 && active == null && (
                  <text x={cx} y={y - 5} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 700 }}>
                    {yFormat(d.value)}
                  </text>
                )}
              </g>
            );
          })}
          {refLine && (
            <g pointerEvents="none">
              <line x1={m.l} x2={m.l + iw} y1={sy(refLine.y)} y2={sy(refLine.y)} stroke="var(--text-2)" strokeWidth={1} />
              <text x={m.l + iw} y={sy(refLine.y) - 5} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
                {refLine.label}
              </text>
            </g>
          )}
        </svg>
      )}
      {active != null && data[active] && (
        <div
          className="chart-tip"
          style={m.l + band * active + band / 2 > width / 2 ? { right: width - (m.l + band * active) + 4 } : { left: m.l + band * (active + 1) + 4 }}
        >
          <div className="tip-date">{data[active].tip ?? data[active].label}</div>
          <div className="tip-row">
            <span className="key-rect" style={{ background: color }} />
            <b>{yFormat(data[active].value)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = 'var(--series-1)', width = 80, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sx = (i: number) => 2 + (i / (values.length - 1)) * (width - 6);
  const sy = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
  const lx = sx(values.length - 1);
  const ly = sy(values[values.length - 1]);
  return (
    <svg width={width} height={height} aria-hidden style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}

export function HBars({ rows, refValue, refLabel, format = (v) => String(Math.round(v)) }: { rows: { label: string; value: number }[]; refValue?: number; refLabel?: string; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value), refValue ?? 0);
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span className="truncate muted">{r.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
            {refValue != null && <div className="hbar-ref" style={{ left: `${(refValue / max) * 100}%` }} />}
          </div>
          <span className="tabular bold" style={{ textAlign: 'right' }}>
            {format(r.value)}
          </span>
        </div>
      ))}
      {refValue != null && refLabel && <div className="xs faint mt-1">│ {refLabel}</div>}
    </div>
  );
}

export function Legend({ items, kind = 'line' }: { items: { name: string; color: string }[]; kind?: 'line' | 'rect' }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.name}>
          <i className={kind === 'line' ? 'key-line' : 'key-rect'} style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  );
}

/** Card wrapper that pairs a chart with an equivalent data table. */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  children: ReactNode;
  right?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="card">
      <div className="chart-card-head">
        <div className="grow">
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-sub">{subtitle}</div>}
        </div>
        {right}
        {table && (
          <button className="table-toggle" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {legend && !showTable && <div style={{ marginBottom: 10 }}>{legend}</div>}
      {showTable && table ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** GitHub-style calendar of the last N weeks. */
export function Heatmap({ days, weeks = 12, label }: { days: Map<DayKey, number>; weeks?: number; label: (k: DayKey, v: number) => string }) {
  const cells = useMemo(() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - dow - (weeks - 1) * 7);
    const out: { k: DayKey; v: number; future: boolean }[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = keyFromTs(d.getTime());
      out.push({ k, v: days.get(k) ?? 0, future: d > today });
    }
    return out;
  }, [days, weeks]);
  return (
    <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
      {cells.map((c) => (
        <div
          key={c.k}
          title={label(c.k, c.v)}
          aria-label={label(c.k, c.v)}
          style={{ background: c.future ? 'transparent' : c.v > 1 ? 'var(--series-1)' : c.v > 0 ? '#2a6dbd' : undefined }}
        />
      ))}
    </div>
  );
}
