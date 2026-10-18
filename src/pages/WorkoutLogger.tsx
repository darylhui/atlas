import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Bandage, Check, ChevronLeft, Clock, Ellipsis, Info, Plus, Repeat, StickyNote, Timer, Trash2, TriangleAlert, X } from 'lucide-react';
import { actions, activePackage, useStore } from '../lib/store';
import type { Exercise, SetType, Units, WorkoutExercise, WorkoutSession, WorkoutSet } from '../lib/types';
import { bestsByExercise, completed, e1rm, isSetPR, lastPerformance, sessionPRs, type Bests } from '../lib/analytics/strength';
import { latestCheckIn, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/seed/exercises';
import { firstName, fmtDuration, fmtNum, fmtWeight, fromDisplayWeight, round, today, toDisplayWeight, uid, weightUnit } from '../lib/util';
import { beep, requestWakeLock, unlockAudio } from '../lib/sound';
import { Avatar, Button, Card, confirmDialog, Empty, Field, IconButton, ListItem, NumberInput, Sheet, Stepper, toast, Toggle, useNow, ZonePill } from '../components/ui';
import { ExercisePicker } from '../components/sheets';
import { PlateCalculator } from './Tools';
import { celebrate } from '../components/Confetti';

const TYPE_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
const TYPE_LABEL: Record<SetType, string> = { normal: 'Working set', warmup: 'Warm-up', drop: 'Drop set', failure: 'To failure' };

export const RPE_SCALE: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Somewhat hard',
  5: 'Hard',
  6: 'Hard+',
  7: 'Very hard',
  8: 'Very hard+',
  9: 'Near max',
  10: 'Maximal',
};

function parseTargetReps(target?: string): number | undefined {
  const m = target?.match(/^(\d+)/);
  return m ? Number(m[1]) : undefined;
}

