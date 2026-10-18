// Deterministic demo data so the app can be explored immediately. Everything is
// generated relative to today so charts always look current.

import { suggestTargets } from '../analytics/nutrition';
import { e1rm } from '../analytics/strength';
import { emptyData } from '../store';
import type {
  ActivityLevel,
  AppData,
  Appointment,
  CheckIn,
  Client,
  FoodEntry,
  Goal,
  Habit,
  MealSlot,
  Measurement,
  MuscleGroup,
  NutritionGoal,
  Sex,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../types';
import { addDays, age, clamp, dayKey, parseDay, today, toIso, uid } from '../util';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_LOAD: Record<string, number> = {
  'back-squat': 85,
  'bench-press': 67.5,
  'barbell-row': 60,
  'romanian-deadlift': 75,
  deadlift: 115,
  'overhead-press': 42.5,
  'lat-pulldown': 57.5,
  'bulgarian-split-squat': 16,
  'incline-db-press': 24,
  'seated-cable-row': 57.5,
  'seated-db-press': 20,
  'lateral-raise': 9,
  'triceps-pushdown': 27.5,
  'db-curl': 12,
  'leg-press': 150,
  'walking-lunge': 16,
  'lying-leg-curl': 37.5,
  'hip-thrust': 90,
  'standing-calf-raise': 60,
  'goblet-squat': 22,
  'kb-swing': 20,
};

const DB_LIFTS = new Set(['bulgarian-split-squat', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'db-curl', 'walking-lunge', 'goblet-squat', 'kb-swing']);

interface Profile {
  name: string;
  sex: Sex;
  dob: string;
  heightCm: number;
  startKg: number;
  goalKg: number;
  bodyFat: number;
  activity: ActivityLevel;
  nutritionGoal: NutritionGoal;
  strength: number;
  weeks: number;
  /** Day-of-week (0 = Mon) training slots and the templates rotated through. */
  days: number[];
  templates: string[];
  times: string[];
  color: string;
  goalSummary: string;
  injuries?: string;
  medical?: string;
  tags: string[];
  wearable: boolean;
  logsFood: boolean;
  attendance: number;
  stressBias: number;
}

const PROFILES: Profile[] = [
  {
    name: 'Sarah Tan',
    sex: 'female',
    dob: '1994-03-12',
    heightCm: 165,
    startKg: 69.5,
    goalKg: 63,
    bodyFat: 31,
    activity: 'light',
    nutritionGoal: 'lose',
    strength: 0.55,
    weeks: 12,
    days: [0, 2, 4],
    templates: ['tpl-fb-a', 'tpl-fb-b'],
    times: ['07:00', '07:00', '07:00'],
    color: '#e87ba4',
    goalSummary: 'Lose 6 kg before her wedding and feel strong doing it.',
    tags: ['Fat loss', 'In-person'],
    wearable: false,
    logsFood: true,
    attendance: 0.92,
    stressBias: 0,
  },
  {
    name: 'Marcus Lee',
    sex: 'male',
    dob: '1998-08-02',
    heightCm: 178,
    startKg: 76.5,
    goalKg: 82,
    bodyFat: 17,
    activity: 'moderate',
    nutritionGoal: 'gain',
    strength: 1.0,
    weeks: 16,
    days: [0, 1, 3, 4],
    templates: ['tpl-upper', 'tpl-lower'],
    times: ['18:30', '18:30', '18:30', '18:30'],
    color: '#3987e5',
    goalSummary: 'Build muscle — target 82 kg bodyweight and a big bench PR.',
    tags: ['Hypertrophy', 'In-person'],
    wearable: true,
    logsFood: true,
    attendance: 0.9,
    stressBias: 0,
  },
  {
    name: 'Priya Nair',
    sex: 'female',
    dob: '1985-11-23',
    heightCm: 160,
    startKg: 73,
    goalKg: 68,
    bodyFat: 35,
    activity: 'sedentary',
    nutritionGoal: 'lose',
    strength: 0.42,
    weeks: 8,
    days: [1, 3],
    templates: ['tpl-lower', 'tpl-upper'],
    times: ['12:00', '12:00'],
    color: '#199e70',
    goalSummary: 'Get pain-free and confident in the gym; general fitness.',
    injuries: 'Left knee — patellofemoral pain (2024). Avoid deep loaded knee flexion; box squats OK.',
    tags: ['General fitness', 'Rehab'],
    wearable: false,
    logsFood: false,
    attendance: 0.85,
    stressBias: 1.2,
  },
  {
    name: "James O'Connor",
    sex: 'male',
    dob: '1971-05-30',
    heightCm: 182,
    startKg: 97,
    goalKg: 88,
    bodyFat: 29,
    activity: 'light',
    nutritionGoal: 'lose',
    strength: 0.72,
    weeks: 6,
    days: [0, 3],
    templates: ['tpl-fb-a', 'tpl-conditioning'],
    times: ['06:30', '06:30'],
    color: '#c98500',
    goalSummary: 'Lose weight and bring blood pressure down. Wants to keep up with the kids.',
    medical: 'Hypertension — medicated (amlodipine). Avoid breath-holding on heavy lifts.',
    tags: ['Fat loss', 'Health'],
    wearable: true,
    logsFood: false,
    attendance: 0.8,
    stressBias: 0.4,
  },
  {
    name: 'Mei Lin Wong',
    sex: 'female',
    dob: '2002-01-17',
    heightCm: 168,
    startKg: 58,
    goalKg: 58,
    bodyFat: 22,
    activity: 'very',
    nutritionGoal: 'maintain',
    strength: 0.62,
    weeks: 10,
    days: [1, 3, 5],
    templates: ['tpl-fb-a', 'tpl-fb-b', 'tpl-conditioning'],
    times: ['17:30', '17:30', '09:00'],
    color: '#9085e9',
    goalSummary: 'Netball pre-season: power, speed and staying injury-free.',
    tags: ['Athlete', 'Performance'],
    wearable: true,
    logsFood: true,
    attendance: 0.95,
    stressBias: 0.2,
  },
];

function roundLoad(id: string, kg: number) {
  const step = DB_LIFTS.has(id) ? 2 : 2.5;
  return Math.max(step, Math.round(kg / step) * step);
}

function parseRepTarget(reps: string): [number, number] {
  const m = reps.match(/(\d+)(?:-(\d+))?/);
  if (!m) return [8, 10];
  const lo = Number(m[1]);
  return [lo, m[2] ? Number(m[2]) : lo];
}

export function buildDemoData(): AppData {
  const data = emptyData();
  const rand = rng(20261018);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const t0 = today();
  const exById = new Map(data.exercises.map((e) => [e.id, e]));
  const tplById = new Map(data.templates.map((t) => [t.id, t]));

  data.settings = { ...data.settings, trainerName: 'Coach Alex', businessName: 'Atlas Coaching', onboarded: true };

  PROFILES.forEach((p, pi) => {
    const clientId = uid();
    const start = addDays(t0, -p.weeks * 7);
    const targets = suggestTargets({
      weightKg: p.startKg,
      heightCm: p.heightCm,
      age: age(p.dob) ?? 30,
      sex: p.sex,
      activity: p.activity,
      goal: p.nutritionGoal,
    });
    const client: Client = {
      id: clientId,
      name: p.name,
      sex: p.sex,
      dob: p.dob,
      heightCm: p.heightCm,
      color: p.color,
      status: 'active',
      startDate: start,
      activityLevel: p.activity,
      goalSummary: p.goalSummary,
      injuries: p.injuries,
      medical: p.medical,
      tags: p.tags,
      email: `${p.name.split(' ')[0].toLowerCase()}@example.com`,
      phone: `+1 555 01${String(pi).padStart(2, '0')}`,
      parq: { answers: [false, false, false, !!p.medical, false, !!p.injuries, false], completedAt: start },
      nutrition: targets,
      createdAt: parseDay(start).toISOString(),
    };
    data.clients.push(client);

    // ----- Sessions -----
    const sessions: WorkoutSession[] = [];
    let rotation = 0;
    const isAthleteSpike = p.name.startsWith('Mei');
    for (let d = start; d < t0; d = addDays(d, 1)) {
      const dow = (parseDay(d).getDay() + 6) % 7;
      const daysAgo = Math.round((parseDay(t0).getTime() - parseDay(d).getTime()) / 86_400_000);
      const extraSpike = isAthleteSpike && daysAgo <= 7 && (dow === 0 || dow === 2 || dow === 4);
      const slot = p.days.indexOf(dow);
      if (slot < 0 && !extraSpike) continue;
      if (!extraSpike && rand() > p.attendance) continue;
      const tplId = p.templates[rotation % p.templates.length];
      rotation++;
      const tpl = tplById.get(tplId)!;
      const weeksIn = (p.weeks * 7 - daysAgo) / 7;
      const time = p.times[Math.max(0, slot)] ?? '07:00';
      const startedAt = toIso(d, time);
      const exercises: WorkoutExercise[] = tpl.exercises.map((te) => {
        const def = exById.get(te.exerciseId)!;
        const [lo, hi] = parseRepTarget(te.reps);
        const sets: WorkoutSet[] = [];
        for (let i = 0; i < te.sets; i++) {
          const set: WorkoutSet = { id: uid(), type: 'normal', done: true };
          if (def.tracking === 'weight_reps') {
            const base = BASE_LOAD[te.exerciseId] ?? 20;
            const prog = 1 + 0.022 * weeksIn + (rand() - 0.5) * 0.03;
            set.weight = roundLoad(te.exerciseId, base * p.strength * prog);
            set.reps = clamp(Math.round(lo + rand() * (hi - lo + 1) - i * 0.4), Math.max(1, lo - 2), hi + 1);
            set.rpe = Math.round((7 + i * 0.6 + rand()) * 2) / 2;
          } else if (def.tracking === 'time') {
            set.durationSec = Math.round((35 + weeksIn * 2 + rand() * 15) / 5) * 5;
          } else if (def.tracking === 'distance_time') {
            set.distanceM = 250;
            set.durationSec = Math.round(62 - weeksIn * 0.6 + rand() * 4);
          } else {
            set.reps = Math.round(lo + rand() * (hi - lo + 2));
          }
          sets.push(set);
        }
        return { id: uid(), exerciseId: te.exerciseId, restSec: te.restSec, target: te.reps, sets };
      });
      const durationMin = Math.round(48 + rand() * 18);
      const sessionRpe = clamp(Math.round(6 + rand() * 2.5 + (extraSpike ? 1.5 : 0)), 4, 10);
      sessions.push({
        id: uid(),
        clientId,
        date: d,
        startedAt,
        endedAt: new Date(Date.parse(startedAt) + durationMin * 60000).toISOString(),
        durationMin,
        sessionRpe,
        name: tpl.name,
        templateId: tpl.id,
        exercises,
        status: 'completed',
        notes: rand() < 0.15 ? pick(['Great energy today.', 'Form on hinges much improved.', 'Felt tight warming up — extra mobility.', 'Moved quickly, cut rest short.']) : undefined,
      });
    }
    data.sessions.push(...sessions);

    // ----- Appointments (past linked to sessions, plus upcoming 2 weeks) -----
    for (const s of sessions.filter((s) => s.date >= addDays(t0, -28))) {
      data.appointments.push({ id: uid(), clientId, start: s.startedAt, durationMin: 60, type: 'session', status: 'completed', workoutId: s.id, location: 'Studio' });
    }
    for (let i = 0; i < 2; i++) {
      const missed = addDays(t0, -3 - i * 9 - pi);
      if (!sessions.some((s) => s.date === missed) && rand() < 0.5) {
        data.appointments.push({ id: uid(), clientId, start: toIso(missed, p.times[0]), durationMin: 60, type: 'session', status: 'no_show', location: 'Studio' });
      }
    }
    for (let d = t0; d <= addDays(t0, 13); d = addDays(d, 1)) {
      const dow = (parseDay(d).getDay() + 6) % 7;
      const slot = p.days.indexOf(dow);
      if (slot < 0) continue;
      const appt: Appointment = {
        id: uid(),
        clientId,
        start: toIso(d, p.times[slot]),
        durationMin: 60,
        type: 'session',
        status: 'scheduled',
        location: p.name.startsWith('Mei') && dow === 5 ? 'Track' : 'Studio',
      };
      data.appointments.push(appt);
    }
    // Every demo client gets something today so the dashboard is lively.
    if (!data.appointments.some((a) => a.clientId === clientId && dayKey(new Date(a.start)) === t0)) {
      const slotTimes = ['06:30', '08:00', '12:00', '17:30', '19:00'];
      data.appointments.push({
        id: uid(),
        clientId,
        start: toIso(t0, slotTimes[pi]),
        durationMin: pi === 2 ? 30 : 60,
        type: pi === 2 ? 'check_in' : pi === 4 ? 'online' : 'session',
        status: 'scheduled',
        location: pi === 4 ? 'Video call' : 'Studio',
      });
    }

    // ----- Packages (blocks bought back-to-back as sessions are used) -----
    const pkgSizes = [20, 24, 12, 10, 16];
    const prices = [1800, 2040, 1140, 990, 1440];
    const size = pkgSizes[pi];
    const used = sessions.length;
    // James is deliberately down to his last session to show the renewal flag.
    const blocks = pi === 3 ? [Math.min(9, used)] : [];
    if (pi !== 3) {
      let left = used;
      do {
        blocks.push(Math.min(size, left));
        left -= size;
      } while (left > 0);
      if (blocks[blocks.length - 1] === size) blocks.push(0);
    }
    blocks.forEach((usedInBlock, bi) => {
      const firstSession = sessions[bi * size];
      const purchasedAt = firstSession ? addDays(firstSession.date, -1) : addDays(t0, -2);
      const latest = bi === blocks.length - 1;
      data.packages.push({
        id: uid(),
        clientId,
        name: `${pi === 3 ? 10 : size} Session Pack`,
        totalSessions: pi === 3 ? 10 : size,
        usedSessions: usedInBlock,
        price: prices[pi],
        purchasedAt: bi === 0 ? start : purchasedAt,
        paid: !(latest && pi === 1),
      });
    });

    // ----- Check-ins -----
    const ciStart = addDays(t0, -42);
    const sessionDays = new Map(sessions.map((s) => [s.date, s]));
    const baseHrv = p.sex === 'male' ? 58 : 66;
    const baseRhr = p.sex === 'male' ? 60 : 57;
    for (let d = ciStart; d <= t0; d = addDays(d, 1)) {
      if (rand() > (d === t0 ? 0.9 : 0.82)) continue;
      const daysAgo = Math.round((parseDay(t0).getTime() - parseDay(d).getTime()) / 86_400_000);
      const prev = sessionDays.get(addDays(d, -1));
      const stressBump = p.stressBias * (daysAgo < 6 ? 1.6 : 0.6);
      const spike = isAthleteSpike && daysAgo < 6 ? 1 : 0;
      const soreness = clamp(Math.round(1.6 + (prev ? 1.4 : 0) + spike + rand() * 1.2), 1, 5);
      const soreAreas: MuscleGroup[] = [];
      if (prev && soreness >= 3) {
        const muscles = new Set(prev.exercises.map((e) => exById.get(e.exerciseId)!.primary).filter((m) => m !== 'cardio' && m !== 'full_body'));
        soreAreas.push(...[...muscles].slice(0, 2 + Math.floor(rand() * 2)));
      }
      const ci: CheckIn = {
        id: uid(),
        clientId,
        date: d,
        sleepHours: Math.round(clamp(7.2 - stressBump * 0.6 - spike * 0.5 + (rand() - 0.5) * 1.6, 4, 9.5) * 2) / 2,
        sleepQuality: clamp(Math.round(3.7 - stressBump * 0.5 - spike * 0.6 + (rand() - 0.5) * 1.6), 1, 5),
        energy: clamp(Math.round(3.8 - stressBump * 0.5 - spike + (rand() - 0.5) * 1.6), 1, 5),
        mood: clamp(Math.round(3.9 - stressBump * 0.6 + (rand() - 0.5) * 1.4), 1, 5),
        stress: clamp(Math.round(2.1 + stressBump + (rand() - 0.5) * 1.4), 1, 5),
        soreness,
        soreAreas,
      };
      if (p.wearable) {
        ci.hrv = Math.round(baseHrv + (rand() - 0.5) * 10 - spike * 12 - stressBump * 4);
        ci.restingHr = Math.round(baseRhr + (rand() - 0.5) * 4 + spike * 6 + stressBump * 2);
      }
      if (rand() < 0.08) ci.notes = pick(['Slept badly — late work night.', 'Feeling great!', 'Bit of a cold coming on.', 'Long day on feet.']);
      data.checkIns.push(ci);
    }

    // ----- Measurements -----
    const ms: Measurement[] = [];
    for (let w = 0; w <= p.weeks; w++) {
      const d = addDays(start, w * 7);
      if (d > t0) break;
      const frac = w / Math.max(1, p.weeks);
      const delta = p.goalKg - p.startKg;
      const trend = p.startKg + delta * frac * 0.68 + (p.nutritionGoal === 'maintain' ? (rand() - 0.5) * 0.6 : 0);
      const m: Measurement = {
        id: uid(),
        clientId,
        date: d,
        weightKg: Math.round((trend + (rand() - 0.5) * 0.7) * 10) / 10,
      };
      if (w % 4 === 0 || w === p.weeks) {
        m.bodyFatPct = Math.round((p.bodyFat - (p.nutritionGoal === 'lose' ? 3.2 : 1.2) * frac) * 10) / 10;
        m.waistCm = Math.round(((p.sex === 'male' ? 88 : 78) + (p.startKg - 70) * 0.7 - (p.nutritionGoal === 'lose' ? 5 : 0.5) * frac) * 10) / 10;
        m.hipsCm = Math.round(((p.sex === 'male' ? 98 : 102) - (p.nutritionGoal === 'lose' ? 3 : 0) * frac) * 10) / 10;
        m.armCm = Math.round(((p.sex === 'male' ? 34 : 29) + (p.nutritionGoal === 'gain' ? 1.5 : 0.3) * frac) * 10) / 10;
      }
      ms.push(m);
    }
    data.measurements.push(...ms);

    // ----- Nutrition -----
    if (p.logsFood) {
      const foodsByName = new Map(data.foods.map((f) => [f.name, f]));
      const meals: Record<MealSlot, string[][]> = {
        breakfast: [
          ['Oats, dry', 'Whey protein', 'Banana'],
          ['Whole egg', 'Whole egg', 'Wholemeal bread', 'Avocado'],
          ['Greek yoghurt 0%', 'Granola', 'Blueberries'],
          ['Kopi / teh with condensed milk', 'Whole egg', 'Whole egg', 'White bread'],
        ],
        lunch: [
          ['Chicken rice (steamed)'],
          ['Chicken breast, cooked', 'Brown rice, cooked', 'Broccoli'],
          ['Poke bowl, salmon'],
          ['Chicken burrito bowl'],
          ['Wonton noodle soup'],
        ],
        dinner: [
          ['Salmon fillet, cooked', 'Sweet potato, baked', 'Mixed salad leaves', 'Olive oil'],
          ['Lean beef mince 5%, cooked', 'Pasta, cooked', 'Mixed vegetables, stir-fried'],
          ['Firm tofu', 'White rice, cooked', 'Mixed vegetables, stir-fried'],
          ['Chicken thigh, cooked', 'Potato, boiled', 'Broccoli'],
        ],
        snack: [['Protein bar'], ['Apple', 'Almonds'], ['Whey protein', 'Milk, skim'], ['Rice cakes', 'Peanut butter'], ['Cottage cheese', 'Strawberries']],
      };
      for (let d = addDays(t0, -20); d <= t0; d = addDays(d, 1)) {
        if (d !== t0 && rand() < 0.12) continue;
        const slots: MealSlot[] = d === t0 ? ['breakfast', 'lunch'] : ['breakfast', 'lunch', 'snack', 'dinner'];
        if (p.nutritionGoal === 'gain' && d !== t0) slots.push('snack');
        const day: FoodEntry[] = [];
        for (const meal of slots) {
          for (const name of pick(meals[meal])) {
            const f = foodsByName.get(name);
            if (!f) continue;
            day.push({ id: uid(), clientId, date: d, meal, name: f.name, servings: 1, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, foodId: f.id });
          }
        }
        // Scale portions so most days land near the client's target, with realistic misses.
        const planned = day.reduce((a, e) => a + e.calories, 0);
        const aim = targets.calories * (d === t0 ? 0.45 : 0.84 + rand() * 0.28);
        const factor = clamp(aim / Math.max(1, planned), 0.5, 3);
        for (const e of day) e.servings = Math.max(0.5, Math.round(e.servings * factor * 4) / 4);
        data.foodEntries.push(...day);
        const water = d === t0 ? 1250 : Math.round((targets.waterMl * (0.6 + rand() * 0.5)) / 250) * 250;
        data.water.push({ clientId, date: d, ml: water });
      }
    }

    // ----- Goals -----
    const goals: Goal[] = [];
    if (p.goalKg !== p.startKg) {
      goals.push({
        id: uid(),
        clientId,
        kind: 'bodyweight',
        title: p.goalKg < p.startKg ? `Reach ${p.goalKg} kg` : `Bulk to ${p.goalKg} kg`,
        startValue: p.startKg,
        targetValue: p.goalKg,
        unit: 'kg',
        createdAt: start,
        deadline: addDays(start, p.weeks * 7 + 70),
      });
    }
    const liftGoal: Record<string, [string, number]> = {
      'Sarah Tan': ['back-squat', 1.35],
      'Marcus Lee': ['bench-press', 1.45],
      'Priya Nair': ['hip-thrust', 1.3],
      "James O'Connor": ['bench-press', 1.3],
      'Mei Lin Wong': ['deadlift', 1.35],
    };
    const [liftId, stretch] = liftGoal[p.name];
    const firstLift = sessions
      .flatMap((s) => s.exercises.filter((e) => e.exerciseId === liftId).map((e) => Math.max(...e.sets.map((x) => e1rm(x.weight ?? 0, x.reps ?? 0)))))
      .find((v) => v > 0);
    const liftStart = Math.round(firstLift ?? BASE_LOAD[liftId] * p.strength * 1.25);
    const liftTarget = Math.ceil((liftStart * stretch) / 5) * 5;
    goals.push({
      id: uid(),
      clientId,
      kind: 'strength',
      title: `${exById.get(liftId)!.name} ${liftTarget} kg`,
      exerciseId: liftId,
      startValue: liftStart,
      targetValue: liftTarget,
      unit: 'kg',
      createdAt: start,
      deadline: addDays(t0, 60),
    });
    goals.push({ id: uid(), clientId, kind: 'sessions', title: 'Complete 30 sessions', startValue: 0, targetValue: 30, unit: 'sessions', createdAt: start });
    data.goals.push(...goals);

    // ----- Habits -----
    const habitSets: [string, string, number][][] = [
      [['Hit protein target', 'protein', 6], ['8,000+ steps', 'steps', 5], ['In bed by 11pm', 'sleep', 5]],
      [['Hit protein target', 'protein', 7], ['Creatine 5 g', 'supplement', 7], ['3L water', 'water', 6]],
      [['10-min knee rehab', 'rehab', 5], ['Walk at lunch', 'walk', 4], ['No phone in bed', 'no-phone', 5]],
      [['Take BP medication', 'supplement', 7], ['10,000 steps', 'steps', 5], ['No alcohol weeknights', 'avoid', 4]],
      [['Mobility routine', 'mobility', 5], ['8h sleep', 'sleep', 5], ['Pre-training carbs', 'carbs', 3]],
    ];
    for (const [name, icon, perWeek] of habitSets[pi]) {
      const habit: Habit = { id: uid(), clientId, name, icon, perWeek };
      data.habits.push(habit);
      for (let d = addDays(t0, -27); d < t0; d = addDays(d, 1)) {
        if (rand() < (perWeek / 7) * 0.9) data.habitLogs.push({ habitId: habit.id, date: d });
      }
    }

    // ----- Notes -----
    const notes: Record<string, string[]> = {
      'Sarah Tan': ['Wedding is in ~4 months. Prioritise adherence over perfection.', 'Hip hinge pattern clicked today — cue "close the drawer with your hips".'],
      'Marcus Lee': ['Bench stalling at 87.5 — add paused reps and a 2nd press day.', 'Eats well on weekdays, weekends drop to ~2,200 kcal.'],
      'Priya Nair': ['Knee pain 2/10 on split squats — regress to step-ups for now.', 'Work stress very high this month (end of quarter). Keep sessions positive.'],
      "James O'Connor": ['GP cleared for exercise. Monitor BP pre-session for first 4 weeks.', 'Package nearly finished — discuss renewal on Monday.'],
      'Mei Lin Wong': ['Extra netball trials this week on top of training — watch the load.', 'Wants plyometric progressions for vertical jump.'],
    };
    notes[p.name].forEach((text, i) => data.notes.push({ id: uid(), clientId, date: new Date(Date.now() - (i + 1) * 5 * 86_400_000).toISOString(), text, pinned: i === 0 }));
  });

  return data;
}
