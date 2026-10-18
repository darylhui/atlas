// Group-class programming: program types, block formats, and the timeline
// engine that turns a lesson into the sequence of intervals the class timer runs.

import type { ClassLesson, ClassSegment, DayKey, GroupClass, ID, SegmentFormat, Studio } from './types';
import { dayKey, fmtDuration, uid } from './util';

export type ProgramCategory = 'resistance' | 'conditioning' | 'hybrid' | 'recovery' | 'other';

export const CATEGORY_META: Record<ProgramCategory, { label: string; color: string }> = {
  resistance: { label: 'Resistance', color: 'var(--series-1)' },
  conditioning: { label: 'Conditioning', color: 'var(--series-2)' },
  hybrid: { label: 'Hybrid', color: 'var(--series-3)' },
  recovery: { label: 'Mobility', color: 'var(--series-4)' },
  other: { label: 'Other', color: 'var(--text-3)' },
};

/** Suggested program names, matching the class types BFT studios run.
 *  They are only labels; coaches can type any program name. */
export const PROGRAM_TYPES: { name: string; category: ProgramCategory; blurb: string }[] = [
  { name: 'Strength', category: 'resistance', blurb: 'Heavier loads, longer rests' },
  { name: 'Hyper', category: 'resistance', blurb: 'Hypertrophy with an emphasis on form' },
  { name: 'Pump', category: 'resistance', blurb: 'High-volume isolation work' },
  { name: 'H.I.R.T', category: 'resistance', blurb: 'High-intensity resistance: EMOM, AMRAP, YGIG' },
  { name: 'Power', category: 'resistance', blurb: 'Explosive, fast-paced movement' },
  { name: 'Strength Endurance', category: 'hybrid', blurb: 'Lifting paired with conditioning' },
  { name: 'XTX', category: 'hybrid', blurb: 'Cardio, metabolic complexes and resistance' },
  { name: 'Cardio HIIT', category: 'conditioning', blurb: 'Short, high-intensity bursts' },
  { name: 'Cardio Summit', category: 'conditioning', blurb: 'Aerobic capacity and sustainable pacing' },
  { name: 'Cardio U', category: 'conditioning', blurb: 'Extended work at varying intensities' },
  { name: 'CrewFit', category: 'conditioning', blurb: 'Team-based conditioning' },
  { name: 'Balanced', category: 'recovery', blurb: 'Mobility and stability' },
];

export function programCategory(name: string): ProgramCategory {
  return PROGRAM_TYPES.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())?.category ?? 'other';
}

export function programColor(name: string): string {
  return CATEGORY_META[programCategory(name)].color;
}

interface FormatMeta {
  label: string;
  hint: string;
  fields: ('work' | 'rest' | 'rounds' | 'sets' | 'transition' | 'duration')[];
  roundsLabel?: string;
  restLabel?: string;
  transitionLabel?: string;
}

export const FORMATS: Record<SegmentFormat, FormatMeta> = {
  coach: { label: 'Coach-led', hint: 'Warm-up, demo or cool-down on one clock', fields: ['duration'] },
  stations: {
    label: 'Stations',
    hint: 'Members rotate through stations together',
    fields: ['work', 'rest', 'sets', 'transition', 'rounds'],
    roundsLabel: 'Laps',
    restLabel: 'Rest between sets',
    transitionLabel: 'Station change',
  },
  circuit: {
    label: 'Circuit',
    hint: 'Everyone does each move in order',
    fields: ['work', 'rest', 'rounds', 'transition'],
    roundsLabel: 'Rounds',
    restLabel: 'Rest between moves',
    transitionLabel: 'Rest between rounds',
  },
  intervals: { label: 'Intervals', hint: 'Work / rest repeats, moves cycle', fields: ['work', 'rest', 'rounds'], roundsLabel: 'Rounds', restLabel: 'Rest' },
  emom: { label: 'EMOM', hint: 'Every minute on the minute, moves cycle', fields: ['work', 'rounds'], roundsLabel: 'Minutes' },
  amrap: { label: 'AMRAP', hint: 'As many rounds as possible in the time', fields: ['duration'] },
  tabata: { label: 'Tabata', hint: '20 s on / 10 s off', fields: ['work', 'rest', 'rounds'], roundsLabel: 'Rounds', restLabel: 'Rest' },
  for_time: { label: 'For time', hint: 'Count-up with a time cap', fields: ['duration'] },
  partner: { label: 'Partner (YGIG)', hint: 'You go, I go: partners alternate', fields: ['work', 'rounds'], roundsLabel: 'Rounds each' },
};