export default function WorkoutLogger() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const session = useStore((s) => s.data.sessions.find((x) => x.id === id));
  const sessions = useStore((s) => s.data.sessions);
  const exercises = useStore((s) => s.data.exercises);
  const settings = useStore((s) => s.data.settings);
  const client = useStore((s) => s.data.clients.find((c) => c.id === session?.clientId));
  const checkIns = useStore((s) => s.data.checkIns);
  const packages = useStore((s) => s.data.packages);
  const [picker, setPicker] = useState<'add' | { replace: string } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [menuFor, setMenuFor] = useState<WorkoutExercise>();
  const [infoFor, setInfoFor] = useState<Exercise>();
  const [setMenu, setSetMenu] = useState<{ exId: string; set: WorkoutSet; index: number }>();
  const [plates, setPlates] = useState<number | null>(null);
  const finishedHere = useRef(false);
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const bests = useMemo(() => (session ? bestsByExercise(completed(sessions, session.clientId)) : new Map<string, Bests>()), [sessions, session]);

  useEffect(() => {
    let release: (() => void) | undefined;
    void requestWakeLock().then((r) => (release = r));
    return () => release?.();
  }, []);

  const update = useCallback((fn: (s: WorkoutSession) => WorkoutSession) => actions().updateSession(id, fn), [id]);

  if (!session || !client)
    return (
      <div className="main no-tabs">
        <Empty icon={<X />} title="Workout not found" action={<Button onClick={() => nav('/')}>Home</Button>} />
      </div>
    );

  if (session.status === 'completed') return finishedHere.current ? null : <Navigate to={`/sessions/${session.id}`} replace />;

  const ci = latestCheckIn(checkIns, client.id);
  const readyScore = ci && ci.date === today() ? readinessFor(checkIns, ci) : undefined;
  const ready = readyScore != null ? readinessZone(readyScore) : undefined;

  const patchEx = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) => update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));
  const patchSet = (exId: string, setId: string, p: Partial<WorkoutSet>) => patchEx(exId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...p } : x)) }));

  const addExercises = (ids: string[]) => {
    update((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        ...ids.map((exerciseId) => {
          const prev = lastPerformance(sessions, client.id, exerciseId);
          return {
            id: uid(),
            exerciseId,
            restSec: settings.defaultRestSec,
            sets: Array.from({ length: Math.max(3, prev?.filter((x) => x.type !== 'warmup').length ?? 3) }, () => ({ id: uid(), type: 'normal' as const, done: false })),
          };
        }),
      ],
    }));
  };

  const completeSet = (ex: WorkoutExercise, set: WorkoutSet, placeholder: Partial<WorkoutSet>) => {
    unlockAudio();
    if (set.done) {
      patchSet(ex.id, set.id, { done: false });
      return;
    }
    const def = exMap.get(ex.exerciseId);
    const filled: Partial<WorkoutSet> = { done: true };
    if (def?.tracking === 'weight_reps' || def?.tracking === 'reps') {
      filled.reps = set.reps ?? placeholder.reps;
      if (!filled.reps) return toast('Enter reps first');
    }
    if (def?.tracking === 'weight_reps') filled.weight = set.weight ?? placeholder.weight ?? 0;
    if (def?.tracking === 'time' || def?.tracking === 'distance_time') {
      filled.durationSec = set.durationSec ?? placeholder.durationSec;
      if (!filled.durationSec) return toast('Enter a time first');
    }
    if (def?.tracking === 'distance_time') filled.distanceM = set.distanceM ?? placeholder.distanceM;
    patchSet(ex.id, set.id, filled);
    const merged = { ...set, ...filled } as WorkoutSet;
    if (isSetPR(merged, bests.get(ex.exerciseId))) {
      toast(`New PR — ${def?.name} ${fmtWeight(merged.weight, settings.units)} × ${merged.reps}`);
    }
    const secs = ex.restSec ?? settings.defaultRestSec;
    if (secs > 0) setRest({ until: Date.now() + secs * 1000, total: secs });
  };

  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <div className="main no-tabs" style={{ paddingLeft: 'calc(16px + var(--safe-left))', maxWidth: 820 }}>
      <header className="page-head compact">
        <div className="page-head-row">
          <IconButton label="Back" className="plain" onClick={() => nav(-1)}>
            <ChevronLeft size={24} />
          </IconButton>
          <Avatar name={client.name} color={client.color} size={34} />
          <div className="grow">
            <input
              className="input"
              aria-label="Workout name"
              value={session.name}
              onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
              style={{ minHeight: 30, padding: '2px 6px', margin: '0 -6px', background: 'transparent', border: 0, boxShadow: 'none', borderRadius: 4, fontWeight: 500, fontSize: 18 }}
            />
            <div className="xs faint row" style={{ gap: 6 }}>
              {firstName(client.name)} · <Elapsed start={session.startedAt} /> · {doneSets}/{totalSets} sets
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setFinishing(true)}>
            Finish
          </Button>
        </div>
      </header>

      <div className="stack mt-1" style={{ paddingBottom: rest ? 90 : 0 }}>
        {ready && ready.zone !== 'good' && (
          <div className={`banner${ready.zone === 'critical' ? ' danger' : ''}`}>
            <TriangleAlert size={20} />
            <div>
              <b>Readiness {readyScore} · {ready.label}.</b> <span className="muted">{ready.advice}</span>
            </div>
          </div>
        )}
        {client.injuries && (
          <div className="banner info">
            <Bandage size={20} />
            <span className="small">{client.injuries}</span>
          </div>
        )}

        {session.exercises.map((ex, i) => {
          const def = exMap.get(ex.exerciseId);
          if (!def) return null;
          return (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              def={def}
              index={i}
              units={settings.units}
              prev={lastPerformance(sessions, client.id, ex.exerciseId, session.id)}
              bests={bests.get(ex.exerciseId)}
              onPatchSet={patchSet}
              onComplete={completeSet}
              onAddSet={() =>
                patchEx(ex.id, (e) => {
                  const last = e.sets[e.sets.length - 1];
                  return { ...e, sets: [...e.sets, { id: uid(), type: 'normal', done: false, weight: last?.weight, reps: last?.reps, durationSec: last?.durationSec, distanceM: last?.distanceM }] };
                })
              }
              onMenu={() => setMenuFor(ex)}
              onInfo={() => setInfoFor(def)}
              onSetMenu={(set, index) => setSetMenu({ exId: ex.id, set, index })}
            />
          );
        })}

        {!session.exercises.length && (
          <Card>
            <Empty icon={<Plus />} title="Empty workout">
              Add exercises to start logging. Previous numbers appear automatically.
            </Empty>
          </Card>
        )}

        <Button block onClick={() => setPicker('add')}>
          <Plus size={18} /> Add exercise
        </Button>
        <Button
          variant="ghost"
          block
          onClick={async () => {
            if (await confirmDialog({ title: 'Discard this workout?', body: 'All logged sets will be deleted.', confirm: 'Discard', danger: true })) {
              actions().remove('sessions', session.id);
              nav(`/clients/${client.id}`, { replace: true });
            }
          }}
          style={{ color: 'var(--md-error)' }}
        >
          Discard workout
        </Button>
      </div>

      {rest && <RestTimer rest={rest} onChange={setRest} />}

      <ExercisePicker
        open={picker != null}
        multi={picker === 'add'}
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker === 'add') addExercises(ids);
          else if (picker && ids[0]) patchEx(picker.replace, (e) => ({ ...e, exerciseId: ids[0] }));
        }}
      />

      {menuFor && (
        <ExerciseMenu
          ex={menuFor}
          def={exMap.get(menuFor.exerciseId)!}
          onClose={() => setMenuFor(undefined)}
          onPatch={(p) => patchEx(menuFor.id, (e) => ({ ...e, ...p }))}
          onMove={(dir) =>
            update((s) => {
              const list = [...s.exercises];
              const i = list.findIndex((e) => e.id === menuFor.id);
              const j = i + dir;
              if (j < 0 || j >= list.length) return s;
              [list[i], list[j]] = [list[j], list[i]];
              return { ...s, exercises: list };
            })
          }
          onRemove={() => update((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== menuFor.id) }))}
          onReplace={() => setPicker({ replace: menuFor.id })}
          onPlates={() => {
            const top = Math.max(0, ...menuFor.sets.map((x) => x.weight ?? 0));
            setPlates(top || 60);
          }}
        />
      )}

      {setMenu && (
        <Sheet open onClose={() => setSetMenu(undefined)} title={`Set ${setMenu.index + 1}`}>
          <div className="card flush">
            {TYPE_CYCLE.map((t) => (
              <ListItem
                key={t}
                title={TYPE_LABEL[t]}
                chevron={false}
                right={setMenu.set.type === t ? <Check size={18} color="var(--accent)" /> : undefined}
                onClick={() => {
                  patchSet(setMenu.exId, setMenu.set.id, { type: t });
                  setSetMenu(undefined);
                }}
              />
            ))}
          </div>
          <Button
            variant="danger"
            block
            className="mt-2"
            onClick={() => {
              patchEx(setMenu.exId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setMenu.set.id) }));
              setSetMenu(undefined);
            }}
          >
            <Trash2 size={18} /> Delete set
          </Button>
        </Sheet>
      )}

      {infoFor && (
        <Sheet open onClose={() => setInfoFor(undefined)} title={infoFor.name}>
          <div className="stack">
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="pill accent">{MUSCLE_LABEL[infoFor.primary]}</span>
              {infoFor.secondary.map((m) => (
                <span className="pill" key={m}>
                  {MUSCLE_LABEL[m]}
                </span>
              ))}
              <span className="pill">{EQUIPMENT_LABEL[infoFor.equipment]}</span>
            </div>
            {infoFor.cues ? <p>{infoFor.cues}</p> : <p className="muted">No coaching cues saved. Add some in the Library.</p>}
            {bests.get(infoFor.id) && (
              <Card className="grid-2">
                <div>
                  <div className="xs faint">Best est. 1RM</div>
                  <div className="bold">{fmtWeight(bests.get(infoFor.id)!.e1rm, settings.units)}</div>
                </div>
                <div>
                  <div className="xs faint">Heaviest set</div>
                  <div className="bold">{fmtWeight(bests.get(infoFor.id)!.weight, settings.units)}</div>
                </div>
              </Card>
            )}
            {infoFor.videoUrl && (
              <a className="btn btn-secondary btn-block" href={infoFor.videoUrl} target="_blank" rel="noreferrer">
                Watch demo video
              </a>
            )}
          </div>
        </Sheet>
      )}

      {plates != null && (
        <Sheet open onClose={() => setPlates(null)} title="Plate calculator">
          <PlateCalculator initialKg={plates} />
        </Sheet>
      )}

      {finishing && (
        <FinishSheet
          session={session}
          hasPackage={!!activePackage(packages, client.id)}
          units={settings.units}
          autoDeduct={settings.autoDeductPackage}
          onClose={() => setFinishing(false)}
          onFinish={(opts) => {
            finishedHere.current = true;
            actions().finishSession(session.id, opts);
            const after = useStore.getState().data.sessions;
            const done = after.find((s) => s.id === session.id)!;
            const prs = sessionPRs(done, after);
            if (prs.length) celebrate();
            nav(`/sessions/${session.id}?done=1`, { replace: true });
          }}
        />
      )}
    </div>
  );
}

