import { Moon, MonitorSmartphone, Sun } from 'lucide-react';
import { TEXT_SIZES, useDisplay, type ThemePref } from '../lib/display';
import { Card, Section, Toggle } from './ui';

const THEMES: { value: ThemePref; label: string; icon: typeof Sun; bg: string; bar: string; accent: string }[] = [
  { value: 'dark', label: 'Dark', icon: Moon, bg: '#121212', bar: '#343434', accent: '#bb86fc' },
  { value: 'light', label: 'Light', icon: Sun, bg: '#f7f9fa', bar: '#e3e5e5', accent: '#6200ee' },
  { value: 'system', label: 'System', icon: MonitorSmartphone, bg: 'linear-gradient(135deg, #121212 50%, #f7f9fa 50%)', bar: '#8c8c8c', accent: '#9a5cf6' },
];

export function DisplaySettings() {
  const d = useDisplay();
  const idx = Math.max(0, TEXT_SIZES.findIndex((t) => t.value === d.textScale));
  const size = TEXT_SIZES[idx] ?? TEXT_SIZES[1];
  const isDefault = d.theme === 'dark' && d.textScale === 1 && !d.boldText;

  return (
    <Section
      title="Display & text size"
      action={
        !isDefault ? (
          <button className="section-link" onClick={() => d.set({ theme: 'dark', textScale: 1, boldText: false })}>
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="stack">
        <Card>
          <div className="card-title">Appearance</div>
          <div className="theme-pick mt-2" role="radiogroup" aria-label="Appearance">
            {THEMES.map((t) => (
              <button key={t.value} role="radio" aria-checked={d.theme === t.value} className={d.theme === t.value ? 'on' : ''} onClick={() => d.set({ theme: t.value })}>
                <span className="theme-swatch" style={{ background: t.bg }} aria-hidden>
                  <span />
                  <span className="stack" style={{ gap: 3 }}>
                    <i style={{ background: t.accent, width: '60%' }} />
                    <i style={{ background: t.bar }} />
                  </span>
                </span>
                <span className="row" style={{ gap: 4 }}>
                  <t.icon size={14} aria-hidden /> {t.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="row-between">
            <div className="card-title">Text size</div>
            <span className="small muted">{size.label}</span>
          </div>
          <div className="row mt-2" style={{ gap: 12 }}>
            <span aria-hidden style={{ fontSize: 13, fontWeight: 600 }}>
              A
            </span>
            <input
              className="range grow"
              type="range"
              min={0}
              max={TEXT_SIZES.length - 1}
              step={1}
              value={idx}
              aria-label="Text size"
              aria-valuetext={size.label}
              onChange={(e) => d.set({ textScale: TEXT_SIZES[Number(e.target.value)].value })}
            />
            <span aria-hidden style={{ fontSize: 22, fontWeight: 600 }}>
              A
            </span>
          </div>
          <div className="text-size-preview mt-2">
            <div className="card-title">Back Squat · 3 × 8</div>
            <div className="small muted">Last time 100 kg × 8 — try 102.5 kg today. Text across Atlas follows this size.</div>
          </div>
        </Card>

        <div className="card flush">
          <div className="list-item">
            <div className="grow">
              <div className="bold">Bold text</div>
              <div className="small faint">Heavier type everywhere for easier reading</div>
            </div>
            <Toggle on={d.boldText} onChange={(v) => d.set({ boldText: v })} label="Bold text" />
          </div>
        </div>
      </div>
    </Section>
  );
}
