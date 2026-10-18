import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useSettings } from '../lib/store';
import { e1rm, pctOf1rm, platesPerSide } from '../lib/analytics/strength';
import { beep, requestWakeLock, unlockAudio } from '../lib/sound';
import { fmtDuration, fmtNum, round, toDisplayWeight, weightUnit } from '../lib/util';
import { Button, Card, Field, NumberInput, Page, Section, Segmented, Stepper, useNow } from '../components/ui';

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5];
const PLATE_COLOR: Record<string, string> = { '25': '#d03b3b', '20': '#3987e5', '15': '#c98500', '10': '#199e70', '45': '#3987e5', '35': '#c98500' };

export function PlateCalculator({ initialKg }: { initialKg?: number }) {
  const { units } = useSettings();
  const imperial = units === 'imperial';
  const [target, setTarget] = useState<number | undefined>(initialKg != null ? round(toDisplayWeight(initialKg, units), 1) : imperial ? 135 : 60);
  const [bar, setBar] = useState(imperial ? 45 : 20);
  const plates = imperial ? LB_PLATES : KG_PLATES;
  const res = platesPerSide(target ?? 0, bar, plates);
  const wu = weightUnit(units);
  const maxPlate = plates[0];
  return (
    <div className="stack">
      <div className="grid-2">
        <Field label={`Target (${wu})`}>
          <NumberInput value={target} onChange={setTarget} />
        </Field>
        <Field label="Bar">
          <Segmented
            value={String(bar)}
            onChange={(v) => setBar(Number(v))}
            options={(imperial ? [45, 35, 15] : [20, 15, 10]).map((b) => ({ value: String(b), label: `${b}` }))}
          />
        </Field>
      </div>
      <Card>
        <div className="row" style={{ justifyContent: 'center', gap: 3, height: 110 }}>
          <div style={{ width: 40, height: 10, background: '#8a8d93', borderRadius: 2 }} />
          {res.plates.map((p, i) => (
            <div
              key={i}
              title={`${p} ${wu}`}
              style={{
                width: p >= 10 ? 16 : 11,
                height: 34 + (p / maxPlate) * 70,
                borderRadius: 4,
                background: PLATE_COLOR[String(p)] ?? '#b9babd',
                display: 'grid',
                placeItems: 'center',
                fontSize: 9,
                fontWeight: 800,
                color: '#12140d',
                writingMode: 'vertical-rl',
              }}
            >
              {p}
            </div>
          ))}
          <div style={{ width: 16, height: 10, background: '#8a8d93', borderRadius: 2 }} />
        </div>
        <div className="center mt-2">
          {res.plates.length ? (
            <>
              <div className="bold">Per side: {res.plates.join(' + ')}</div>
              <div className="small faint">
                {fmtNum(bar + res.plates.reduce((a, b) => a + b, 0) * 2)} {wu} loaded{res.remainder > 0 ? ` · ${res.remainder} ${wu} short of target` : ''}
              </div>
            </>
          ) : (
            <div className="muted">Just the bar</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function OneRepMax() {
  const { units } = useSettings();
  const [w, setW] = useState<number | undefined>(100);
  const [r, setR] = useState<number | undefined>(5);
  const max = w && r ? e1rm(w, r) : 0;
  const wu = weightUnit(units);
  return (
    <div className="stack">
      <div className="grid-2">
        <Field label={`Weight (${wu})`}>
          <NumberInput value={w} onChange={setW} />
        </Field>
        <Field label="Reps">
          <NumberInput value={r} onChange={setR} decimal={false} />
        </Field>
      </div>
      <Card>
        <div className="center">
          <div className="small faint">Estimated 1RM (Epley)</div>
          <div className="hero-num mt-1">
            {fmtNum(max)}
            <span className="stat-unit">{wu}</span>
          </div>
        </div>
        <table className="data-table mt-2">
          <thead>
            <tr>
              <th>Reps</th>
              <th>% 1RM</th>
              <th>Load</th>
              <th>Training use</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 5, 6, 8, 10, 12, 15].map((n) => (
              <tr key={n}>
                <td>{n}</td>
                <td>{Math.round(pctOf1rm(n) * 100)}%</td>
                <td>
                  <b>{fmtNum(round((max * pctOf1rm(n)) / 2.5) * 2.5)}</b>
                </td>
                <td className="faint">{n <= 3 ? 'Max strength' : n <= 6 ? 'Strength' : n <= 12 ? 'Hypertrophy' : 'Endurance'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function IntervalTimer() {
  const [work, setWork] = useState(40);
  const [restSec, setRestSec] = useState(20);
  const [rounds, setRounds] = useState(8);
  const [state, setState] = useState<{ startedAt: number; pausedAt?: number; offset: number } | null>(null);
  const now = useNow(200);
  const lastPhase = useRef('');

  useEffect(() => {
    if (!state) return;
    let release: (() => void) | undefined;
    void requestWakeLock().then((r) => (release = r));
    return () => release?.();
  }, [state]);

  const cycle = work + restSec;
  const elapsed = state ? ((state.pausedAt ?? now) - state.startedAt - state.offset) / 1000 : 0;
  const total = cycle * rounds - restSec;
  const done = elapsed >= total;
  const round_ = Math.min(rounds, Math.floor(elapsed / cycle) + 1);
  const inCycle = elapsed % cycle;
  const phase = !state ? 'ready' : done ? 'done' : inCycle < work ? 'work' : 'rest';
  const left = phase === 'work' ? work - inCycle : phase === 'rest' ? cycle - inCycle : 0;

  useEffect(() => {
    const key = `${phase}-${round_}`;
    if (state && key !== lastPhase.current) {
      if (lastPhase.current) beep(phase === 'done' ? 4 : phase === 'work' ? 2 : 1);
      lastPhase.current = key;
    }
  }, [phase, round_, state]);

  const color = phase === 'work' ? 'var(--accent)' : phase === 'rest' ? 'var(--series-1)' : 'var(--text-2)';

  return (
    <div className="stack">
      <Card style={{ borderColor: phase === 'work' ? 'rgba(170,214,0,0.4)' : undefined }}>
        <div className="center">
          <div className="bold" style={{ color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {phase === 'ready' ? 'Ready' : phase === 'done' ? 'Done' : phase}
          </div>
          <div className="hero-num tabular" style={{ fontSize: 80, marginTop: 6 }}>
            {phase === 'ready' ? fmtDuration(work) : fmtDuration(Math.ceil(left))}
          </div>
          <div className="muted">
            Round {state ? round_ : 1} of {rounds} · total {fmtDuration(total)}
          </div>
        </div>
        <div className="grid-2 mt-3">
          {!state || done ? (
            <Button
              variant="primary"
              onClick={() => {
                unlockAudio();
                lastPhase.current = '';
                setState({ startedAt: Date.now(), offset: 0 });
              }}
            >
              <Play size={18} /> Start
            </Button>
          ) : state.pausedAt ? (
            <Button variant="primary" onClick={() => setState({ ...state, offset: state.offset + (Date.now() - state.pausedAt!), pausedAt: undefined })}>
              <Play size={18} /> Resume
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setState({ ...state, pausedAt: Date.now() })}>
              <Pause size={18} /> Pause
            </Button>
          )}
          <Button onClick={() => setState(null)}>
            <RotateCcw size={18} /> Reset
          </Button>
        </div>
      </Card>
      <div className="grid-3">
        <Field label="Work">
          <Stepper value={work} onChange={setWork} step={5} min={5} max={600} format={(v) => <span style={{ fontSize: 17 }}>{fmtDuration(v)}</span>} />
        </Field>
        <Field label="Rest">
          <Stepper value={restSec} onChange={setRestSec} step={5} min={0} max={600} format={(v) => <span style={{ fontSize: 17 }}>{fmtDuration(v)}</span>} />
        </Field>
        <Field label="Rounds">
          <Stepper value={rounds} onChange={setRounds} min={1} max={50} format={(v) => <span style={{ fontSize: 17 }}>{v}</span>} />
        </Field>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {[
          { name: 'Tabata', w: 20, r: 10, n: 8 },
          { name: 'EMOM 10', w: 60, r: 0, n: 10 },
          { name: '40/20 × 8', w: 40, r: 20, n: 8 },
          { name: '30/30 × 10', w: 30, r: 30, n: 10 },
        ].map((p) => (
          <button
            key={p.name}
            className="chip"
            onClick={() => {
              setWork(p.w);
              setRestSec(p.r);
              setRounds(p.n);
              setState(null);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const RPE_ROWS: [string, string, string][] = [
  ['10', '0', 'Maximal effort — no more reps possible'],
  ['9.5', '0–1', 'Could maybe do one more, or add load'],
  ['9', '1', 'One rep left in the tank'],
  ['8.5', '1–2', 'Definitely 1, maybe 2 more'],
  ['8', '2', 'Two reps left'],
  ['7', '3', 'Fast, powerful reps — three left'],
  ['5–6', '4–6', 'Warm-up / technique work'],
];

export default function Tools() {
  const [tab, setTab] = useState<'1rm' | 'plates' | 'timer' | 'rpe'>('1rm');
  return (
    <Page title="Coach tools" back="/more" compact>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: '1rm', label: '1RM' },
          { value: 'plates', label: 'Plates' },
          { value: 'timer', label: 'Intervals' },
          { value: 'rpe', label: 'RPE' },
        ]}
      />
      {tab === '1rm' && <OneRepMax />}
      {tab === 'plates' && <PlateCalculator />}
      {tab === 'timer' && <IntervalTimer />}
      {tab === 'rpe' && (
        <Section title="RPE ↔ reps in reserve">
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RPE</th>
                  <th>RIR</th>
                  <th style={{ textAlign: 'left' }}>Feels like</th>
                </tr>
              </thead>
              <tbody>
                {RPE_ROWS.map(([rpe, rir, d]) => (
                  <tr key={rpe}>
                    <td>
                      <b>{rpe}</b>
                    </td>
                    <td>{rir}</td>
                    <td style={{ textAlign: 'left' }} className="muted">
                      {d}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="xs faint mt-2">Set RPE is logged per set in the workout logger. Session RPE (Borg CR-10) is captured when you finish and drives the training-load metrics.</p>
          </div>
        </Section>
      )}
    </Page>
  );
}
