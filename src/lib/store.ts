import { create } from 'zustand';
import { loadData, requestPersistence, saveData, storageAvailable } from './db';
import { EXERCISES } from './seed/exercises';
import { FOODS } from './seed/foods';
import { STARTER_TEMPLATES } from './seed/templates';
import { EXAMPLE_LESSONS } from './seed/lessons';
import { lastPerformance } from './analytics/strength';
import type { AppData, ID, Package, Settings, WorkoutExercise, WorkoutSession, WorkoutSet } from './types';
import { dayKey, today, uid } from './util';

export const DATA_VERSION = 1;

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', CA: 'CAD', SG: 'SGD', MY: 'MYR', HK: 'HKD', IN: 'INR', AE: 'AED',
  IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR',
};

/** Best guess at the trainer's currency and units from the device locale. */
function localeDefaults(): Pick<Settings, 'currency' | 'units'> {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region ?? '';
    return { currency: REGION_CURRENCY[region] ?? 'USD', units: region === 'US' ? 'imperial' : 'metric' };
  } catch {
    return { currency: 'USD', units: 'metric' };
  }
}

export const DEFAULT_SETTINGS: Settings = {
  trainerName: '',
  businessName: 'Atlas Coaching',
  units: 'metric',
  currency: 'USD',
  defaultRestSec: 90,
  autoDeductPackage: true,
  onboarded: false,
};

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    clients: [],
    exercises: [...EXERCISES],
    templates: [...STARTER_TEMPLATES],
    sessions: [],
    checkIns: [],
    measurements: [],
    photos: [],
    foods: [...FOODS],
    foodEntries: [],
    water: [],
    goals: [],
    habits: [],
    habitLogs: [],
    appointments: [],
    packages: [],
    notes: [],
    studios: [],
    lessons: [...EXAMPLE_LESSONS],
    groupClasses: [],
    settings: { ...DEFAULT_SETTINGS, ...(typeof navigator !== 'undefined' ? localeDefaults() : {}) },
  };
}

/** Fill in anything missing from older saves and merge new built-in content. */
export function normalize(raw: Partial<AppData>): AppData {
  const base = emptyData();
  const data = { ...base, ...raw, settings: { ...base.settings, ...raw.settings } } as AppData;
  const exIds = new Set(data.exercises.map((e) => e.id));
  for (const e of EXERCISES) if (!exIds.has(e.id)) data.exercises.push(e);
  const foodIds = new Set(data.foods.map((f) => f.id));
  for (const f of FOODS) if (!foodIds.has(f.id)) data.foods.push(f);
  data.version = DATA_VERSION;
  return data;
}

type EntityKey = {
  [K in keyof AppData]: AppData[K] extends Array<infer T> ? (T extends { id: ID } ? K : never) : never;
}[keyof AppData];
type Item<K extends EntityKey> = AppData[K][number];

interface State {
  data: AppData;
  ready: boolean;
  persistent: boolean;
  init: () => Promise<void>;
  replaceAll: (data: AppData) => void;
  upsert: <K extends EntityKey>(key: K, item: Item<K>) => void;
  remove: <K extends EntityKey>(key: K, id: ID) => void;
  patch: <K extends EntityKey>(key: K, id: ID, partial: Partial<Item<K>>) => void;
  updateSettings: (p: Partial<Settings>) => void;
  deleteClient: (id: ID) => void;
  startSession: (clientId: ID, opts?: { templateId?: ID; repeatSessionId?: ID; name?: string }) => ID;
  updateSession: (id: ID, fn: (s: WorkoutSession) => WorkoutSession) => void;
  finishSession: (id: ID, opts: { sessionRpe?: number; notes?: string; deduct: boolean }) => void;
  toggleHabit: (habitId: ID, date: string) => void;
  setWater: (clientId: ID, date: string, ml: number) => void;
}

