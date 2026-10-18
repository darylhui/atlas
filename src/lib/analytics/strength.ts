import type { DayKey, Exercise, ID, MuscleGroup, WorkoutSession, WorkoutSet } from '../types';
import { addDays, dayKey, parseDay, today, weekStart } from '../util';

/** Estimated one-rep max (Epley). Reps above 12 are capped since the formula
 *  loses accuracy quickly beyond that range. */
export function e1rm(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

/** Percentage of 1RM for a given rep count (inverse Epley). */
export function pctOf1rm(reps: number): number {
  return reps <= 1 ? 1 : 1 / (1 + reps / 30);
}

export function isWorking(s: WorkoutSet): boolean {
  return s.done && s.type !== 'warmup';
}

export function completed(sessions: WorkoutSession[], clientId?: ID): WorkoutSession[] {
  return sessions
    .filter((s) => s.status === 'completed' && (!clientId || s.clientId === clientId))
    .sort((a, b) => (a.date === b.date ? a.startedAt.localeCompare(b.startedAt) : a.date.localeCompare(b.date)));
}

export function setVolume(s: WorkoutSet): number {
  return isWorking(s) ? (s.weight ?? 0) * (s.reps ?? 0) : 0;
}

export function sessionVolume(session: WorkoutSession): number {
  let v = 0;
  for (const ex of session.exercises) for (const s of ex.sets) v += setVolume(s);
  return v;
}

export function sessionSetCount(session: WorkoutSession): number {
  let n = 0;
  for (const ex of session.exercises) for (const s of ex.sets) if (isWorking(s)) n++;
  return n;
}

export function sessionDurationMin(session: WorkoutSession): number {
  if (session.durationMin) return session.durationMin;
  if (!session.endedAt) return 0;
  return Math.max(1, Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000));
}

export interface ExercisePoint {
  sessionId: ID;
  date: DayKey;
  bestE1rm: number;
  topWeight: number;
  topReps: number;
  volume: number;
  sets: WorkoutSet[];
}

/** One data point per completed session that contains the exercise. */
export function exerciseHistory(sessions: WorkoutSession[], exerciseId: ID, clientId?: ID): ExercisePoint[] {
  const out: ExercisePoint[] = [];
  for (const s of completed(sessions, clientId)) {
    const sets = s.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
    const working = sets.filter(isWorking);
    if (!working.length) continue;
    let bestE1rm = 0;
    let topWeight = 0;
    let topReps = 0;
    let volume = 0;
    for (const set of working) {
      const w = set.weight ?? 0;
      const r = set.reps ?? 0;
      bestE1rm = Math.max(bestE1rm, e1rm(w, r));
      if (w > topWeight || (w === topWeight && r > topReps)) {
        topWeight = w;
        topReps = r;
      }
      volume += w * r;
    }
    out.push({ sessionId: s.id, date: s.date, bestE1rm, topWeight, topReps, volume, sets: working });
  }
  return out;
}

/** Sets from the most recent completed session (other than `excludeSessionId`)
 *  that included this exercise — used for "last time" hints while logging. */
export function lastPerformance(
  sessions: WorkoutSession[],
  clientId: ID,
  exerciseId: ID,
  excludeSessionId?: ID,
): WorkoutSet[] | undefined {
  const list = completed(sessions, clientId).filter((s) => s.id !== excludeSessionId);
  for (let i = list.length - 1; i >= 0; i--) {
    const sets = list[i].exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
    const done = sets.filter((s) => s.done);
    if (done.length) return done;
  }
  return undefined;
}

export interface PersonalRecord {
  exerciseId: ID;
  sessionId: ID;
  date: DayKey;
  kind: 'e1rm' | 'weight';
  value: number;
  weight: number;
  reps: number;
  previous: number;
}

export interface Bests {
  e1rm: number;
  weight: number;
}

/** Best e1RM and heaviest working weight per exercise, over the given sessions. */
export function bestsByExercise(sessions: WorkoutSession[]): Map<ID, Bests> {
  const map = new Map<ID, Bests>();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!isWorking(set) || !set.weight || !set.reps) continue;
        const b = map.get(ex.exerciseId) ?? { e1rm: 0, weight: 0 };
        b.e1rm = Math.max(b.e1rm, e1rm(set.weight, set.reps));
        b.weight = Math.max(b.weight, set.weight);
        map.set(ex.exerciseId, b);
      }
    }
  }
  return map;
}

/** PRs set within `session` compared with every earlier completed session of the
 *  same client. The very first time an exercise is performed is not a PR. */
