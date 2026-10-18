import type { DayKey, Units } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- Dates (local time, day granularity) ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function today(): DayKey {
  return dayKey();
}

/** Monday of the week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  const d = parseDay(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return dayKey(d);
}

export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDay(key: DayKey, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = parseDay(key);
  let s = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (opts.weekday) s = `${DOW[d.getDay()]}, ${s}`;
  if (opts.year) s += ` ${d.getFullYear()}`;
  return s;
}

export function fmtShortDay(key: DayKey): string {
  const d = parseDay(key);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function dowShort(key: DayKey): string {
  return DOW[parseDay(key).getDay()];
}

export function relativeDay(key: DayKey): string {
  const diff = daysBetween(today(), key);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0 && diff > -7) return `${-diff} days ago`;
  if (diff > 0 && diff < 7) return DOW[parseDay(key).getDay()];
  return fmtDay(key, { year: parseDay(key).getFullYear() !== new Date().getFullYear() });
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

export function age(dob?: DayKey): number | undefined {
  if (!dob) return undefined;
  const b = parseDay(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

/** Combine a day key and "HH:MM" into an ISO timestamp in local time. */
export function toIso(day: DayKey, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = parseDay(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ---------- Units ----------

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function weightUnit(units: Units) {
  return units === 'imperial' ? 'lb' : 'kg';
}
export function lengthUnit(units: Units) {
  return units === 'imperial' ? 'in' : 'cm';
}

/** kg -> display value */
export function toDisplayWeight(kg: number, units: Units): number {
  return units === 'imperial' ? kg / KG_PER_LB : kg;
}
/** display value -> kg */
export function fromDisplayWeight(v: number, units: Units): number {
  return units === 'imperial' ? v * KG_PER_LB : v;
}
export function toDisplayLength(cm: number, units: Units): number {
  return units === 'imperial' ? cm / CM_PER_IN : cm;
}
export function fromDisplayLength(v: number, units: Units): number {
  return units === 'imperial' ? v * CM_PER_IN : v;
}

export function fmtWeight(kg: number | undefined, units: Units, withUnit = true): string {
  if (kg == null || Number.isNaN(kg)) return '–';
  const v = round(toDisplayWeight(kg, units), 1);
  return withUnit ? `${fmtNum(v)} ${weightUnit(units)}` : fmtNum(v);
}

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function fmtNum(n: number, dp = 1): string {
  const r = round(n, dp);
  return Number.isInteger(r) ? r.toLocaleString() : r.toLocaleString(undefined, { maximumFractionDigits: dp });
}

/** 12,900 -> 12.9K */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${round(n / 1_000_000, 1)}M`;
  if (a >= 10_000) return `${round(n / 1000, 0)}K`;
  if (a >= 1000) return `${round(n / 1000, 1)}K`;
  return String(round(n, 0));
}

export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

export function parseNum(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function groupBy<T, K extends string>(xs: T[], key: (x: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}

export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported (iOS Safari) */
  }
}
