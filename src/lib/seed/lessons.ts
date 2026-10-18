// Example lesson programmes, one per class style, each about 50 minutes.
// They show how blocks are structured. They are not any studio's official
// programming: coaches duplicate them or enter their own lessons.

import type { ClassLesson, ClassMove, ClassSegment, SegmentFormat } from '../types';
import { newSegment } from '../classes';

type Move = [name: string, target?: string, load?: string, options?: string];

let n = 0;
function seg(lessonId: string, format: SegmentFormat, name: string, over: Partial<ClassSegment>, moves: Move[] = []): ClassSegment {
  const base = newSegment(format, name);
  return {
    ...base,
    ...over,
    id: `${lessonId}-s${n++}`,
    moves: moves.map(([mname, target, load, options], i): ClassMove => ({ id: `${lessonId}-m${n}-${i}`, name: mname, target, load, options })),
  };
}

function lesson(id: string, l: Omit<ClassLesson, 'id' | 'createdAt' | 'example' | 'block' | 'week' | 'targetMin'>): ClassLesson {
  return { id, block: 'Example block', week: 1, targetMin: 50, createdAt: '2026-01-01T00:00:00.000Z', example: true, ...l };
}

const warm = (id: string, sec: number, moves: Move[]) => seg(id, 'coach', 'Warm-up', { durationSec: sec, breakSec: 30, zone: 2 }, moves);
const cool = (id: string, sec: number, moves: Move[] = [['Breathing & stretch']]) => seg(id, 'coach', 'Cool-down', { durationSec: sec, breakSec: 0, zone: 1 }, moves);

