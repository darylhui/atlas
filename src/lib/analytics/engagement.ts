import type { AppData, DayKey, Goal, Habit, ID } from '../types';
import { addDays, clamp, daysBetween, today, weekStart } from '../util';
import { completed, exerciseHistory, prTimeline, sessionVolume, weekStreak } from './strength';

export interface GoalProgress {
  current: number;
  pct: number;
  achieved: boolean;
}

export function goalProgress(goal: Goal, data: Pick<AppData, 'sessions' | 'measurements'>): GoalProgress {
  let current = goal.startValue;
  switch (goal.kind) {
    case 'strength': {
      if (goal.exerciseId) {
        const hist = exerciseHistory(data.sessions, goal.exerciseId, goal.clientId);
        const best = Math.max(0, ...hist.map((h) => h.bestE1rm));
        if (best) current = best;
      }
      break;
    }
    case 'bodyweight':
    case 'bodyfat': {
      const key = goal.kind === 'bodyweight' ? 'weightKg' : 'bodyFatPct';
      const ms = data.measurements
        .filter((m) => m.clientId === goal.clientId && m[key] != null)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (ms.length) current = ms[ms.length - 1][key]!;
      break;
    }
    case 'sessions':
      current = completed(data.sessions, goal.clientId).filter((s) => s.date >= goal.createdAt).length;
      break;
    case 'custom':
      current = goal.currentValue ?? goal.startValue;
      break;
  }
  const span = goal.targetValue - goal.startValue;
  const pct = span === 0 ? 1 : clamp((current - goal.startValue) / span, 0, 1);
  return { current, pct, achieved: pct >= 1 };
}

export interface Achievement {
  id: string;
  /** Key into NAMED_ICONS. */
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  progressLabel?: string;
}

function longestDailyStreak(days: Set<DayKey>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue;
    let n = 1;
    let k = addDays(d, 1);
    while (days.has(k)) {
      n++;
      k = addDays(k, 1);
    }
    best = Math.max(best, n);
  }
  return best;
}

function longestWeekStreak(weeks: Set<DayKey>): number {
  let best = 0;
  for (const w of weeks) {
    if (weeks.has(addDays(w, -7))) continue;
    let n = 1;
    let k = addDays(w, 7);
    while (weeks.has(k)) {
      n++;
      k = addDays(k, 7);
    }
    best = Math.max(best, n);
  }
  return best;
}

export function achievements(clientId: ID, data: AppData): Achievement[] {
  const sessions = completed(data.sessions, clientId);
  const n = sessions.length;
  const prs = prTimeline(data.sessions, clientId).length;
  const tonnage = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const weekRun = longestWeekStreak(new Set(sessions.map((s) => weekStart(s.date))));
  const checkRun = longestDailyStreak(new Set(data.checkIns.filter((c) => c.clientId === clientId).map((c) => c.date)));
  const foodRun = longestDailyStreak(new Set(data.foodEntries.filter((e) => e.clientId === clientId).map((e) => e.date)));
  const goalsHit = data.goals.filter((g) => g.clientId === clientId && (g.achievedAt || goalProgress(g, data).achieved)).length;
  const photos = data.photos.filter((p) => p.clientId === clientId).length;

  const tier = (id: string, icon: string, title: string, description: string, value: number, target: number, unit = ''): Achievement => ({
    id,
    icon,
    title,
    description,
    earned: value >= target,
    progress: clamp(value / target, 0, 1),
    progressLabel: `${Math.min(Math.round(value), target).toLocaleString()}${unit} / ${target.toLocaleString()}${unit}`,
  });

  return [
    tier('s1', 'rocket', 'First Rep', 'Complete your first session', n, 1),
    tier('s10', 'strong', 'Committed', 'Complete 10 sessions', n, 10),
    tier('s25', 'flame', 'Dedicated', 'Complete 25 sessions', n, 25),
    tier('s50', 'medal', 'Half Century', 'Complete 50 sessions', n, 50),
    tier('s100', 'crown', 'Centurion', 'Complete 100 sessions', n, 100),
    tier('w4', 'calendar-check', 'Consistency', 'Train 4 weeks in a row', weekRun, 4, ' wk'),
    tier('w12', 'calendar-range', 'Habit Formed', 'Train 12 weeks in a row', weekRun, 12, ' wk'),
    tier('pr1', 'trophy', 'Record Breaker', 'Set your first personal record', prs, 1),
    tier('pr10', 'bolt', 'PR Machine', 'Set 10 personal records', prs, 10),
    tier('pr25', 'dumbbell', 'Unstoppable', 'Set 25 personal records', prs, 25),
    tier('t10', 'dumbbell', '10 Tonne Club', 'Lift 10,000 kg total volume', tonnage, 10_000, ' kg'),
    tier('t100', 'mountain', '100 Tonne Club', 'Lift 100,000 kg total volume', tonnage, 100_000, ' kg'),
    tier('c7', 'mobility', 'Self-Aware', 'Check in 7 days in a row', checkRun, 7, ' d'),
    tier('n7', 'greens', 'Fuel Tracker', 'Log nutrition 7 days in a row', foodRun, 7, ' d'),
    tier('g1', 'target', 'Goal Getter', 'Achieve a goal', goalsHit, 1),
    tier('p1', 'camera', 'Day One', 'Take your first progress photo', photos, 1),
  ];
}

export function habitWeek(habit: Habit, logs: AppData['habitLogs'], ref: DayKey = today()) {
  const start = weekStart(ref);
  const days = logs.filter((l) => l.habitId === habit.id && l.date >= start && daysBetween(start, l.date) < 7).length;
  return { done: days, target: habit.perWeek, pct: clamp(days / habit.perWeek, 0, 1) };
}

export function habitStreak(habitId: ID, logs: AppData['habitLogs']): number {
  const days = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
  let cursor = today();
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export { weekStreak };