export function newSegment(format: SegmentFormat, name?: string): ClassSegment {
  const base: ClassSegment = {
    id: uid(),
    name: name ?? FORMATS[format].label,
    format,
    workSec: 40,
    restSec: 20,
    rounds: 3,
    sets: 1,
    transitionSec: 0,
    durationSec: 300,
    breakSec: 60,
    moves: [],
  };
  switch (format) {
    case 'coach':
      return { ...base, durationSec: 360, breakSec: 0 };
    case 'stations':
      return { ...base, workSec: 45, restSec: 15, sets: 2, transitionSec: 30, rounds: 1 };
    case 'circuit':
      return { ...base, workSec: 40, restSec: 15, rounds: 3, transitionSec: 60 };
    case 'intervals':
      return { ...base, workSec: 60, restSec: 30, rounds: 8 };
    case 'emom':
      return { ...base, workSec: 60, rounds: 12 };
    case 'amrap':
      return { ...base, durationSec: 600 };
    case 'tabata':
      return { ...base, workSec: 20, restSec: 10, rounds: 8 };
    case 'for_time':
      return { ...base, durationSec: 720 };
    case 'partner':
      return { ...base, workSec: 30, rounds: 6 };
  }
}

export type Phase = 'work' | 'rest' | 'change' | 'coach' | 'break';

export interface Interval {
  seg: number;
  phase: Phase;
  sec: number;
  label: string;
  /** Highlighted move; undefined when the whole board is active (stations, AMRAP). */
  move?: number;
  round: number;
  rounds: number;
  set?: number;
  sets?: number;
  countUp?: boolean;
}

/** Expand one block into its intervals. */
export function segmentIntervals(s: ClassSegment, seg: number): Interval[] {
  const out: Interval[] = [];
  const n = Math.max(1, s.moves.length);
  const moveName = (i: number) => s.moves[i % n]?.name ?? s.name;
  const rounds = Math.max(1, s.rounds);
  switch (s.format) {
    case 'coach':
      out.push({ seg, phase: 'coach', sec: s.durationSec, label: s.name, round: 1, rounds: 1 });
      break;
    case 'stations': {
      const sets = Math.max(1, s.sets);
      const stations = Math.max(1, s.moves.length);
      for (let lap = 1; lap <= rounds; lap++) {
        for (let st = 0; st < stations; st++) {
          const rotation = (lap - 1) * stations + st + 1;
          for (let set = 1; set <= sets; set++) {
            out.push({ seg, phase: 'work', sec: s.workSec, label: 'Work', round: rotation, rounds: rounds * stations, set, sets });
            if (set < sets && s.restSec > 0) out.push({ seg, phase: 'rest', sec: s.restSec, label: 'Rest', round: rotation, rounds: rounds * stations, set, sets });
          }
          const last = lap === rounds && st === stations - 1;
          if (!last && s.transitionSec > 0) out.push({ seg, phase: 'change', sec: s.transitionSec, label: 'Change stations', round: rotation, rounds: rounds * stations });
        }
      }
      break;
    }
    case 'circuit':
      for (let r = 1; r <= rounds; r++) {
        for (let i = 0; i < n; i++) {
          out.push({ seg, phase: 'work', sec: s.workSec, label: moveName(i), move: i, round: r, rounds });
          if (i < n - 1 && s.restSec > 0) out.push({ seg, phase: 'rest', sec: s.restSec, label: 'Rest', move: i + 1, round: r, rounds });
        }
        if (r < rounds && s.transitionSec > 0) out.push({ seg, phase: 'rest', sec: s.transitionSec, label: 'Round rest', move: 0, round: r, rounds });
      }
      break;
    case 'intervals':
    case 'tabata':
      for (let r = 1; r <= rounds; r++) {
        out.push({ seg, phase: 'work', sec: s.workSec, label: moveName(r - 1), move: (r - 1) % n, round: r, rounds });
        if (r < rounds && s.restSec > 0) out.push({ seg, phase: 'rest', sec: s.restSec, label: 'Rest', move: r % n, round: r, rounds });
      }
      break;
    case 'emom':
      for (let m = 1; m <= rounds; m++) {
        out.push({ seg, phase: 'work', sec: s.workSec || 60, label: moveName(m - 1), move: (m - 1) % n, round: m, rounds });
      }
      break;
    case 'amrap':
      out.push({ seg, phase: 'work', sec: s.durationSec, label: 'AMRAP', round: 1, rounds: 1 });
      break;
    case 'for_time':
      out.push({ seg, phase: 'work', sec: s.durationSec, label: 'For time', round: 1, rounds: 1, countUp: true });
      break;
    case 'partner':
      for (let r = 1; r <= rounds; r++) {
        out.push({ seg, phase: 'work', sec: s.workSec, label: 'Partner A', move: (r - 1) % n, round: r, rounds });
        out.push({ seg, phase: 'work', sec: s.workSec, label: 'Partner B', move: (r - 1) % n, round: r, rounds });
      }
      break;
  }
  return out.filter((x) => x.sec > 0);
}

/** Full class timeline, including breaks between blocks. */
export function buildTimeline(lesson: Pick<ClassLesson, 'segments'>): Interval[] {
  const out: Interval[] = [];
  lesson.segments.forEach((s, i) => {
    out.push(...segmentIntervals(s, i));
    if (i < lesson.segments.length - 1 && s.breakSec > 0) {
      out.push({ seg: i, phase: 'break', sec: s.breakSec, label: `Set up · ${lesson.segments[i + 1].name}`, round: 1, rounds: 1 });
    }
  });
  return out;
}

