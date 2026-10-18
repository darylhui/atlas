import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Dumbbell, Plus, Trash2, X } from 'lucide-react';
import { actions, useStore } from '../lib/store';
import type { TemplateExercise, WorkoutTemplate } from '../lib/types';
import { MUSCLE_LABEL } from '../lib/seed/exercises';
import { fmtDuration, uid } from '../lib/util';
import { ClientPicker, ExercisePicker } from '../components/sheets';
import { Button, confirmDialog, Empty, Field, IconButton, Page, Section, Stepper, TextInput, toast } from '../components/ui';

export default function TemplateEditor() {
  const { id = 'new' } = useParams();
  const nav = useNavigate();
  const existing = useStore((s) => s.data.templates.find((t) => t.id === id));
  const exercises = useStore((s) => s.data.exercises);
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const [t, setT] = useState<WorkoutTemplate>(() => existing ?? { id: uid(), name: '', exercises: [], createdAt: new Date().toISOString() });
  const [picker, setPicker] = useState(false);
  const [assign, setAssign] = useState(false);
  const dirty = JSON.stringify(t) !== JSON.stringify(existing);

  const patchEx = (eid: string, p: Partial<TemplateExercise>) => setT({ ...t, exercises: t.exercises.map((e) => (e.id === eid ? { ...e, ...p } : e)) });
  const move = (i: number, dir: -1 | 1) => {
    const list = [...t.exercises];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setT({ ...t, exercises: list });
  };

  const save = (quiet = false) => {
    if (!t.name.trim()) {
      toast('Give the template a name');
      return false;
    }
    actions().upsert('templates', { ...t, name: t.name.trim() });
    if (!quiet) toast('Template saved');
    if (!existing) nav(`/library/template/${t.id}`, { replace: true });
    return true;
  };

  const totalSets = t.exercises.reduce((a, e) => a + e.sets, 0);
  const estMin = Math.round(t.exercises.reduce((a, e) => a + e.sets * (45 + e.restSec), 0) / 60);

  return (
    <Page title={existing ? 'Edit template' : 'New template'} back="/library" compact actions={<Button variant="primary" size="sm" onClick={() => save()} disabled={!dirty}>Save</Button>}>
      <div className="stack">
        <Field label="Name">
          <TextInput value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="e.g. Lower Body Power" />
        </Field>
        <div className="grid-2">
          <Field label="Focus">
            <TextInput value={t.focus ?? ''} onChange={(e) => setT({ ...t, focus: e.target.value || undefined })} placeholder="Strength, hypertrophy…" />
          </Field>
          <Field label="Estimate">
            <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>
              {totalSets} sets · ~{estMin} min
            </div>
          </Field>
        </div>
        <Field label="Description">
          <TextInput value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value || undefined })} placeholder="Who is it for? Any progression rules?" />
        </Field>
      </div>

      <Section title="Exercises">
        <div className="stack">
          {t.exercises.map((e, i) => {
            const def = exMap.get(e.exerciseId);
            return (
              <div key={e.id} className="card">
                <div className="row-between">
                  <div className="grow">
                    <div className="bold">
                      {i + 1}. {def?.name ?? 'Unknown'}
                    </div>
                    <div className="xs faint">{def ? MUSCLE_LABEL[def.primary] : ''}</div>
                  </div>
                  <IconButton label="Move up" className="plain" onClick={() => move(i, -1)}>
                    <ArrowUp size={18} />
                  </IconButton>
                  <IconButton label="Move down" className="plain" onClick={() => move(i, 1)}>
                    <ArrowDown size={18} />
                  </IconButton>
                  <IconButton label="Remove" className="plain" onClick={() => setT({ ...t, exercises: t.exercises.filter((x) => x.id !== e.id) })}>
                    <X size={18} />
                  </IconButton>
                </div>
                <div className="grid-3 mt-2" style={{ alignItems: 'end' }}>
                  <Field label="Sets">
                    <Stepper value={e.sets} onChange={(v) => patchEx(e.id, { sets: v })} min={1} max={10} />
                  </Field>
                  <Field label="Reps / time">
                    <TextInput value={e.reps} onChange={(x) => patchEx(e.id, { reps: x.target.value })} placeholder="8-10" style={{ textAlign: 'center' }} />
                  </Field>
                  <Field label="Rest">
                    <Stepper value={e.restSec} onChange={(v) => patchEx(e.id, { restSec: v })} step={15} max={600} format={(v) => <span style={{ fontSize: 16 }}>{fmtDuration(v)}</span>} />
                  </Field>
                </div>
                <div className="mt-2">
                  <TextInput value={e.notes ?? ''} onChange={(x) => patchEx(e.id, { notes: x.target.value || undefined })} placeholder="Notes (tempo, setup, regressions)…" />
                </div>
              </div>
            );
          })}
          {!t.exercises.length && <Empty icon={<Dumbbell />} title="No exercises yet" />}
          <Button block onClick={() => setPicker(true)}>
            <Plus size={18} /> Add exercises
          </Button>
        </div>
      </Section>

      {existing && (
        <div className="stack">
          <Button variant="primary" block onClick={() => (dirty ? save(true) && setAssign(true) : setAssign(true))}>
            <Dumbbell size={18} /> Start with a client
          </Button>
          <div className="grid-2">
            <Button
              onClick={() => {
                const copy = { ...t, id: uid(), name: `${t.name} (copy)`, createdAt: new Date().toISOString(), exercises: t.exercises.map((e) => ({ ...e, id: uid() })) };
                actions().upsert('templates', copy);
                nav(`/library/template/${copy.id}`);
                toast('Template duplicated');
              }}
            >
              <Copy size={18} /> Duplicate
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirmDialog({ title: `Delete “${t.name}”?`, confirm: 'Delete', danger: true })) {
                  actions().remove('templates', t.id);
                  nav('/library', { replace: true });
                }
              }}
            >
              <Trash2 size={18} /> Delete
            </Button>
          </div>
        </div>
      )}

      <ExercisePicker
        open={picker}
        multi
        onClose={() => setPicker(false)}
        onPick={(ids) => setT((cur) => ({ ...cur, exercises: [...cur.exercises, ...ids.map((exerciseId) => ({ id: uid(), exerciseId, sets: 3, reps: '8-12', restSec: 90 }))] }))}
      />
      <ClientPicker
        open={assign}
        onClose={() => setAssign(false)}
        title="Start for…"
        onPick={(c) => {
          const sid = actions().startSession(c.id, { templateId: t.id });
          nav(`/workout/${sid}`);
        }}
      />
    </Page>
  );
}
