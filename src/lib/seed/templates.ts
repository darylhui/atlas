import type { WorkoutTemplate } from '../types';

type Line = [exerciseId: string, sets: number, reps: string, restSec: number];

function t(id: string, name: string, focus: string, description: string, lines: Line[]): WorkoutTemplate {
  return {
    id,
    name,
    focus,
    description,
    createdAt: '2026-01-01',
    exercises: lines.map(([exerciseId, sets, reps, restSec], i) => ({ id: `${id}-${i}`, exerciseId, sets, reps, restSec })),
  };
}

export const STARTER_TEMPLATES: WorkoutTemplate[] = [
  t('tpl-fb-a', 'Full Body A', 'Strength', 'Squat-focused full body. Great for 2–3x/week beginners.', [
    ['back-squat', 3, '5-8', 150],
    ['bench-press', 3, '6-10', 120],
    ['barbell-row', 3, '8-10', 90],
    ['romanian-deadlift', 2, '8-10', 90],
    ['plank', 3, '45s', 45],
  ]),
  t('tpl-fb-b', 'Full Body B', 'Strength', 'Hinge-focused full body to alternate with A.', [
    ['deadlift', 3, '3-5', 180],
    ['overhead-press', 3, '6-8', 120],
    ['lat-pulldown', 3, '8-12', 90],
    ['bulgarian-split-squat', 2, '8-10', 90],
    ['dead-bug', 3, '10', 45],
  ]),
  t('tpl-upper', 'Upper Body', 'Hypertrophy', 'Balanced push/pull upper session.', [
    ['bench-press', 3, '6-10', 120],
    ['seated-cable-row', 3, '10-12', 90],
    ['seated-db-press', 3, '8-12', 90],
    ['lat-pulldown', 3, '10-12', 90],
    ['lateral-raise', 3, '12-15', 60],
    ['triceps-pushdown', 2, '12-15', 60],
    ['db-curl', 2, '10-12', 60],
  ]),
  t('tpl-lower', 'Lower Body', 'Hypertrophy', 'Quad and glute emphasis with hamstring accessory work.', [
    ['leg-press', 3, '10-12', 120],
    ['romanian-deadlift', 3, '8-10', 120],
    ['walking-lunge', 3, '10/leg', 90],
    ['lying-leg-curl', 3, '10-12', 60],
    ['hip-thrust', 3, '8-12', 90],
    ['standing-calf-raise', 3, '12-15', 60],
  ]),
  t('tpl-conditioning', 'Conditioning Circuit', 'Fat loss', 'Metabolic circuit — minimal rest between moves, 2 min between rounds.', [
    ['kb-swing', 4, '15', 20],
    ['goblet-squat', 4, '12', 20],
    ['push-up', 4, '10-15', 20],
    ['rower', 4, '250m', 120],
  ]),
  t('tpl-mobility', 'Mobility & Recovery', 'Recovery', 'Low-intensity session for low-readiness days.', [
    ['foam-roll', 1, '5 min', 0],
    ['cat-cow', 2, '10', 30],
    ['worlds-greatest-stretch', 2, '5/side', 30],
    ['hip-90-90', 2, '8/side', 30],
    ['thoracic-rotation', 2, '8/side', 30],
    ['band-pull-apart', 2, '15', 30],
  ]),
];
