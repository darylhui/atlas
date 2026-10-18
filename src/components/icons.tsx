import {
  Activity,
  Apple,
  Ban,
  Banana,
  BicepsFlexed,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  Camera,
  CircleCheck,
  Crown,
  Droplet,
  Drumstick,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Medal,
  Moon,
  Mountain,
  PersonStanding,
  PhoneOff,
  Pill,
  Rocket,
  Salad,
  Shield,
  Sun,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/**
 * Named icons that can be stored in data (habits, achievements).
 * Keys are persisted, so only add to this list — never rename a key.
 */
export const NAMED_ICONS: Record<string, LucideIcon> = {
  check: CircleCheck,
  steps: Footprints,
  water: Droplet,
  protein: Drumstick,
  greens: Salad,
  sleep: Moon,
  mobility: Flower2,
  supplement: Pill,
  'no-phone': PhoneOff,
  walk: PersonStanding,
  avoid: Ban,
  fruit: Apple,
  carbs: Banana,
  read: BookOpen,
  sun: Sun,
  cardio: Activity,
  rehab: Shield,
  // achievements
  rocket: Rocket,
  strong: BicepsFlexed,
  flame: Flame,
  medal: Medal,
  crown: Crown,
  'calendar-check': CalendarCheck,
  'calendar-range': CalendarRange,
  trophy: Trophy,
  bolt: Zap,
  dumbbell: Dumbbell,
  mountain: Mountain,
  target: Target,
  camera: Camera,
};

/** Icons offered in the habit editor. */
export const HABIT_ICON_KEYS = [
  'check',
  'steps',
  'water',
  'protein',
  'greens',
  'sleep',
  'mobility',
  'supplement',
  'no-phone',
  'walk',
  'avoid',
  'fruit',
  'carbs',
  'read',
  'sun',
  'cardio',
  'rehab',
];

/** Renders a stored icon name. Unknown values (e.g. legacy emoji) fall back to a check mark. */
export function NamedIcon({ name, ...props }: { name?: string } & LucideProps) {
  const Icon = (name && NAMED_ICONS[name]) || CircleCheck;
  return <Icon aria-hidden {...props} />;
}
