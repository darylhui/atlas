import type { ActivityLevel, DayKey, FoodEntry, ID, NutritionGoal, NutritionTargets, Sex, WaterLog } from '../types';
import { addDays, dayRange, mean, today } from '../util';

export const ACTIVITY: Record<ActivityLevel, { factor: number; label: string; hint: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentary', hint: 'Desk job, little exercise' },
  light: { factor: 1.375, label: 'Light', hint: 'Training 1–3 days/week' },
  moderate: { factor: 1.55, label: 'Moderate', hint: 'Training 3–5 days/week' },
  very: { factor: 1.725, label: 'Very active', hint: 'Training 6–7 days/week' },
  athlete: { factor: 1.9, label: 'Athlete', hint: 'Twice daily or physical job' },
};

export const GOALS: Record<NutritionGoal, { label: string; calorieFactor: number; proteinPerKg: number }> = {
  lose: { label: 'Fat loss', calorieFactor: 0.8, proteinPerKg: 2.2 },
  maintain: { label: 'Maintain', calorieFactor: 1, proteinPerKg: 1.8 },
  gain: { label: 'Muscle gain', calorieFactor: 1.1, proteinPerKg: 2.0 },
};

/** Basal metabolic rate, Mifflin–St Jeor equation. */
export function bmr(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'male' ? 5 : -161);
}

export function tdee(weightKg: number, heightCm: number, ageYears: number, sex: Sex, activity: ActivityLevel): number {
  return bmr(weightKg, heightCm, ageYears, sex) * ACTIVITY[activity].factor;
}

export function suggestTargets(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: NutritionGoal;
}): NutritionTargets {
  const g = GOALS[input.goal];
  const calories = Math.round((tdee(input.weightKg, input.heightCm, input.age, input.sex, input.activity) * g.calorieFactor) / 10) * 10;
  const protein = Math.round(input.weightKg * g.proteinPerKg);
  // Fat: at least 0.8 g/kg, or 25% of calories — whichever is higher.
  const fat = Math.round(Math.max(input.weightKg * 0.8, (calories * 0.25) / 9));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const waterMl = Math.round((input.weightKg * 35) / 250) * 250;
  return { calories, protein, carbs, fat, waterMl, goal: input.goal };
}

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function totals(entries: FoodEntry[]): Totals {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    t.calories += e.calories * e.servings;
    t.protein += e.protein * e.servings;
    t.carbs += e.carbs * e.servings;
    t.fat += e.fat * e.servings;
  }
  return t;
}

export function dayEntries(entries: FoodEntry[], clientId: ID, date: DayKey): FoodEntry[] {
  return entries.filter((e) => e.clientId === clientId && e.date === date);
}

export function waterFor(water: WaterLog[], clientId: ID, date: DayKey): number {
  return water.find((w) => w.clientId === clientId && w.date === date)?.ml ?? 0;
}

export interface DayNutrition extends Totals {
  date: DayKey;
  logged: boolean;
  water: number;
}

export function dailySeries(entries: FoodEntry[], water: WaterLog[], clientId: ID, days: number, end: DayKey = today()): DayNutrition[] {
  const from = addDays(end, -(days - 1));
  const byDay = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) {
    if (e.clientId !== clientId || e.date < from || e.date > end) continue;
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }
  return dayRange(from, end).map((d) => {
    const list = byDay.get(d) ?? [];
    return { date: d, logged: list.length > 0, water: waterFor(water, clientId, d), ...totals(list) };
  });
}

export interface Adherence {
  daysLogged: number;
  days: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  /** Share of logged days within ±10% of the calorie target. */
  calorieHit: number;
  /** Share of logged days reaching at least 90% of the protein target. */
  proteinHit: number;
  score: number;
}

export function adherence(series: DayNutrition[], targets?: NutritionTargets): Adherence {
  const logged = series.filter((d) => d.logged);
  const n = logged.length;
  const calorieHit = targets && n ? logged.filter((d) => Math.abs(d.calories - targets.calories) <= targets.calories * 0.1).length / n : 0;
  const proteinHit = targets && n ? logged.filter((d) => d.protein >= targets.protein * 0.9).length / n : 0;
  const consistency = series.length ? n / series.length : 0;
  return {
    daysLogged: n,
    days: series.length,
    avgCalories: mean(logged.map((d) => d.calories)),
    avgProtein: mean(logged.map((d) => d.protein)),
    avgCarbs: mean(logged.map((d) => d.carbs)),
    avgFat: mean(logged.map((d) => d.fat)),
    calorieHit,
    proteinHit,
    score: Math.round((consistency * 0.3 + calorieHit * 0.35 + proteinHit * 0.35) * 100),
  };
}

export function macroCalories(t: Totals) {
  return { protein: t.protein * 4, carbs: t.carbs * 4, fat: t.fat * 9 };
}