function Elapsed({ start }: { start: string }) {
  const now = useNow(1000);
  return (
    <span className="tabular row" style={{ gap: 3 }}>
      <Clock size={11} />
      {fmtDuration((now - Date.parse(start)) / 1000)}
    </span>
  );
}

function RestTimer({ rest, onChange }: { rest: { until: number; total: number }; onChange: (r: { until: number; total: number } | null) => void }) {
  const now = useNow(250);
  const left = Math.max(0, (rest.until - now) / 1000);
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [rest.until]);
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      beep();
      const t = setTimeout(() => onChange(null), 2500);
      return () => clearTimeout(t);
    }
  }, [left, onChange]);
  return (
    <div className="rest-bar" role="timer" aria-live="off">
      <Timer size={20} color="var(--accent)" />
      <div className="rest-time">{left > 0 ? fmtDuration(Math.ceil(left)) : 'Go!'}</div>
      <div className="grow small muted">Rest</div>
      <Button size="sm" onClick={() => onChange({ until: rest.until - 15000, total: rest.total })}>
        −15
      </Button>
      <Button size="sm" onClick={() => onChange({ until: Math.max(rest.until, Date.now()) + 15000, total: rest.total + 15 })}>
        +15
      </Button>
      <IconButton label="Skip rest" onClick={() => onChange(null)}>
        <X size={18} />
      </IconButton>
      <div className="rest-progress" style={{ width: `${(1 - left / rest.total) * 100}%` }} />
    </div>
  );
}

