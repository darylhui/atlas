import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarPlus, ClipboardList, Dumbbell, Plus, Repeat, Salad, UserPlus } from 'lucide-react';
import { actions, useData } from '../lib/store';
import type { Client, Exercise, ExerciseCategory, ID, MuscleGroup } from '../lib/types';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/seed/exercises';
import { completed } from '../lib/analytics/strength';
import { relativeDay } from '../lib/util';
import { Avatar, Button, Chips, Empty, ListItem, SearchInput, Sheet } from './ui';

export function ClientPicker({ open, onClose, onPick, title = 'Choose client' }: { open: boolean; onClose: () => void; onPick: (c: Client) => void; title?: string }) {
  const clients = useData((d) => d.clients);
  const [q, setQ] = useState('');
  const list = clients.filter((c) => c.status !== 'archived' && c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="stack">
        {clients.length > 6 && <SearchInput value={q} onChange={setQ} placeholder="Search clients" />}
        <div className="card flush">
          {list.map((c) => (
            <ListItem key={c.id} icon={<Avatar name={c.name} color={c.color} size={36} />} title={c.name} subtitle={c.tags.join(' · ')} onClick={() => onPick(c)} />
          ))}
          {!list.length && <Empty icon={<UserPlus />} title="No clients yet" />}
        </div>
      </div>
    </Sheet>
  );
}

/** Choose how to start a workout: from a template, repeat the last session, or blank. */
export function StartWorkoutSheet({ clientId, open, onClose }: { clientId?: ID; open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const templates = useData((d) => d.templates);
  const sessions = useData((d) => d.sessions);
  const clients = useData((d) => d.clients);
  const [picked, setPicked] = useState<ID | undefined>(clientId);
  const cid = clientId ?? picked;
  const client = clients.find((c) => c.id === cid);
  const recent = useMemo(() => (cid ? completed(sessions, cid).slice(-3).reverse() : []), [sessions, cid]);

  const go = (opts: Parameters<ReturnType<typeof actions>['startSession']>[1]) => {
    if (!cid) return;
    const id = actions().startSession(cid, opts);
    onClose();
    nav(`/workout/${id}`);
  };

  if (!cid)
    return (
      <ClientPicker
        open={open}
        onClose={onClose}
        title="Start workout for…"
        onPick={(c) => setPicked(c.id)}
      />
    );

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!clientId) setPicked(undefined);
        onClose();
      }}
      title={client ? `Workout · ${client.name}` : 'Start workout'}
    >
      <div className="stack">
        <Button variant="primary" block onClick={() => go({})}>
          <Plus size={18} /> Empty workout
        </Button>
        {recent.length > 0 && (
          <>
            <div className="label mt-1">Repeat a recent session</div>
            <div className="card flush">
              {recent.map((s) => (
                <ListItem
                  key={s.id}
                  icon={<Repeat size={18} className="faint" />}
                  title={s.name}
                  subtitle={`${relativeDay(s.date)} · ${s.exercises.length} exercises`}
                  onClick={() => go({ repeatSessionId: s.id })}
                />
              ))}
            </div>
          </>
        )}
        <div className="label mt-1">From a template</div>
        <div className="card flush">
          {templates.map((t) => (
            <ListItem
              key={t.id}
              icon={<ClipboardList size={18} className="faint" />}
              title={t.name}
              subtitle={`${t.focus ? t.focus + ' · ' : ''}${t.exercises.length} exercises`}
              onClick={() => go({ templateId: t.id })}
            />
          ))}
        </div>
      </div>
    </Sheet>
  );
}

