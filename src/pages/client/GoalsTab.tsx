import { useMemo, useState } from 'react';
import { Check, Target, Trash2 } from 'lucide-react';
import { HABIT_ICON_KEYS, NamedIcon } from '../../components/icons';
import { actions, useStore } from '../../lib/store';
import type { Client, Goal, GoalKind, Habit } from '../../lib/types';
import { achievements, goalProgress, habitStreak, habitWeek } from '../../lib/analytics/engagement';
import { exerciseHistory } from '../../lib/analytics/strength';
import { addDays, daysBetween, dowShort, fmtDay, fmtNum, fmtWeight, fromDisplayWeight, round, today, toDisplayWeight, uid, weekStart, weightUnit } from '../../lib/util';
import { Button, Card, Empty, Field, NumberInput, Progress, Section, Select, Sheet, Stepper, TextInput, toast } from '../../components/ui';
import { celebrate } from '../../components/Confetti';
import { fs } from '../../lib/display';

export default function GoalsTab({ client }: { client: Client }) {
  const data = useStore((s) => s.data);
  const units = data.settings.units;
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const goals = data.goals.filter((g) => g.clientId === client.id);
  const habits = data.habits.filter((h) => h.clientId === client.id);
  const badges = useMemo(() => achievements(client.id, data), [client.id, data]);
  const earned = badges.filter((b) => b.earned).length;
  const t = today();
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(t), i));

  const newGoal = (): Goal => ({ id: uid(), clientId: client.id, kind: 'bodyweight', title: '', startValue: 0, targetValue: 0, unit: 'kg', createdAt: t });

  return (
    <div className="stack-lg">
      <Section title="Goals" action={<button className="section-link" onClick={() => setEditGoal(newGoal())}>+ New goal</button>}>
        <div className="stack">
          {goals.map((g) => {
            const p = goalProgress(g, data);
            const kg = g.unit === 'kg';
            const fmt = (v: number) => (kg ? fmtWeight(v, units) : `${fmtNum(v)} ${g.unit}`);
            const daysLeft = g.deadline ? daysBetween(t, g.deadline) : undefined;
            return (
              <Card key={g.id} onClick={() => setEditGoal(g)}>
                <div className="row-between">
                  <div className="bold">{g.title}</div>
                  {p.achieved ? <span className="pill good"><span className="dot" style={{ background: 'var(--good)' }} />Achieved</span> : <span className="small faint">{Math.round(p.pct * 100)}%</span>}
                </div>
                <div className="mt-2">
                  <Progress pct={p.pct} color={p.achieved ? 'var(--good)' : undefined} />
                </div>
                <div className="row-between xs faint mt-1">
                  <span>Start {fmt(g.startValue)}</span>
                  <span className="muted">
                    Now <b style={{ color: 'var(--text)' }}>{fmt(p.current)}</b>
                    {g.kind === 'strength' ? ' est. 1RM' : ''}
                  </span>
                  <span>Target {fmt(g.targetValue)}</span>
                </div>
                {daysLeft != null && !p.achieved && <div className="xs faint mt-1">{daysLeft >= 0 ? `${daysLeft} days left · due ${fmtDay(g.deadline!)}` : `Overdue since ${fmtDay(g.deadline!)}`}</div>}
              </Card>
            );
          })}
          {!goals.length && <Empty icon={<Target />} title="No goals yet" action={<Button variant="primary" onClick={() => setEditGoal(newGoal())}>Set a goal</Button>}>Strength, bodyweight, body fat, attendance or anything custom — progress updates automatically.</Empty>}
        </div>
      </Section>

      <Section title="Habits this week" action={<button className="section-link" onClick={() => setEditHabit({ id: uid(), clientId: client.id, name: '', icon: 'check', perWeek: 5 })}>+ New habit</button>}>
        <div className="card flush">
          {habits.map((h) => {
            const w = habitWeek(h, data.habitLogs);
            const streak = habitStreak(h.id, data.habitLogs);
            return (
              <div key={h.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <button className="row-between" onClick={() => setEditHabit(h)} style={{ textAlign: 'left' }}>
                  <span className="row" style={{ gap: 12 }}>
                    <span className="icon-tile"><NamedIcon name={h.icon} size={20} /></span>
                    <span className="bold">{h.name}</span>
                  </span>
                  <span className="small faint">
                    {w.done}/{w.target} this week{streak > 1 ? ` · ${streak}-day streak` : ''}
                  </span>
                </button>
                <div className="grid-4" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                  {week.map((d) => {
                    const done = data.habitLogs.some((l) => l.habitId === h.id && l.date === d);
                    const future = d > t;
                    return (
                      <button
                        key={d}
                        disabled={future}
                        onClick={() => actions().toggleHabit(h.id, d)}
                        aria-label={`${h.name} ${fmtDay(d)}${done ? ' done' : ''}`}
                        style={{
                          height: 40,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: fs(11),
                          fontWeight: 700,
                          color: done ? 'var(--accent-ink)' : d === t ? 'var(--text)' : 'var(--text-3)',
                          background: done ? 'var(--accent)' : 'var(--surface-2)',
                          boxShadow: d === t && !done ? 'inset 0 0 0 1px var(--border-strong)' : 'none',
                          opacity: future ? 0.35 : 1,
                        }}
                      >
                        {done ? <Check size={16} strokeWidth={3} /> : dowShort(d).slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!habits.length && <Empty icon={<Check />} title="No habits yet">Small daily wins (steps, protein, sleep) drive results between sessions.</Empty>}
        </div>
      </Section>

      <Section title={`Achievements · ${earned}/${badges.length}`}>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge${b.earned ? '' : ' locked'}`} title={b.description}>
              <span className="emo"><NamedIcon name={b.icon} size={24} /></span>
              <span className="badge-title">{b.title}</span>
              <span className="xs faint">{b.earned ? b.description : b.progressLabel}</span>
              {!b.earned && (
                <div style={{ width: '80%' }}>
                  <Progress pct={b.progress} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {editGoal && <GoalSheet goal={editGoal} onClose={() => setEditGoal(null)} />}
      {editHabit && <HabitSheet habit={editHabit} onClose={() => setEditHabit(null)} />}
    </div>
  );
}

const KIND_LABEL: Record<GoalKind, string> = {
  strength: 'Strength (est. 1RM)',
  bodyweight: 'Bodyweight',
  bodyfat: 'Body fat %',
  sessions: 'Sessions attended',
  custom: 'Custom',
};

function GoalSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const units = data.settings.units;
  const exists = data.goals.some((g) => g.id === goal.id);
  const [g, setG] = useState<Goal>(goal);
  const isKg = g.kind === 'strength' || g.kind === 'bodyweight';
  const ui = (v: number) => (isKg ? round(toDisplayWeight(v, units), 1) : v);
  const fromUi = (v: number) => (isKg ? fromDisplayWeight(v, units) : v);
  const liftOptions = data.exercises.filter((e) => e.tracking === 'weight_reps').sort((a, b) => a.name.localeCompare(b.name));

  const setKind = (kind: GoalKind) => {
    let start = 0;
    let unit = 'kg';
    if (kind === 'bodyweight' || kind === 'bodyfat') {
      const key = kind === 'bodyweight' ? 'weightKg' : 'bodyFatPct';
      const m = data.measurements.filter((x) => x.clientId === g.clientId && x[key] != null).sort((a, b) => b.date.localeCompare(a.date))[0];
      start = m?.[key] ?? 0;
      unit = kind === 'bodyfat' ? '%' : 'kg';
    }
    if (kind === 'sessions') unit = 'sessions';
    if (kind === 'custom') unit = '';
    setG({ ...g, kind, startValue: start, unit, exerciseId: kind === 'strength' ? g.exerciseId ?? 'back-squat' : undefined });
  };

  const setLift = (exerciseId: string) => {
    const hist = exerciseHistory(data.sessions, exerciseId, g.clientId);
    const best = Math.max(0, ...hist.map((h) => h.bestE1rm));
    setG({ ...g, exerciseId, startValue: Math.round(best) });
  };

  const save = () => {
    const title = g.title.trim() || autoTitle(g, data.exercises.find((e) => e.id === g.exerciseId)?.name, units);
    const next = { ...g, title };
    const p = goalProgress(next, data);
    if (p.achieved && !next.achievedAt) {
      next.achievedAt = today();
      celebrate();
      toast('Goal achieved!');
    }
    actions().upsert('goals', next);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={exists ? 'Edit goal' : 'New goal'}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => { actions().remove('goals', g.id); onClose(); }}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" block onClick={save} disabled={g.kind === 'custom' && !g.title.trim()}>
            Save goal
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Type">
          <Select value={g.kind} onChange={setKind} options={(Object.keys(KIND_LABEL) as GoalKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </Field>
        {g.kind === 'strength' && (
          <Field label="Exercise">
            <Select value={g.exerciseId ?? ''} onChange={setLift} options={liftOptions.map((e) => ({ value: e.id, label: e.name }))} />
          </Field>
        )}
        <Field label="Title" hint="Leave blank to generate one">
          <TextInput value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder={g.kind === 'custom' ? 'e.g. Run 5 km without stopping' : 'Optional'} />
        </Field>
        {g.kind === 'custom' && (
          <Field label="Unit">
            <TextInput value={g.unit} onChange={(e) => setG({ ...g, unit: e.target.value })} placeholder="e.g. km, push-ups, min" />
          </Field>
        )}
        <div className="grid-2">
          <Field label={`Start${isKg ? ` (${weightUnit(units)})` : g.unit ? ` (${g.unit})` : ''}`}>
            <NumberInput value={ui(g.startValue)} onChange={(v) => setG({ ...g, startValue: fromUi(v ?? 0) })} />
          </Field>
          <Field label={`Target${isKg ? ` (${weightUnit(units)})` : g.unit ? ` (${g.unit})` : ''}`}>
            <NumberInput value={g.targetValue ? ui(g.targetValue) : undefined} onChange={(v) => setG({ ...g, targetValue: fromUi(v ?? 0) })} />
          </Field>
        </div>
        {g.kind === 'custom' && (
          <Field label="Current">
            <NumberInput value={g.currentValue} onChange={(v) => setG({ ...g, currentValue: v })} />
          </Field>
        )}
        <Field label="Deadline (optional)">
          <input className="input" type="date" value={g.deadline ?? ''} onChange={(e) => setG({ ...g, deadline: e.target.value || undefined })} />
        </Field>
        <div className="xs faint">
          {g.kind === 'custom' ? 'Update “current” as the client progresses.' : 'Progress is calculated automatically from logged workouts and measurements.'}
        </div>
      </div>
    </Sheet>
  );
}

function autoTitle(g: Goal, exName: string | undefined, units: 'metric' | 'imperial') {
  switch (g.kind) {
    case 'strength':
      return `${exName ?? 'Lift'} ${fmtWeight(g.targetValue, units)}`;
    case 'bodyweight':
      return `Reach ${fmtWeight(g.targetValue, units)}`;
    case 'bodyfat':
      return `${g.targetValue}% body fat`;
    case 'sessions':
      return `Complete ${g.targetValue} sessions`;
    default:
      return `${g.targetValue} ${g.unit}`;
  }
}

function HabitSheet({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const exists = useStore((s) => s.data.habits.some((h) => h.id === habit.id));
  const [h, setH] = useState(habit);
  return (
    <Sheet
      open
      onClose={onClose}
      title={exists ? 'Edit habit' : 'New habit'}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => { actions().remove('habits', h.id); onClose(); }}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" block disabled={!h.name.trim()} onClick={() => { actions().upsert('habits', { ...h, name: h.name.trim() }); onClose(); }}>
            Save habit
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Habit">
          <TextInput value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} placeholder="e.g. 10,000 steps" autoFocus />
        </Field>
        <Field label="Icon">
          <div className="row wrap" style={{ gap: 6 }}>
            {HABIT_ICON_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={k}
                aria-pressed={h.icon === k}
                onClick={() => setH({ ...h, icon: k })}
                style={{ width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', background: h.icon === k ? 'var(--md-primary)' : 'var(--md-surface-high)', color: h.icon === k ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)' }}
              >
                <NamedIcon name={k} size={22} />
              </button>
            ))}
          </div>
        </Field>
        <div className="row-between">
          <span className="label">Target days per week</span>
          <Stepper value={h.perWeek} onChange={(v) => setH({ ...h, perWeek: v })} min={1} max={7} />
        </div>
      </div>
    </Sheet>
  );
}