export const useStore = create<State>((set, get) => ({
  data: emptyData(),
  ready: false,
  persistent: true,

  async init() {
    const [raw, ok] = await Promise.all([loadData(), storageAvailable()]);
    set({ data: raw ? normalize(raw) : emptyData(), ready: true, persistent: ok });
    if (ok) void requestPersistence();
  },

  replaceAll(data) {
    set({ data: normalize(data) });
  },

  upsert(key, item) {
    set(({ data }) => {
      const list = data[key] as Array<{ id: ID }>;
      const i = list.findIndex((x) => x.id === (item as { id: ID }).id);
      const next = i >= 0 ? list.map((x, j) => (j === i ? item : x)) : [...list, item];
      return { data: { ...data, [key]: next } };
    });
  },

  remove(key, id) {
    set(({ data }) => ({ data: { ...data, [key]: (data[key] as Array<{ id: ID }>).filter((x) => x.id !== id) } }));
  },

  patch(key, id, partial) {
    set(({ data }) => ({
      data: { ...data, [key]: (data[key] as Array<{ id: ID }>).map((x) => (x.id === id ? { ...x, ...partial } : x)) },
    }));
  },

  updateSettings(p) {
    set(({ data }) => ({ data: { ...data, settings: { ...data.settings, ...p } } }));
  },

  deleteClient(id) {
    set(({ data }) => {
      const habitIds = new Set(data.habits.filter((h) => h.clientId === id).map((h) => h.id));
      const not = <T extends { clientId: ID }>(xs: T[]) => xs.filter((x) => x.clientId !== id);
      return {
        data: {
          ...data,
          clients: data.clients.filter((c) => c.id !== id),
          sessions: not(data.sessions),
          checkIns: not(data.checkIns),
          measurements: not(data.measurements),
          photos: not(data.photos),
          foodEntries: not(data.foodEntries),
          water: not(data.water),
          goals: not(data.goals),
          habits: not(data.habits),
          habitLogs: data.habitLogs.filter((l) => !habitIds.has(l.habitId)),
          appointments: not(data.appointments),
          packages: not(data.packages),
          notes: not(data.notes),
          groupClasses: data.groupClasses.map((g) => ({
            ...g,
            attendees: g.attendees.map((a) => (a.clientId === id ? { ...a, clientId: undefined } : a)),
          })),
        },
      };
    });
  },

  startSession(clientId, opts = {}) {
    const { data } = get();
    const existing = data.sessions.find((s) => s.clientId === clientId && s.status === 'in_progress');
    if (existing) return existing.id;

    const id = uid();
    const newSet = (): WorkoutSet => ({ id: uid(), type: 'normal', done: false });
    let exercises: WorkoutExercise[] = [];
    let name = opts.name ?? 'Workout';
    const template = opts.templateId ? data.templates.find((t) => t.id === opts.templateId) : undefined;
    if (template) {
      name = template.name;
      exercises = template.exercises.map((te) => ({
        id: uid(),
        exerciseId: te.exerciseId,
        restSec: te.restSec,
        target: te.reps,
        notes: te.notes,
        sets: Array.from({ length: te.sets }, newSet),
      }));
    } else if (opts.repeatSessionId) {
      const src = data.sessions.find((s) => s.id === opts.repeatSessionId);
      if (src) {
        name = src.name;
        exercises = src.exercises.map((e) => ({
          id: uid(),
          exerciseId: e.exerciseId,
          restSec: e.restSec,
          target: e.target,
          sets: e.sets.map(() => newSet()),
        }));
      }
    }
    // Pre-size each exercise to at least as many sets as last time.
    exercises = exercises.map((e) => {
      const prev = lastPerformance(data.sessions, clientId, e.exerciseId);
      if (prev && prev.length > e.sets.length && !template) {
        return { ...e, sets: [...e.sets, ...Array.from({ length: prev.length - e.sets.length }, newSet)] };
      }
      return e;
    });

    const session: WorkoutSession = {
      id,
      clientId,
      date: today(),
      startedAt: new Date().toISOString(),
      name,
      templateId: template?.id,
      exercises,
      status: 'in_progress',
    };
    set(({ data }) => ({ data: { ...data, sessions: [...data.sessions, session] } }));
    return id;
  },

  updateSession(id, fn) {
    set(({ data }) => ({ data: { ...data, sessions: data.sessions.map((s) => (s.id === id ? fn(s) : s)) } }));
  },

  finishSession(id, { sessionRpe, notes, deduct }) {
    set(({ data }) => {
      const s = data.sessions.find((x) => x.id === id);
      if (!s) return {};
      const endedAt = new Date().toISOString();
      const exercises = s.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
        .filter((e) => e.sets.length > 0);
      const durationMin = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(s.startedAt)) / 60000));
      const finished: WorkoutSession = { ...s, exercises, endedAt, durationMin, sessionRpe, notes, status: 'completed' };

      let packages = data.packages;
      if (deduct) {
        const pkg = activePackage(data.packages, s.clientId);
        if (pkg) packages = packages.map((p) => (p.id === pkg.id ? { ...p, usedSessions: p.usedSessions + 1 } : p));
      }
      // Close out today's scheduled appointment for this client, if any.
      const todayKey = dayKey();
      const appointments = data.appointments.map((a) =>
        a.clientId === s.clientId && a.status === 'scheduled' && dayKey(new Date(a.start)) === todayKey && a.type !== 'check_in'
          ? { ...a, status: 'completed' as const, workoutId: id }
          : a,
      );
      return {
        data: { ...data, packages, appointments, sessions: data.sessions.map((x) => (x.id === id ? finished : x)) },
      };
    });
  },

  toggleHabit(habitId, date) {
    set(({ data }) => {
      const has = data.habitLogs.some((l) => l.habitId === habitId && l.date === date);
      return {
        data: {
          ...data,
          habitLogs: has
            ? data.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date))
            : [...data.habitLogs, { habitId, date }],
        },
      };
    });
  },

  setWater(clientId, date, ml) {
    set(({ data }) => {
      const rest = data.water.filter((w) => !(w.clientId === clientId && w.date === date));
      return { data: { ...data, water: ml > 0 ? [...rest, { clientId, date, ml }] : rest } };
    });
  },
}));

export function activePackage(packages: Package[], clientId: ID): Package | undefined {
  const t = today();
  return packages
    .filter((p) => p.clientId === clientId && p.usedSessions < p.totalSessions && (!p.expiresAt || p.expiresAt >= t))
    .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt))[0];
}

export function sessionsRemaining(packages: Package[], clientId: ID): number | undefined {
  const t = today();
  const list = packages.filter((p) => p.clientId === clientId && (!p.expiresAt || p.expiresAt >= t));
  if (!list.length) return undefined;
  return list.reduce((a, p) => a + Math.max(0, p.totalSessions - p.usedSessions), 0);
}

// ---------- Persistence wiring ----------

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: AppData | undefined;

function flush() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (pending) {
    const d = pending;
    pending = undefined;
    void saveData(d);
  }
}

useStore.subscribe((state, prev) => {
  if (!state.ready || state.data === prev.data) return;
  pending = state.data;
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 300);
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

// ---------- Convenience hooks ----------

export const useData = <T,>(sel: (d: AppData) => T): T => useStore((s) => sel(s.data));
export const useSettings = () => useStore((s) => s.data.settings);
export const actions = () => useStore.getState();
