import { create } from 'zustand';

/**
 * Per-device display preferences (theme, text size, bold text).
 * Kept in localStorage rather than the IndexedDB data so the theme can be
 * applied before first paint (see the inline script in index.html — keep the
 * key and attribute names in sync with it).
 */

export type ThemePref = 'dark' | 'light' | 'system';

export interface DisplayPrefs {
  theme: ThemePref;
  /** Multiplier applied to every font size (CSS var --ts). */
  textScale: number;
  boldText: boolean;
}

export const TEXT_SIZES = [
  { value: 0.875, label: 'Small' },
  { value: 1, label: 'Default' },
  { value: 1.125, label: 'Large' },
  { value: 1.25, label: 'Larger' },
  { value: 1.375, label: 'Largest' },
];

const KEY = 'atlas.display';
const DEFAULTS: DisplayPrefs = { theme: 'dark', textScale: 1, boldText: false };

function load(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: use defaults */
  }
  return DEFAULTS;
}

const systemLight = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches;

export function resolvedTheme(p: DisplayPrefs): 'dark' | 'light' {
  return p.theme === 'system' ? (systemLight() ? 'light' : 'dark') : p.theme;
}

export function applyDisplay(p: DisplayPrefs) {
  const root = document.documentElement;
  const theme = resolvedTheme(p);
  root.dataset.theme = theme;
  root.style.setProperty('--ts', String(p.textScale));
  root.style.setProperty('--wb', p.boldText ? '150' : '0');
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'light' ? '#f7f9fa' : '#121212');
}

interface DisplayState extends DisplayPrefs {
  set: (p: Partial<DisplayPrefs>) => void;
}

export const useDisplay = create<DisplayState>((set, get) => ({
  ...load(),
  set(p) {
    set(p);
    const { theme, textScale, boldText } = get();
    const next = { theme, textScale, boldText };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* not persisted; still applied for this session */
    }
    applyDisplay(next);
  },
}));

/** Apply saved prefs now and follow the OS theme while "Match system" is chosen. */
export function initDisplay() {
  applyDisplay(useDisplay.getState());
  if (typeof matchMedia === 'undefined') return;
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const s = useDisplay.getState();
    if (s.theme === 'system') applyDisplay(s);
  });
}

/** Font size for inline styles that follows the text-size setting. */
export const fs = (px: number) => `calc(${px}px * var(--ts))`;
