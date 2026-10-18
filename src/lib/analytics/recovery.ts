import type { CheckIn, DayKey, ID, MuscleGroup, WorkoutSession } from '../types';
import { addDays, clamp, dayRange, mean, stdev, today } from '../util';
import { completed, isWorking, sessionDurationMin } from './strength';

export type Zone = 'good' | 'warning' | 'serious' | 'critical';

export interface ReadinessBreakdown {
  score: number;
  parts: { key: string; label: string; value: number; weight: number }[];
  hrvDelta?: number;
  rhrDelta?: number;
  adjustment: number;
}

const WEIGHTS = {
  sleepHours: 0.2,
  sleepQuality: 0.15,
  energy: 0.15,
  mood: 0.1,
  stress: 0.15,
  soreness: 0.25,
};

export interface Baseline {
  hrv?: number;
  rhr?: number;
}

/** Rolling baseline from the 7 check-ins before `date` (needs at least 3). */
export function baseline(checkIns: CheckIn[], clientId: ID, date: DayKey): Baseline {
  const from = addDays(date, -7);
  const prior = checkIns.filter((c) => c.clientId === clientId && c.date >= from && c.date < date);
  const hrvs = prior.map((c) => c.hrv).filter((v): v is number => v != null);
  const rhrs = prior.map((c) => c.restingHr).filter((v): v is number => v != null);
  return {
    hrv: hrvs.length >= 3 ? mean(hrvs) : undefined,
    rhr: rhrs.length >= 3 ? mean(rhrs) : undefined,
  };
}

/** Readiness score 0–100 from the subjective wellness questionnaire, nudged by
 *  HRV and resting heart rate relative to the client's own 7-day baseline. */
export function readiness(c: CheckIn, base: Baseline = {}): ReadinessBreakdown {
  const parts = [
    { key: 'sleepHours', label: 'Sleep duration', value: clamp((c.sleepHours - 4) / 4, 0, 1), weight: WEIGHTS.sleepHours },
    { key: 'sleepQuality', label: 'Sleep quality', value: (c.sleepQuality - 1) / 4, weight: WEIGHTS.sleepQuality },
    { key: 'energy', label: 'Energy', value: (c.energy - 1) / 4, weight: WEIGHTS.energy },
    { key: 'mood', label: 'Mood', value: (c.mood - 1) / 4, weight: WEIGHTS.mood },
    { key: 'stress', label: 'Stress (low is good)', value: (5 - c.stress) / 4, weight: WEIGHTS.stress },
    { key: 'soreness', label: 'Soreness (low is good)', value: (5 - c.soreness) / 4, weight: WEIGHTS.soreness },
  ];
  let adjustment = 0;
  let hrvDelta: number | undefined;
  let rhrDelta: number | undefined;
  if (c.hrv != null && base.hrv) {
    hrvDelta = (c.hrv - base.hrv) / base.hrv;
    adjustment += clamp(hrvDelta * 100, -10, 10);
  }
  if (c.restingHr != null && base.rhr) {
    rhrDelta = c.restingHr - base.rhr;
    if (rhrDelta > 8) adjustment -= 10;
    else if (rhrDelta > 5) adjustment -= 5;
    else if (rhrDelta < -3) adjustment += 2;
  }
  const raw = parts.reduce((s, p) => s + p.value * p.weight, 0) * 100;
  return { score: Math.round(clamp(raw + adjustment, 0, 100)), parts, hrvDelta, rhrDelta, adjustment };
}

export function readinessFor(checkIns: CheckIn[], c: CheckIn): number {
  return readiness(c, baseline(checkIns, c.clientId, c.date)).score;
}

export interface ZoneInfo {
  zone: Zone;
  label: string;
  advice: string;
}

export function readinessZone(score: number): ZoneInfo {
  if (score >= 75)
    return { zone: 'good', label: 'Ready to train', advice: 'Green light — go for planned intensity or attempt PRs.' };
  if (score >= 55)
    return { zone: 'warning', label: 'Moderate', advice: 'Train as planned but cap top sets around RPE 8. Extend warm-ups.' };
  if (score >= 40)
    return { zone: 'serious', label: 'Low', advice: 'Reduce load 10–20% or cut a set per exercise. Prioritise technique.' };
  return { zone: 'critical', label: 'Recover', advice: 'Swap for mobility, light cardio or rest. Review sleep, stress and nutrition.' };
}

export function latestCheckIn(checkIns: CheckIn[], clientId: ID): CheckIn | undefined {
  let best: CheckIn | undefined;
  for (const c of checkIns) if (c.clientId === clientId && (!best || c.date > best.date)) best = c;
  return best;
}