export function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [mode, setMode] = useState<null | 'workout' | 'checkin' | 'food'>(null);
  const close = () => {
    setMode(null);
    onClose();
  };
  const items = [
    { icon: Dumbbell, label: 'Start workout', sub: 'Log sets live with rest timer', on: () => setMode('workout') },
    { icon: Activity, label: 'Readiness check-in', sub: 'Sleep, stress, soreness, HRV', on: () => setMode('checkin') },
    { icon: Salad, label: 'Log nutrition', sub: 'Meals, macros and water', on: () => setMode('food') },
    { icon: CalendarPlus, label: 'Book a session', sub: 'Add to your schedule', on: () => { close(); nav('/schedule?new=1'); } },
    { icon: UserPlus, label: 'New client', sub: 'Profile, goals & health screen', on: () => { close(); nav('/clients/new'); } },
  ];
  return (
    <>
      <Sheet open={open && mode === null} onClose={close} title="Quick add">
        <div className="card flush">
          {items.map((i) => (
            <ListItem
              key={i.label}
              icon={
                <div className="quick-icon">
                  <i.icon size={20} />
                </div>
              }
              title={i.label}
              subtitle={i.sub}
              onClick={i.on}
            />
          ))}
        </div>
      </Sheet>
      {open && mode === 'workout' && <StartWorkoutSheet open onClose={close} />}
      <ClientPicker
        open={open && mode === 'checkin'}
        onClose={close}
        title="Check-in for…"
        onPick={(c) => {
          close();
          nav(`/clients/${c.id}/check-in`);
        }}
      />
      <ClientPicker
        open={open && mode === 'food'}
        onClose={close}
        title="Log nutrition for…"
        onPick={(c) => {
          close();
          nav(`/clients/${c.id}?tab=nutrition&add=1`);
        }}
      />
    </>
  );
}

const MUSCLE_FILTERS: (MuscleGroup | 'all')[] = ['all', 'chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core', 'calves', 'full_body', 'cardio'];

export function useExerciseFilter(exercises: Exercise[]) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [cat, setCat] = useState<ExerciseCategory | 'all'>('all');
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return exercises
      .filter((e) => (muscle === 'all' || e.primary === muscle || e.secondary.includes(muscle)) && (cat === 'all' || e.category === cat))
      .filter((e) => !ql || e.name.toLowerCase().includes(ql) || EQUIPMENT_LABEL[e.equipment].toLowerCase().includes(ql))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, q, muscle, cat]);
  return { q, setQ, muscle, setMuscle, cat, setCat, list };
}

export function ExerciseFilters({ f }: { f: ReturnType<typeof useExerciseFilter> }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      <SearchInput value={f.q} onChange={f.setQ} placeholder="Search exercises" />
      <Chips
        value={f.cat}
        onChange={f.setCat}
        options={[{ value: 'all', label: 'All types' }, ...(Object.keys(CATEGORY_LABEL) as ExerciseCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]}
      />
      <Chips value={f.muscle} onChange={f.setMuscle} options={MUSCLE_FILTERS.map((m) => ({ value: m, label: m === 'all' ? 'All muscles' : MUSCLE_LABEL[m] }))} />
    </div>
  );
}

export function ExercisePicker({ open, onClose, onPick, multi }: { open: boolean; onClose: () => void; onPick: (ids: ID[]) => void; multi?: boolean }) {
  const exercises = useData((d) => d.exercises);
  const f = useExerciseFilter(exercises);
  const [sel, setSel] = useState<ID[]>([]);
  const done = () => {
    onPick(sel);
    setSel([]);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={() => {
        setSel([]);
        onClose();
      }}
      title="Add exercise"
      footer={
        multi && sel.length > 0 ? (
          <Button variant="primary" block onClick={done}>
            Add {sel.length} exercise{sel.length > 1 ? 's' : ''}
          </Button>
        ) : undefined
      }
    >
      <div className="stack">
        <ExerciseFilters f={f} />
        <div className="card flush">
          {f.list.map((e) => {
            const on = sel.includes(e.id);
            return (
              <ListItem
                key={e.id}
                title={e.name}
                subtitle={`${MUSCLE_LABEL[e.primary]} · ${EQUIPMENT_LABEL[e.equipment]}`}
                chevron={false}
                right={multi ? <span className={`set-check${on ? ' on' : ''}`} style={{ width: 30, height: 30 }}>{on ? '✓' : ''}</span> : undefined}
                onClick={() => {
                  if (!multi) {
                    onPick([e.id]);
                    onClose();
                  } else setSel((s) => (on ? s.filter((x) => x !== e.id) : [...s, e.id]));
                }}
              />
            );
          })}
          {!f.list.length && <Empty icon={<Dumbbell />} title="No matches">Try another search, or create a custom exercise in the Library.</Empty>}
        </div>
      </div>
    </Sheet>
  );
}