interface CardProps {
  ex: WorkoutExercise;
  def: Exercise;
  index: number;
  units: Units;
  prev?: WorkoutSet[];
  bests?: Bests;
  onPatchSet: (exId: string, setId: string, p: Partial<WorkoutSet>) => void;
  onComplete: (ex: WorkoutExercise, set: WorkoutSet, placeholder: Partial<WorkoutSet>) => void;
  onAddSet: () => void;
  onMenu: () => void;
  onInfo: () => void;
  onSetMenu: (set: WorkoutSet, index: number) => void;
}

const ExerciseCard = memo(function ExerciseCard({ ex, def, units, prev, bests, onPatchSet, onComplete, onAddSet, onMenu, onInfo, onSetMenu }: CardProps) {
  const wu = weightUnit(units);
  const prevWorking = prev?.filter((s) => s.type !== 'warmup');
  const fmtPrev = (s?: WorkoutSet) => {
    if (!s) return '—';
    switch (def.tracking) {
      case 'weight_reps':
        return `${fmtNum(toDisplayWeight(s.weight ?? 0, units))}×${s.reps ?? 0}`;
      case 'reps':
        return `${s.reps ?? 0} reps`;
      case 'time':
        return fmtDuration(s.durationSec ?? 0);
      default:
        return `${s.distanceM ?? 0}m ${fmtDuration(s.durationSec ?? 0)}`;
    }
  };
  const grid = def.tracking === 'weight_reps' ? '' : def.tracking === 'reps' ? ' cols-reps' : def.tracking === 'time' ? ' cols-time' : ' cols-dist';
  const targetReps = parseTargetReps(ex.target);
  let workingIdx = 0;

  return (
    <div className="ex-card">
      <div className="ex-head">
        <button className="grow" style={{ textAlign: 'left' }} onClick={onInfo}>
          <div className="ex-name">{def.name}</div>
          <div className="xs faint">
            {MUSCLE_LABEL[def.primary]}
            {ex.target ? ` · target ${ex.sets.length} × ${ex.target}` : ''}
            {ex.restSec ? ` · rest ${fmtDuration(ex.restSec)}` : ''}
            {bests?.e1rm ? ` · best e1RM ${fmtNum(toDisplayWeight(bests.e1rm, units))}` : ''}
          </div>
        </button>
        <IconButton label="Exercise info" className="plain" onClick={onInfo}>
          <Info size={18} />
        </IconButton>
        <IconButton label="Exercise options" className="plain" onClick={onMenu}>
          <Ellipsis size={20} />
        </IconButton>
      </div>
      {ex.notes && (
        <div className="small row" style={{ padding: '0 16px 8px', gap: 6, color: 'var(--warning)' }}>
          <StickyNote size={14} style={{ flex: 'none' }} /> {ex.notes}
        </div>
      )}
      <div className={`set-grid set-head${grid}`}>
        <span className="center">Set</span>
        <span>Previous</span>
        {def.tracking === 'weight_reps' && (
          <>
            <span className="center">{wu}</span>
            <span className="center">Reps</span>
            <span className="center">RPE</span>
          </>
        )}
        {def.tracking === 'reps' && (
          <>
            <span className="center">Reps</span>
            <span className="center">RPE</span>
          </>
        )}
        {def.tracking === 'time' && (
          <>
            <span className="center">Seconds</span>
            <span className="center">RPE</span>
          </>
        )}
        {def.tracking === 'distance_time' && (
          <>
            <span className="center">Metres</span>
            <span className="center">Seconds</span>
          </>
        )}
        <span />
      </div>
      {ex.sets.map((set, i) => {
        const p = set.type === 'warmup' ? undefined : prevWorking?.[workingIdx] ?? prevWorking?.[prevWorking.length - 1];
        if (set.type !== 'warmup') workingIdx++;
        const earlier = ex.sets[i - 1];
        const placeholder: Partial<WorkoutSet> = {
          weight: p?.weight ?? earlier?.weight,
          reps: p?.reps ?? earlier?.reps ?? targetReps,
          durationSec: p?.durationSec ?? earlier?.durationSec,
          distanceM: p?.distanceM ?? earlier?.distanceM,
        };
        const pr = set.done && isSetPR(set, bests);
        const dispW = (kg?: number) => (kg == null ? undefined : round(toDisplayWeight(kg, units), 2));
        return (
          <div key={set.id} className={`set-grid set-row${set.done ? ' done' : ''}${grid}`}>
            <button className={`set-num ${set.type}`} onClick={() => onSetMenu(set, i)} aria-label={`Set ${i + 1} options`}>
              {set.type === 'warmup' ? 'W' : set.type === 'drop' ? 'D' : set.type === 'failure' ? 'F' : i + 1}
            </button>
            <span className="set-prev">
              {fmtPrev(p)}
              {pr && <span className="pr-flag">PR</span>}
            </span>
            {def.tracking === 'weight_reps' && (
              <>
                <NumberInput className="set-input" aria-label="Weight" value={dispW(set.weight)} placeholder={placeholder.weight != null ? fmtNum(toDisplayWeight(placeholder.weight, units)) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { weight: v == null ? undefined : fromDisplayWeight(v, units) })} />
                <NumberInput className="set-input" aria-label="Reps" decimal={false} value={set.reps} placeholder={placeholder.reps != null ? String(placeholder.reps) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { reps: v })} />
                <NumberInput className="set-input" aria-label="RPE" value={set.rpe} placeholder="–" onChange={(v) => onPatchSet(ex.id, set.id, { rpe: v == null ? undefined : Math.min(10, v) })} />
              </>
            )}
            {def.tracking === 'reps' && (
              <>
                <NumberInput className="set-input" aria-label="Reps" decimal={false} value={set.reps} placeholder={placeholder.reps != null ? String(placeholder.reps) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { reps: v })} />
                <NumberInput className="set-input" aria-label="RPE" value={set.rpe} placeholder="–" onChange={(v) => onPatchSet(ex.id, set.id, { rpe: v == null ? undefined : Math.min(10, v) })} />
              </>
            )}
            {def.tracking === 'time' && (
              <>
                <NumberInput className="set-input" aria-label="Seconds" decimal={false} value={set.durationSec} placeholder={placeholder.durationSec != null ? String(placeholder.durationSec) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { durationSec: v })} />
                <NumberInput className="set-input" aria-label="RPE" value={set.rpe} placeholder="–" onChange={(v) => onPatchSet(ex.id, set.id, { rpe: v == null ? undefined : Math.min(10, v) })} />
              </>
            )}
            {def.tracking === 'distance_time' && (
              <>
                <NumberInput className="set-input" aria-label="Metres" decimal={false} value={set.distanceM} placeholder={placeholder.distanceM != null ? String(placeholder.distanceM) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { distanceM: v })} />
                <NumberInput className="set-input" aria-label="Seconds" decimal={false} value={set.durationSec} placeholder={placeholder.durationSec != null ? String(placeholder.durationSec) : '–'} onChange={(v) => onPatchSet(ex.id, set.id, { durationSec: v })} />
              </>
            )}
            <button className={`set-check${set.done ? ' on' : ''}`} aria-label={set.done ? 'Mark set not done' : 'Complete set'} onClick={() => onComplete(ex, set, placeholder)}>
              <Check size={20} strokeWidth={3} />
            </button>
          </div>
        );
      })}
      <div style={{ padding: '6px 12px 12px' }}>
        <Button size="sm" block onClick={onAddSet}>
          <Plus size={16} /> Add set
        </Button>
      </div>
    </div>
  );
});