// ---------- Training load (session-RPE method, Foster 2001) ----------

/** Session load in arbitrary units: session RPE × duration in minutes. Falls back
 *  to the mean of logged set RPEs, then to a moderate RPE of 6. */
export function sessionLoad(s: WorkoutSession): number {
  const dur = sessionDurationMin(s);
  let rpe = s.sessionRpe;
  if (rpe == null) {
    const setRpes = s.exercises.flatMap((e) => e.sets).filter((x) => isWorking(x) && x.rpe != null).map((x) => x.rpe!);
    rpe = setRpes.length ? mean(setRpes) : 6;
  }
  return Math.round(rpe * dur);
}

export function dailyLoads(sessions: WorkoutSession[], clientId: ID, from: DayKey, to: DayKey): Map<DayKey, number> {
  const map = new Map<DayKey, number>();
  for (const d of dayRange(from, to)) map.set(d, 0);
  for (const s of completed(sessions, clientId)) {
    if (s.date < from || s.date > to) continue;
    map.set(s.date, (map.get(s.date) ?? 0) + sessionLoad(s));
  }
  return map;
}

export interface LoadStatus {
  acute: number;
  chronic: number;
  ratio?: number;
  monotony?: number;
  strain: number;
  zone?: { zone: Zone | 'low'; label: string; advice: string };
}

export function acwrZone(ratio: number): NonNullable<LoadStatus['zone']> {
  if (ratio < 0.8) return { zone: 'low', label: 'Under-loading', advice: 'Load is low versus the last month — room to progress.' };
  if (ratio <= 1.3) return { zone: 'good', label: 'Sweet spot', advice: 'Workload is well matched to recent training.' };
  if (ratio <= 1.5) return { zone: 'warning', label: 'Caution', advice: 'Load is climbing fast. Monitor soreness and readiness.' };
  return { zone: 'critical', label: 'Spike', advice: 'Acute load spike — elevated injury risk. Consider a lighter week.' };
}

/** Acute:chronic workload ratio (7-day acute vs 28-day weekly average),
 *  plus Foster's monotony and strain over the last 7 days. */
export function loadStatus(sessions: WorkoutSession[], clientId: ID, date: DayKey = today()): LoadStatus {
  const loads = dailyLoads(sessions, clientId, addDays(date, -27), date);
  const days = [...loads.entries()];
  const last7 = days.slice(-7).map(([, v]) => v);
  const acute = last7.reduce((a, b) => a + b, 0);
  const chronic = days.reduce((a, [, v]) => a + v, 0) / 4;
  const sd = stdev(last7);
  const monotony = sd > 0 ? mean(last7) / sd : undefined;
  const strain = monotony ? acute * monotony : acute;
  const ratio = chronic > 0 ? acute / chronic : undefined;
  return { acute, chronic, ratio, monotony, strain, zone: ratio != null ? acwrZone(ratio) : undefined };
}

export interface LoadPoint {
  date: DayKey;
  acute: number;
  chronic: number;
  ratio?: number;
}

export function loadSeries(sessions: WorkoutSession[], clientId: ID, days: number, end: DayKey = today()): LoadPoint[] {
  const start = addDays(end, -(days - 1));
  const loads = dailyLoads(sessions, clientId, addDays(start, -27), end);
  const keys = [...loads.keys()];
  const vals = keys.map((k) => loads.get(k)!);
  const out: LoadPoint[] = [];
  for (let i = 27; i < keys.length; i++) {
    const acute = vals.slice(i - 6, i + 1).reduce((a, b) => a + b, 0);
    const chronic = vals.slice(i - 27, i + 1).reduce((a, b) => a + b, 0) / 4;
    out.push({ date: keys[i], acute, chronic, ratio: chronic > 0 ? acute / chronic : undefined });
  }
  return out;
}

/** How often each muscle group was reported sore over the window. */
export function sorenessFrequency(checkIns: CheckIn[], clientId: ID, from: DayKey): [MuscleGroup, number][] {
  const count = new Map<MuscleGroup, number>();
  for (const c of checkIns) {
    if (c.clientId !== clientId || c.date < from) continue;
    for (const m of c.soreAreas) count.set(m, (count.get(m) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]);
}

export function checkInStreak(checkIns: CheckIn[], clientId: ID): number {
  const days = new Set(checkIns.filter((c) => c.clientId === clientId).map((c) => c.date));
  let cursor = today();
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}