export const EXAMPLE_LESSONS: ClassLesson[] = [
  lesson('ex-strength', {
    title: 'Lower-body strength',
    programType: 'Strength',
    session: 'A',
    focus: 'Squat and hinge strength. Heavier loads, quality reps, full rest.',
    equipment: 'Barbells, plates, dumbbells, hip-thrust benches, sled, air bikes',
    setup: '4 barbell stations for Block A; benches along the back wall for Block B.',
    coachNotes: 'Build to RPE 8 on the last set. Brace cue before every rep. Demo the RDL hinge before Block A.',
    segments: [
      warm('ex-strength', 420, [['Hip airplanes', '5/side'], ['Goblet squat hold', '30s'], ['Glute bridge', '12'], ['Leg swings', '10/side']]),
      seg('ex-strength', 'stations', 'Block A · Strength', { workSec: 50, restSec: 40, sets: 3, transitionSec: 45, rounds: 1, breakSec: 90, zone: 3 }, [
        ['Back squat', '6 reps', 'RPE 7–8', 'Regress: goblet squat'],
        ['Romanian deadlift', '8 reps', 'RPE 7', 'Regress: DB RDL'],
        ['Reverse lunge', '8/leg', 'Moderate DBs'],
        ["Farmer's carry", '30 m', 'Heavy'],
      ]),
      seg('ex-strength', 'stations', 'Block B · Accessory', { workSec: 45, restSec: 30, sets: 3, transitionSec: 30, rounds: 1, breakSec: 60, zone: 3 }, [
        ['Barbell hip thrust', '10 reps', 'RPE 7'],
        ['Single-leg RDL', '8/leg', 'Light KB'],
        ['Nordic hamstring curl', '5 reps', '', 'Regress: band assisted'],
      ]),
      seg('ex-strength', 'emom', 'Finisher', { workSec: 60, rounds: 6, breakSec: 60, zone: 4 }, [
        ['Sled push', '2 lengths'],
        ['Air bike', '12 cal'],
      ]),
      cool('ex-strength', 300),
    ],
  }),
  lesson('ex-pump', {
    title: 'Upper-body pump',
    programType: 'Pump',
    session: 'B',
    focus: 'High-volume upper-body isolation. Chase the pump, keep tempo controlled.',
    equipment: 'Dumbbells (light / medium), plates, mats',
    coachNotes: 'Keep members moving: the short rests are deliberate. Lighter weights, 2-0-2 tempo.',
    segments: [
      warm('ex-pump', 360, [['Band pull-aparts', '15'], ['Arm circles', '30s'], ['Push-up walkouts', '6']]),
      seg('ex-pump', 'circuit', 'Block A', { workSec: 45, restSec: 15, rounds: 3, transitionSec: 60, breakSec: 60, zone: 3 }, [
        ['DB bench press', '45s', 'Medium'],
        ['Bent-over row', '45s', 'Medium'],
        ['Lateral raise', '45s', 'Light'],
        ['Biceps curl', '45s', 'Light'],
        ['Overhead triceps extension', '45s', 'Light'],
      ]),
      seg('ex-pump', 'circuit', 'Block B', { workSec: 40, restSec: 20, rounds: 4, transitionSec: 45, breakSec: 60, zone: 3 }, [
        ['Push-up', '40s', 'Bodyweight', 'Regress: knees'],
        ['Reverse fly', '40s', 'Light'],
        ['Hammer curl', '40s', 'Light'],
        ['Arnold press', '40s', 'Light'],
      ]),
      seg('ex-pump', 'tabata', 'Burnout', { workSec: 20, restSec: 10, rounds: 8, breakSec: 60, zone: 4 }, [
        ['Plate front raise'],
        ['Push-up hold'],
      ]),
      cool('ex-pump', 240),
    ],
  }),
  lesson('ex-hiit', {
    title: 'Machine & bodyweight HIIT',
    programType: 'Cardio HIIT',
    session: 'A',
    focus: 'Short, hard efforts with full intent. Zone 4–5 in the work, recover in the rest.',
    equipment: 'Air bikes, rowers, ski ergs, boxes, battle ropes, kettlebells, med balls',
    setup: '6 stations in a loop; members pair up so each station has 2–3 people.',
    coachNotes: 'Cue members to check their heart-rate zone on the screen. Scale box jumps to step-ups for anyone with knee issues.',
    segments: [
      warm('ex-hiit', 360, [['Easy row', '2 min'], ['Inchworms', '6'], ['Skips & high knees', '1 min']]),
      seg('ex-hiit', 'stations', 'Block A · Machines', { workSec: 40, restSec: 20, sets: 2, transitionSec: 20, rounds: 1, breakSec: 60, zone: 4 }, [
        ['Air bike', 'Max cal'],
        ['Rower', 'Max metres'],
        ['Ski erg', 'Max metres'],
        ['Box jump', 'Steady reps', '', 'Regress: step-ups'],
        ['Battle ropes', 'Waves'],
        ['Burpee', 'Steady reps', '', 'Regress: no push-up'],
      ]),
      seg('ex-hiit', 'intervals', 'Block B · Sprints', { workSec: 30, restSec: 30, rounds: 12, breakSec: 60, zone: 5 }, [
        ['Bike sprint'],
        ['Mountain climbers'],
      ]),
      seg('ex-hiit', 'circuit', 'Block C', { workSec: 45, restSec: 15, rounds: 3, transitionSec: 30, breakSec: 60, zone: 4 }, [
        ['Kettlebell swing', '45s', 'Medium KB'],
        ['Skater hops', '45s'],
        ['Med ball slam', '45s'],
        ['Shuttle run', '45s'],
      ]),
      cool('ex-hiit', 300),
    ],
  }),
  lesson('ex-hirt', {
    title: 'EMOM, AMRAP & partner finisher',
    programType: 'H.I.R.T',
    session: 'A',
    focus: 'High-intensity resistance in mixed formats.',
    equipment: 'Barbells, dumbbells, kettlebells, pull-up rig, boxes, rowers',
    coachNotes: 'EMOM: members should finish each minute with 10–15 s to spare. Record AMRAP rounds on the whiteboard.',
    segments: [
      warm('ex-hirt', 360, [['Air squats', '15'], ['Banded rows', '15'], ['Hip hinge drill', '10']]),
      seg('ex-hirt', 'emom', 'EMOM 16', { workSec: 60, rounds: 16, breakSec: 60, zone: 4 }, [
        ['Thruster', '10 reps', 'Light DBs'],
        ['Pull-up', '8 reps', '', 'Regress: ring rows'],
        ['Kettlebell swing', '15 reps', 'Medium'],
        ['Burpee', '8 reps'],
      ]),
      seg('ex-hirt', 'amrap', 'AMRAP 12', { durationSec: 720, breakSec: 60, zone: 4 }, [
        ['Deadlift', '8 reps', 'Moderate'],
        ['Box step-over', '12 reps'],
        ['Push press', '10 reps', 'Light'],
      ]),
      seg('ex-hirt', 'partner', 'YGIG finisher', { workSec: 45, rounds: 6, breakSec: 60, zone: 5 }, [
        ['Rower (A) / wall sit (B)'],
      ]),
      cool('ex-hirt', 240),
    ],
  }),
  lesson('ex-summit', {
    title: 'Aerobic pacing',
    programType: 'Cardio Summit',
    session: 'B',
    focus: 'Work hard but not at max: hold steady Zone 3 and learn sustainable pace.',
    equipment: 'Rowers, air bikes, ski ergs, step boxes, sleds, dumbbells',
    coachNotes: 'Pace should feel repeatable on every interval. Pull members back if they drift into Zone 5.',
    segments: [
      warm('ex-summit', 420, [['Easy bike', '3 min'], ['Dynamic mobility', '4 min']]),
      seg('ex-summit', 'intervals', 'Block A · Machine intervals', { workSec: 180, restSec: 60, rounds: 5, breakSec: 90, zone: 3 }, [
        ['Rower'],
        ['Air bike'],
        ['Ski erg'],
      ]),
      seg('ex-summit', 'circuit', 'Block B · Strength-cardio', { workSec: 120, restSec: 30, rounds: 2, transitionSec: 60, breakSec: 60, zone: 3 }, [
        ['Step-ups', '2 min', 'Light DBs'],
        ['Sled push', '2 min', 'Light'],
        ["Farmer's carry", '2 min', 'Medium'],
      ]),
      cool('ex-summit', 360),
    ],
  }),
  lesson('ex-power', {
    title: 'Explosive power',
    programType: 'Power',
    session: 'A',
    focus: 'Fast, crisp reps. Stop each set before speed drops.',
    equipment: 'Barbells, boxes, med balls, kettlebells, air bikes',
    coachNotes: 'Quality over quantity: full recovery between sets. Teach the hang clean catch position in the warm-up.',
    segments: [
      warm('ex-power', 420, [['Pogo hops', '20'], ['Hang clean drill', '8'], ['Lateral bounds', '6/side']]),
      seg('ex-power', 'stations', 'Block A · Power', { workSec: 30, restSec: 45, sets: 3, transitionSec: 30, rounds: 1, breakSec: 60, zone: 3 }, [
        ['Hang power clean', '3–5 reps', 'Light–moderate'],
        ['Box jump', '5 reps', '', 'Regress: squat jump'],
        ['Med ball chest pass', '6 reps'],
        ['Broad jump', '4 reps'],
      ]),
      seg('ex-power', 'stations', 'Block B · Speed-strength', { workSec: 40, restSec: 40, sets: 3, transitionSec: 30, rounds: 1, breakSec: 60, zone: 3 }, [
        ['Jump squat', '6 reps', 'Light DBs'],
        ['Push press', '5 reps', 'Moderate'],
        ['Kettlebell swing', '10 reps', 'Heavy'],
      ]),
      seg('ex-power', 'intervals', 'Finisher · Sprints', { workSec: 15, restSec: 45, rounds: 8, breakSec: 60, zone: 5 }, [['Air bike sprint', 'All out']]),
      cool('ex-power', 420),
    ],
  }),
  lesson('ex-balanced', {
    title: 'Mobility & stability',
    programType: 'Balanced',
    session: 'A',
    focus: 'Core control, single-leg stability and mobility. A great recovery-day class.',
    equipment: 'Mats, light kettlebells, cables or bands, foam rollers',
    coachNotes: 'Slow and controlled. Use this class for members with low readiness scores.',
    segments: [
      seg('ex-balanced', 'coach', 'Breathwork & mobility', { durationSec: 600, breakSec: 0, zone: 1 }, [['Box breathing', '2 min'], ['Foam rolling', '4 min'], ['Cat-cow & thoracic openers', '4 min']]),
      seg('ex-balanced', 'circuit', 'Stability circuit', { workSec: 45, restSec: 15, rounds: 3, transitionSec: 45, breakSec: 60, zone: 2 }, [
        ['Dead bug', '45s'],
        ['Single-leg RDL', '45s', 'Bodyweight'],
        ['Pallof press', '45s', 'Light band'],
        ['Copenhagen plank', '45s', '', 'Regress: short lever'],
        ['Bird dog', '45s'],
      ]),
      seg('ex-balanced', 'circuit', 'Mobility flow', { workSec: 60, restSec: 15, rounds: 3, transitionSec: 30, breakSec: 30, zone: 1 }, [
        ["World's greatest stretch", '60s'],
        ['90/90 hip switches', '60s'],
        ['Thoracic rotations', '60s'],
        ['Couch stretch', '60s'],
      ]),
      cool('ex-balanced', 450),
    ],
  }),
];
