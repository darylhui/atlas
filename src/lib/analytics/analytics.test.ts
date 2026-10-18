import { describe, expect, it } from 'vitest';
import type { CheckIn, ClassSegment, Goal, WorkoutSession } from '../types';
import { buildTimeline, classLoadsFor, lessonSeconds, newSegment, segmentIntervals, segmentSeconds } from '../classes';
import { EXAMPLE_LESSONS } from '../seed/lessons';
import { addDays, today } from '../util';
import { buildDemoData } from '../seed/demo';
import { achievements, goalProgress } from './engagement';
import { adherence, bmr, dailySeries, suggestTargets } from './nutrition';
import { acwrZone, baseline, loadStatus, readiness, readinessZone, sessionLoad } from './recovery';
import { e1rm, exerciseHistory, platesPerSide, sessionPRs, sessionVolume, weekStreak, weeklyTotals } from './strength';

function session(id: string, date: string, sets: [number, number][], extra: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id,
    clientId: 'c1',
    date,
    startedAt: `${date}T08:00:00.000Z`,
    name: 'Test',
    status: 'completed',
    durationMin: 60,
    sessionRpe: 7,
    exercises: [
      {
        id: `${id}-e`,
        exerciseId: 'back-squat',
        sets: sets.map(([weight, reps], i) => ({ id: `${id}-${i}`, type: 'normal', weight, reps, done: true })),
      },
    ],
    ...extra,
  };
}

describe('strength', () => {
  it('estimates 1RM with Epley and caps high reps', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
    expect(e1rm(100, 20)).toBeCloseTo(e1rm(100, 12));
    expect(e1rm(0, 5)).toBe(0);
  });

  it('computes volume from working sets only', () => {
    const s = session('a', '2026-01-01', [[100, 5], [100, 5]]);
    s.exercises[0].sets.push({ id: 'w', type: 'warmup', weight: 60, reps: 5, done: true });
    s.exercises[0].sets.push({ id: 'u', type: 'normal', weight: 100, reps: 5, done: false });
    expect(sessionVolume(s)).toBe(1000);
  });

  it('detects PRs against earlier sessions only', () => {
    const a = session('a', '2026-01-01', [[100, 5]]);
    const b = session('b', '2026-01-03', [[102.5, 5]]);
    const c = session('c', '2026-01-05', [[95, 5]]);
    const all = [a, b, c];
    expect(sessionPRs(a, all)).toHaveLength(0);
    const prs = sessionPRs(b, all);
    expect(prs.map((p) => p.kind).sort()).toEqual(['e1rm', 'weight']);
    expect(sessionPRs(c, all)).toHaveLength(0);
  });

  it('builds per-exercise history', () => {
    const hist = exerciseHistory([session('a', '2026-01-01', [[100, 5], [90, 8]])], 'back-squat');
    expect(hist).toHaveLength(1);
    expect(hist[0].topWeight).toBe(100);
    expect(hist[0].volume).toBe(1220);
  });

  it('counts week streaks', () => {
    const t = today();
    const s = [session('a', t, [[50, 5]]), session('b', addDays(t, -7), [[50, 5]]), session('c', addDays(t, -21), [[50, 5]])];
    expect(weekStreak(s, 'c1')).toBe(2);
  });

  it('buckets weekly totals', () => {
    const t = today();
    const weeks = weeklyTotals([session('a', t, [[50, 10]])], 4, 'c1');
    expect(weeks).toHaveLength(4);
    expect(weeks[3].volume).toBe(500);
  });

  it('calculates plates per side', () => {
    expect(platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({ plates: [25, 15], remainder: 0 });
    expect(platesPerSide(20, 20, [25])).toEqual({ plates: [], remainder: 0 });
  });
});

describe('recovery', () => {
  const ci = (over: Partial<CheckIn>): CheckIn => ({
    id: 'x',
    clientId: 'c1',
    date: '2026-01-10',
    sleepHours: 8,
    sleepQuality: 5,
    energy: 5,
    mood: 5,
    stress: 1,
    soreness: 1,
    soreAreas: [],
    ...over,
  });

  it('scores a perfect check-in as 100 and a terrible one as 0', () => {
    expect(readiness(ci({})).score).toBe(100);
    expect(readiness(ci({ sleepHours: 3, sleepQuality: 1, energy: 1, mood: 1, stress: 5, soreness: 5 })).score).toBe(0);
  });

  it('penalises suppressed HRV and elevated resting HR', () => {
    const plain = readiness(ci({ energy: 3 })).score;
    const adjusted = readiness(ci({ energy: 3, hrv: 40, restingHr: 70 }), { hrv: 60, rhr: 60 }).score;
    expect(adjusted).toBeLessThan(plain - 15);
  });

  it('requires 3 prior readings for a baseline', () => {
    const list = [ci({ id: '1', date: '2026-01-08', hrv: 60 }), ci({ id: '2', date: '2026-01-09', hrv: 62 })];
    expect(baseline(list, 'c1', '2026-01-10').hrv).toBeUndefined();
    list.push(ci({ id: '3', date: '2026-01-07', hrv: 64 }));
    expect(baseline(list, 'c1', '2026-01-10').hrv).toBe(62);
  });

  it('maps zones', () => {
    expect(readinessZone(80).zone).toBe('good');
    expect(readinessZone(60).zone).toBe('warning');
    expect(readinessZone(45).zone).toBe('serious');
    expect(readinessZone(20).zone).toBe('critical');
    expect(acwrZone(0.5).zone).toBe('low');
    expect(acwrZone(1.1).zone).toBe('good');
    expect(acwrZone(1.4).zone).toBe('warning');
    expect(acwrZone(1.8).zone).toBe('critical');
  });

  it('computes sRPE load and ACWR', () => {
    const t = today();
    expect(sessionLoad(session('a', t, [[50, 5]]))).toBe(420);
    // Four weeks of identical weekly load -> ratio 1.
    const steady = [0, 7, 14, 21].map((d, i) => session(`s${i}`, addDays(t, -d), [[50, 5]]));
    expect(loadStatus(steady, 'c1').ratio).toBeCloseTo(1);
    // All load in the last week -> ratio 4.
    const spike = [0, 1, 2, 3].map((d, i) => session(`k${i}`, addDays(t, -d), [[50, 5]]));
    expect(loadStatus(spike, 'c1').ratio).toBeCloseTo(4);
  });
});

