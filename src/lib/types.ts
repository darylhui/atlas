// Core data model. All weights are stored in kilograms and all lengths in
// centimetres; conversion to the trainer's preferred units happens at display time.

export type ID = string;
/** Calendar day in local time, formatted YYYY-MM-DD. */
export type DayKey = string;

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'neck'
  | 'full_body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'other';

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'plyometric';

/** How a set of this exercise is recorded. */
export type TrackingMode = 'weight_reps' | 'reps' | 'time' | 'distance_time';

export interface Exercise {
  id: ID;
  name: string;
  category: ExerciseCategory;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingMode;
  cues?: string;
  videoUrl?: string;
  custom?: boolean;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'athlete';
export type NutritionGoal = 'lose' | 'maintain' | 'gain';

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  goal: NutritionGoal;
}

export interface ParQ {
  answers: boolean[];
  completedAt?: DayKey;
}

export interface Client {
  id: ID;
  name: string;
  email?: string;
  phone?: string;
  dob?: DayKey;
  sex: Sex;
  heightCm?: number;
  color: string;
  status: 'active' | 'paused' | 'archived';
  startDate: DayKey;
  activityLevel: ActivityLevel;
  goalSummary?: string;
  injuries?: string;
  medical?: string;
  emergencyContact?: string;
  tags: string[];
  parq?: ParQ;
  nutrition?: NutritionTargets;
  createdAt: string;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: ID;
  type: SetType;
  weight?: number;
  reps?: number;
  rpe?: number;
  durationSec?: number;
  distanceM?: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: ID;
  exerciseId: ID;
  notes?: string;
  restSec?: number;
  /** Prescription carried over from a template, e.g. "8-10". */
  target?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: ID;
  clientId: ID;
  date: DayKey;
  startedAt: string;
  endedAt?: string;
  name: string;
  templateId?: ID;
  exercises: WorkoutExercise[];
  /** Session RPE (Borg CR-10) reported at the end of the session. */
  sessionRpe?: number;
  durationMin?: number;
  notes?: string;
  status: 'in_progress' | 'completed';
}

export interface TemplateExercise {
  id: ID;
  exerciseId: ID;
  sets: number;
  reps: string;
  restSec: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: ID;
  name: string;
  description?: string;
  focus?: string;
  exercises: TemplateExercise[];
  createdAt: string;
}

/** Daily wellness / readiness questionnaire. Scales are 1 (worst) to 5 (best),
 *  except stress and soreness which are 1 (none) to 5 (severe). */
export interface CheckIn {
  id: ID;
  clientId: ID;
  date: DayKey;
  sleepHours: number;
  sleepQuality: number;
  energy: number;
  mood: number;
  stress: number;
  soreness: number;
  soreAreas: MuscleGroup[];
  restingHr?: number;
  hrv?: number;
  notes?: string;
}

export interface Measurement {
  id: ID;
  clientId: ID;
  date: DayKey;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
}

export type PhotoPose = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: ID;
  clientId: ID;
  date: DayKey;
  pose: PhotoPose;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: ID;
  clientId: ID;
  date: DayKey;
  meal: MealSlot;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodId?: ID;
}

export interface Food {
  id: ID;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  custom?: boolean;
}

export interface WaterLog {
  clientId: ID;
  date: DayKey;
  ml: number;
}

export type GoalKind = 'strength' | 'bodyweight' | 'bodyfat' | 'sessions' | 'custom';

export interface Goal {
  id: ID;
  clientId: ID;
  kind: GoalKind;
  title: string;
  exerciseId?: ID;
  startValue: number;
  targetValue: number;
  /** Only used for custom goals, where progress is entered manually. */
  currentValue?: number;
  unit: string;
  deadline?: DayKey;
  createdAt: DayKey;
  achievedAt?: DayKey;
}

export interface Habit {
  id: ID;
  clientId: ID;
  name: string;
  emoji: string;
  /** Target number of completions per week (1-7). */
  perWeek: number;
}

export interface HabitLog {
  habitId: ID;
  date: DayKey;
}

export type AppointmentType = 'session' | 'assessment' | 'check_in' | 'online';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: ID;
  clientId: ID;
  start: string;
  durationMin: number;
  type: AppointmentType;
  status: AppointmentStatus;
  location?: string;
  notes?: string;
  workoutId?: ID;
}

export interface Package {
  id: ID;
  clientId: ID;
  name: string;
  totalSessions: number;
  usedSessions: number;
  price: number;
  purchasedAt: DayKey;
  expiresAt?: DayKey;
  paid: boolean;
}

export interface Note {
  id: ID;
  clientId: ID;
  date: string;
  text: string;
  pinned?: boolean;
}

// ---------- Group classes (studio lesson programmes) ----------

export type SegmentFormat = 'coach' | 'stations' | 'circuit' | 'intervals' | 'emom' | 'amrap' | 'tabata' | 'for_time' | 'partner';

export interface ClassMove {
  id: ID;
  name: string;
  exerciseId?: ID;
  /** Reps, time or distance, e.g. "10 reps", "40s", "250m". */
  target?: string;
  /** Load guidance, e.g. "RPE 8", "70% 1RM", "Heavy DBs". */
  load?: string;
  /** Regressions / progressions to cue. */
  options?: string;
}

export interface ClassSegment {
  id: ID;
  name: string;
  format: SegmentFormat;
  workSec: number;
  restSec: number;
  /** Laps, rounds or minutes depending on the format. */
  rounds: number;
  /** Sets at each station before rotating (stations format). */
  sets: number;
  /** Station change or between-round rest. */
  transitionSec: number;
  /** Total time for coach-led, AMRAP and for-time blocks. */
  durationSec: number;
  /** Water / set-up break after this block. */
  breakSec: number;
  /** Target heart-rate zone 1–5. */
  zone?: number;
  notes?: string;
  moves: ClassMove[];
}

export interface ClassLesson {
  id: ID;
  title: string;
  programType: string;
  /** Programming block / cycle, e.g. "Block 12". */
  block?: string;
  week?: number;
  session?: string;
  targetMin: number;
  focus?: string;
  equipment?: string;
  setup?: string;
  coachNotes?: string;
  example?: boolean;
  segments: ClassSegment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Studio {
  id: ID;
  name: string;
  address?: string;
  payPerClass?: number;
  capacity?: number;
}

export interface Attendee {
  id: ID;
  name: string;
  clientId?: ID;
  present: boolean;
}

export interface GroupClass {
  id: ID;
  lessonId?: ID;
  programType: string;
  title?: string;
  studioId?: ID;
  start: string;
  durationMin: number;
  capacity?: number;
  attendees: Attendee[];
  status: 'scheduled' | 'completed' | 'cancelled';
  /** Typical session RPE for members; feeds linked clients' training load. */
  rpe?: number;
  notes?: string;
}

export type Units = 'metric' | 'imperial';

export interface Settings {
  trainerName: string;
  businessName: string;
  units: Units;
  currency: string;
  defaultRestSec: number;
  clientModePin?: string;
  autoDeductPackage: boolean;
  onboarded: boolean;
}

export interface AppData {
  version: number;
  clients: Client[];
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  checkIns: CheckIn[];
  measurements: Measurement[];
  photos: ProgressPhoto[];
  foods: Food[];
  foodEntries: FoodEntry[];
  water: WaterLog[];
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
  appointments: Appointment[];
  packages: Package[];
  notes: Note[];
  studios: Studio[];
  lessons: ClassLesson[];
  groupClasses: GroupClass[];
  settings: Settings;
}