export function segmentSeconds(s: ClassSegment): number {
  return segmentIntervals(s, 0).reduce((a, x) => a + x.sec, 0);
}

export function lessonSeconds(lesson: Pick<ClassLesson, 'segments'>): number {
  return buildTimeline(lesson).reduce((a, x) => a + x.sec, 0);
}

/** One-line timing summary, e.g. "45s / 15s × 2 sets · 30s change". */
export function segmentSummary(s: ClassSegment): string {
  const t = (n: number) => (n % 60 === 0 && n >= 60 ? `${n / 60} min` : n > 90 ? fmtDuration(n) : `${n}s`);
  switch (s.format) {
    case 'coach':
      return `${t(s.durationSec)} coach-led`;
    case 'stations':
      return `${s.moves.length || '–'} stations · ${t(s.workSec)}${s.restSec ? ` / ${t(s.restSec)}` : ''} × ${s.sets} set${s.sets > 1 ? 's' : ''}${s.transitionSec ? ` · ${t(s.transitionSec)} change` : ''}${s.rounds > 1 ? ` · ${s.rounds} laps` : ''}`;
    case 'circuit':
      return `${s.rounds} rounds · ${t(s.workSec)}${s.restSec ? ` / ${t(s.restSec)}` : ''}${s.transitionSec ? ` · ${t(s.transitionSec)} between rounds` : ''}`;
    case 'intervals':
    case 'tabata':
      return `${s.rounds} × ${t(s.workSec)} on${s.restSec ? ` / ${t(s.restSec)} off` : ''}`;
    case 'emom':
      return `EMOM ${s.rounds}${s.workSec && s.workSec !== 60 ? ` (every ${t(s.workSec)})` : ''}`;
    case 'amrap':
      return `AMRAP ${t(s.durationSec)}`;
    case 'for_time':
      return `For time · ${t(s.durationSec)} cap`;
    case 'partner':
      return `YGIG ${s.rounds} rounds · ${t(s.workSec)} each`;
  }
}

/** Plain-text coach sheet for sharing with co-coaches. */
export function lessonText(l: ClassLesson, studioName?: string): string {
  const head = [l.programType.toUpperCase(), [l.block, l.week ? `Week ${l.week}` : '', l.session].filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
  const lines = [`${head}`, `${l.title} · ${Math.round(lessonSeconds(l) / 60)} min${studioName ? ` · ${studioName}` : ''}`];
  if (l.focus) lines.push(`Focus: ${l.focus}`);
  if (l.equipment) lines.push(`Equipment: ${l.equipment}`);
  if (l.setup) lines.push(`Set-up: ${l.setup}`);
  lines.push('');
  l.segments.forEach((s, i) => {
    lines.push(`${i + 1}) ${s.name} · ${segmentSummary(s)}${s.zone ? ` · Zone ${s.zone}` : ''}`);
    s.moves.forEach((m, j) => {
      const extra = [m.target, m.load].filter(Boolean).join(' · ');
      lines.push(`   ${s.format === 'stations' ? `S${j + 1}` : '•'} ${m.name}${extra ? ` — ${extra}` : ''}${m.options ? ` (${m.options})` : ''}`);
    });
    if (s.notes) lines.push(`   Note: ${s.notes}`);
  });
  if (l.coachNotes) lines.push('', `Coach notes: ${l.coachNotes}`);
  return lines.join('\n');
}

/** Training load (session-RPE × minutes) a linked client picks up from classes. */
export function classLoadsFor(classes: GroupClass[], clientId: ID): { date: DayKey; load: number }[] {
  return classes
    .filter((g) => g.status === 'completed' && g.attendees.some((a) => a.clientId === clientId && a.present))
    .map((g) => ({ date: dayKey(new Date(g.start)), load: Math.round((g.rpe ?? 7) * g.durationMin) }));
}

export function classTitle(g: GroupClass, lessons: ClassLesson[]): string {
  return g.title || lessons.find((l) => l.id === g.lessonId)?.title || g.programType;
}

export function presentCount(g: GroupClass): number {
  return g.attendees.filter((a) => a.present).length;
}

export function classPay(classes: GroupClass[], studios: Studio[], from: DayKey, to: DayKey): number {
  const rate = new Map(studios.map((s) => [s.id, s.payPerClass ?? 0]));
  return classes
    .filter((g) => g.status === 'completed' && dayKey(new Date(g.start)) >= from && dayKey(new Date(g.start)) <= to)
    .reduce((a, g) => a + (g.studioId ? rate.get(g.studioId) ?? 0 : 0), 0);
}

/** Deep copy with fresh ids, for duplicating a lesson. */
export function cloneLesson(l: ClassLesson, patch: Partial<ClassLesson> = {}): ClassLesson {
  return {
    ...l,
    ...patch,
    id: uid(),
    example: false,
    createdAt: new Date().toISOString(),
    segments: l.segments.map((s) => ({ ...s, id: uid(), moves: s.moves.map((m) => ({ ...m, id: uid() })) })),
  };
}