describe('nutrition', () => {
  it('uses Mifflin-St Jeor', () => {
    expect(bmr(80, 180, 30, 'male')).toBe(1780);
    expect(bmr(60, 165, 30, 'female')).toBeCloseTo(1320.25);
  });

  it('suggests macro targets that add up to the calorie target', () => {
    const t = suggestTargets({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate', goal: 'maintain' });
    expect(t.protein).toBe(144);
    const kcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(kcal - t.calories)).toBeLessThan(15);
  });

  it('scores adherence', () => {
    const t = today();
    const entries = [0, 1, 2].map((d) => ({
      id: String(d),
      clientId: 'c1',
      date: addDays(t, -d),
      meal: 'lunch' as const,
      name: 'x',
      servings: 1,
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 60,
    }));
    const series = dailySeries(entries, [], 'c1', 7);
    const a = adherence(series, { calories: 2000, protein: 150, carbs: 200, fat: 60, waterMl: 2500, goal: 'maintain' });
    expect(a.daysLogged).toBe(3);
    expect(a.calorieHit).toBe(1);
    expect(a.proteinHit).toBe(1);
  });
});

describe('engagement', () => {
  it('tracks bodyweight goal progress in both directions', () => {
    const g: Goal = { id: 'g', clientId: 'c1', kind: 'bodyweight', title: '', startValue: 80, targetValue: 70, unit: 'kg', createdAt: '2026-01-01' };
    const p = goalProgress(g, { sessions: [], measurements: [{ id: 'm', clientId: 'c1', date: '2026-02-01', weightKg: 75 }] });
    expect(p.pct).toBeCloseTo(0.5);
  });

  it('generates coherent demo data and achievements', () => {
    const data = buildDemoData();
    expect(data.clients).toHaveLength(5);
    expect(data.sessions.length).toBeGreaterThan(80);
    const list = achievements(data.clients[1].id, data);
    expect(list.find((a) => a.id === 's10')?.earned).toBe(true);
  });

  it('keeps demo packages and lift goals internally consistent', () => {
    const data = buildDemoData();
    for (const p of data.packages) expect(p.usedSessions).toBeLessThanOrEqual(p.totalSessions);
    for (const g of data.goals.filter((g) => g.kind === 'strength')) {
      const p = goalProgress(g, data);
      expect(p.pct).toBeGreaterThan(0);
      expect(p.pct).toBeLessThan(1);
    }
  });
});

describe('group classes', () => {
  const move = (name: string) => ({ id: name, name });
  const base = (over: Partial<ClassSegment>): ClassSegment => ({ ...newSegment('stations'), ...over });

  it('expands station rotations with sets, rests and station changes', () => {
    const s = base({ format: 'stations', workSec: 40, restSec: 20, sets: 2, transitionSec: 30, rounds: 1, moves: [move('A'), move('B'), move('C')] });
    const t = segmentIntervals(s, 0);
    // Per station: work, rest, work. Station changes between stations only.
    expect(t.map((x) => x.phase).join(',')).toBe('work,rest,work,change,work,rest,work,change,work,rest,work');
    expect(segmentSeconds(s)).toBe(3 * (40 + 20 + 40) + 2 * 30);
    expect(t[0].rounds).toBe(3);
  });

  it('cycles moves through EMOM minutes and partner rounds', () => {
    const emom = segmentIntervals(base({ format: 'emom', workSec: 60, rounds: 5, moves: [move('A'), move('B')] }), 0);
    expect(emom.map((x) => x.move)).toEqual([0, 1, 0, 1, 0]);
    const ygig = segmentIntervals(base({ format: 'partner', workSec: 30, rounds: 2, moves: [move('Row')] }), 0);
    expect(ygig.map((x) => x.label)).toEqual(['Partner A', 'Partner B', 'Partner A', 'Partner B']);
  });

  it('adds breaks between blocks but not after the last', () => {
    const lesson = { segments: [base({ format: 'coach', durationSec: 300, breakSec: 60 }), base({ format: 'amrap', durationSec: 600, breakSec: 60 })] };
    const t = buildTimeline(lesson);
    expect(t.map((x) => x.phase)).toEqual(['coach', 'break', 'work']);
    expect(lessonSeconds(lesson)).toBe(960);
  });

  it('ships example lessons that each run about 50 minutes', () => {
    for (const l of EXAMPLE_LESSONS) {
      const min = lessonSeconds(l) / 60;
      expect(min, l.title).toBeGreaterThan(45);
      expect(min, l.title).toBeLessThan(55);
    }
  });

  it('counts attended classes toward a linked client’s training load', () => {
    const data = buildDemoData();
    const mei = data.clients.find((c) => c.name === 'Mei Lin Wong')!;
    const extra = classLoadsFor(data.groupClasses, mei.id);
    expect(extra.length).toBeGreaterThan(0);
    const withClasses = loadStatus(data.sessions, mei.id, today(), extra);
    const without = loadStatus(data.sessions, mei.id);
    expect(withClasses.acute).toBeGreaterThan(without.acute);
  });
});