export function sessionPRs(session: WorkoutSession, all: WorkoutSession[]): PersonalRecord[] {
  const prior = completed(all, session.clientId).filter(
    (s) => s.id !== session.id && (s.date < session.date || (s.date === session.date && s.startedAt < session.startedAt)),
  );
  const bests = bestsByExercise(prior);
  const out: PersonalRecord[] = [];
  for (const ex of session.exercises) {
    const prev = bests.get(ex.exerciseId);
    if (!prev) continue;
    let bestSet: WorkoutSet | undefined;
    let bestE = 0;
    let heaviest: WorkoutSet | undefined;
    for (const set of ex.sets) {
      if (!isWorking(set) || !set.weight || !set.reps) continue;
      const e = e1rm(set.weight, set.reps);
      if (e > bestE) {
        bestE = e;
        bestSet = set;
      }
      if (!heaviest || set.weight > (heaviest.weight ?? 0)) heaviest = set;
    }
    if (bestSet && bestE > prev.e1rm + 0.01) {
      out.push({
        exerciseId: ex.exerciseId,
        sessionId: session.id,
        date: session.date,
        kind: 'e1rm',
        value: bestE,
        weight: bestSet.weight!,
        reps: bestSet.reps!,
        previous: prev.e1rm,
      });
    }
    if (heaviest && heaviest.weight! > prev.weight + 0.01) {
      out.push({
        exerciseId: ex.exerciseId,
        sessionId: session.id,
        date: session.date,
        kind: 'weight',
        value: heaviest.weight!,
        weight: heaviest.weight!,
        reps: heaviest.reps!,
        previous: prev.weight,
      });
    }
  }
  return out;
}

/** Whether a single set beats the client's previous bests — for live PR badges. */
export function isSetPR(set: WorkoutSet, bests: Bests | undefined): boolean {
  if (!bests || !isWorking(set) || !set.weight || !set.reps) return false;
  return e1rm(set.weight, set.reps) > bests.e1rm + 0.01 || set.weight > bests.weight + 0.01;
}

/** Chronological list of every PR the client has set. */
export function prTimeline(sessions: WorkoutSession[], clientId: ID): PersonalRecord[] {
  const list = completed(sessions, clientId);
  const out: PersonalRecord[] = [];
  for (const s of list) out.push(...sessionPRs(s, list));
  return out;
}

export interface WeekBucket {
  week: DayKey;
  volume: number;
  sets: number;
  sessions: number;
}

export function weeklyTotals(sessions: WorkoutSession[], weeks: number, clientId?: ID, end: DayKey = today()): WeekBucket[] {
  const lastWeek = weekStart(end);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) buckets.push({ week: addDays(lastWeek, -7 * i), volume: 0, sets: 0, sessions: 0 });
  const index = new Map(buckets.map((b, i) => [b.week, i]));
  for (const s of completed(sessions, clientId)) {
    const i = index.get(weekStart(s.date));
    if (i == null) continue;
    buckets[i].volume += sessionVolume(s);
    buckets[i].sets += sessionSetCount(s);
    buckets[i].sessions += 1;
  }
  return buckets;
}

/** Working sets per muscle group. Primary muscle counts 1, each secondary 0.5. */
export function setsPerMuscle(
  sessions: WorkoutSession[],
  exercises: Map<ID, Exercise>,
  from: DayKey,
  to: DayKey,
  clientId?: ID,
): Partial<Record<MuscleGroup, number>> {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const s of completed(sessions, clientId)) {
    if (s.date < from || s.date > to) continue;
    for (const ex of s.exercises) {
      const def = exercises.get(ex.exerciseId);
      if (!def) continue;
      const n = ex.sets.filter(isWorking).length;
      if (!n) continue;
      out[def.primary] = (out[def.primary] ?? 0) + n;
      for (const m of def.secondary) out[m] = (out[m] ?? 0) + n * 0.5;
    }
  }
  return out;
}

/** Consecutive weeks (ending this week, or last week if none yet this week)
 *  with at least one completed session. */
export function weekStreak(sessions: WorkoutSession[], clientId: ID): number {
  const weeks = new Set(completed(sessions, clientId).map((s) => weekStart(s.date)));
  let cursor = weekStart(today());
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let n = 0;
  while (weeks.has(cursor)) {
    n++;
    cursor = addDays(cursor, -7);
  }
  return n;
}

/** Exercises the client has performed most often, most frequent first. */
export function topExercises(sessions: WorkoutSession[], clientId: ID, exercises: Map<ID, Exercise>, limit = 6): ID[] {
  const count = new Map<ID, number>();
  for (const s of completed(sessions, clientId)) {
    for (const ex of s.exercises) {
      const def = exercises.get(ex.exerciseId);
      if (!def || def.tracking !== 'weight_reps') continue;
      if (!ex.sets.some(isWorking)) continue;
      count.set(ex.exerciseId, (count.get(ex.exerciseId) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}

export function daysSinceLastSession(sessions: WorkoutSession[], clientId: ID): number | undefined {
  const list = completed(sessions, clientId);
  if (!list.length) return undefined;
  const last = parseDay(list[list.length - 1].date);
  return Math.round((parseDay(dayKey()).getTime() - last.getTime()) / 86_400_000);
}

/** Plates needed per side to load `target` on a bar. */
export function platesPerSide(target: number, bar: number, plates: number[]): { plates: number[]; remainder: number } {
  let perSide = (target - bar) / 2;
  const out: number[] = [];
  if (perSide <= 0) return { plates: out, remainder: 0 };
  const sorted = [...plates].sort((a, b) => b - a);
  for (const p of sorted) {
    while (perSide >= p - 1e-9) {
      out.push(p);
      perSide -= p;
    }
  }
  return { plates: out, remainder: Math.round(perSide * 2 * 100) / 100 };
}