function ExerciseMenu({
  ex,
  def,
  onClose,
  onPatch,
  onMove,
  onRemove,
  onReplace,
  onPlates,
}: {
  ex: WorkoutExercise;
  def: Exercise;
  onClose: () => void;
  onPatch: (p: Partial<WorkoutExercise>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onReplace: () => void;
  onPlates: () => void;
}) {
  const [notes, setNotes] = useState(ex.notes ?? '');
  const [rest, setRest] = useState(ex.restSec ?? 90);
  return (
    <Sheet open onClose={() => { onPatch({ notes: notes.trim() || undefined, restSec: rest }); onClose(); }} title={def.name}>
      <div className="stack">
        <Field label="Notes for this exercise">
          <div className="row">
            <StickyNote size={18} className="faint" />
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Seat 4, pause at the bottom" />
          </div>
        </Field>
        <div className="row-between">
          <span className="label">Rest timer</span>
          <Stepper value={rest} onChange={setRest} step={15} min={0} max={600} format={(v) => fmtDuration(v)} />
        </div>
        <div className="card flush">
          <ListItem icon={<ArrowUp size={18} />} title="Move up" chevron={false} onClick={() => { onMove(-1); onClose(); }} />
          <ListItem icon={<ArrowDown size={18} />} title="Move down" chevron={false} onClick={() => { onMove(1); onClose(); }} />
          <ListItem icon={<Repeat size={18} />} title="Replace exercise" onClick={() => { onClose(); onReplace(); }} />
          {def.equipment === 'barbell' && <ListItem icon={<Info size={18} />} title="Plate calculator" onClick={() => { onClose(); onPlates(); }} />}
          <ListItem icon={<Trash2 size={18} />} title="Remove exercise" chevron={false} onClick={() => { onRemove(); onClose(); }} />
        </div>
        <Button variant="primary" block onClick={() => { onPatch({ notes: notes.trim() || undefined, restSec: rest }); onClose(); }}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}

function FinishSheet({
  session,
  hasPackage,
  units,
  autoDeduct,
  onClose,
  onFinish,
}: {
  session: WorkoutSession;
  hasPackage: boolean;
  units: Units;
  autoDeduct: boolean;
  onClose: () => void;
  onFinish: (o: { sessionRpe?: number; notes?: string; deduct: boolean }) => void;
}) {
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [deduct, setDeduct] = useState(hasPackage && autoDeduct);
  const done = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const undone = session.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);
  const vol = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done && s.type !== 'warmup').reduce((b, s) => b + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);
  const top = session.exercises.flatMap((e) => e.sets).filter((s) => s.done).reduce((a, s) => Math.max(a, e1rm(s.weight ?? 0, s.reps ?? 0)), 0);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Finish workout"
      footer={
        <Button variant="primary" block disabled={!done} onClick={() => onFinish({ sessionRpe: rpe, notes: notes.trim() || undefined, deduct })}>
          Save workout
        </Button>
      }
    >
      <div className="stack">
        <div className="grid-3 center">
          <div>
            <div className="stat-value">{done}</div>
            <div className="xs faint">sets done</div>
          </div>
          <div>
            <div className="stat-value">{Math.round(toDisplayWeight(vol, units)).toLocaleString()}</div>
            <div className="xs faint">{weightUnit(units)} volume</div>
          </div>
          <div>
            <div className="stat-value">
              <Elapsed start={session.startedAt} />
            </div>
            <div className="xs faint">duration</div>
          </div>
        </div>
        {undone > 0 && <div className="banner">{undone} unchecked set{undone > 1 ? 's' : ''} will be discarded.</div>}
        <Card>
          <div className="row-between">
            <div>
              <div className="bold">Session RPE</div>
              <div className="small faint">How hard was the whole session? (Borg CR-10)</div>
            </div>
            <ZonePill zone={rpe >= 9 ? 'critical' : rpe >= 7 ? 'warning' : 'good'}>
              {rpe} · {RPE_SCALE[rpe]}
            </ZonePill>
          </div>
          <input type="range" min={1} max={10} step={1} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} style={{ width: '100%', marginTop: 14, accentColor: 'var(--accent)' }} aria-label="Session RPE" />
          <div className="row-between xs faint">
            <span>1 Easy</span>
            <span>10 Max</span>
          </div>
        </Card>
        <Field label="Session notes">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it go? Anything to change next time?" />
        </Field>
        {hasPackage && (
          <div className="row-between card tight">
            <div>
              <div className="bold">Deduct from package</div>
              <div className="small faint">Uses one session from their active package</div>
            </div>
            <Toggle on={deduct} onChange={setDeduct} label="Deduct from package" />
          </div>
        )}
        {top > 0 && <div className="xs faint center">Top estimated 1RM this session: {fmtWeight(top, units)}</div>}
      </div>
    </Sheet>
  );
}
