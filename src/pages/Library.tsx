import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { actions, useStore } from '../lib/store';
import type { Equipment, Exercise, ExerciseCategory, MuscleGroup, TrackingMode } from '../lib/types';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/seed/exercises';
import { uid } from '../lib/util';
import { ExerciseFilters, useExerciseFilter } from '../components/sheets';
import { LessonLibrary } from '../components/classes';
import { Button, Empty, Field, IconButton, ListItem, Page, Segmented, Select, Sheet, TextInput, toast } from '../components/ui';

export const TRACKING_LABEL: Record<TrackingMode, string> = {
  weight_reps: 'Weight × reps',
  reps: 'Reps only',
  time: 'Time',
  distance_time: 'Distance & time',
};

export default function Library() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'exercises' | 'templates' | 'classes') || 'templates';
  const exercises = useStore((s) => s.data.exercises);
  const templates = useStore((s) => s.data.templates);
  const lessons = useStore((s) => s.data.lessons.length);
  const nav = useNavigate();
  const f = useExerciseFilter(exercises);
  const [creating, setCreating] = useState(false);
  const exName = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <Page
      title="Library"
      subtitle={`${templates.length} PT templates · ${lessons} class lessons · ${exercises.length} exercises`}
      actions={
        <IconButton
          label={tab === 'templates' ? 'New template' : tab === 'classes' ? 'New class lesson' : 'New exercise'}
          className="accent"
          onClick={() => (tab === 'templates' ? nav('/library/template/new') : tab === 'classes' ? nav('/classes/lesson/new/edit') : setCreating(true))}
        >
          <Plus size={20} />
        </IconButton>
      }
    >
      <Segmented
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        options={[
          { value: 'templates', label: 'PT templates' },
          { value: 'classes', label: 'Class lessons' },
          { value: 'exercises', label: 'Exercises' },
        ]}
      />

      {tab === 'classes' ? (
        <LessonLibrary />
      ) : tab === 'templates' ? (
        <div className="card flush">
          {templates.map((t) => (
            <ListItem
              key={t.id}
              icon={
                <div className="quick-icon">
                  <ClipboardList size={18} />
                </div>
              }
              title={t.name}
              subtitle={`${t.focus ? `${t.focus} · ` : ''}${t.exercises.map((e) => exName.get(e.exerciseId)).filter(Boolean).slice(0, 3).join(', ')}${t.exercises.length > 3 ? ` +${t.exercises.length - 3}` : ''}`}
              onClick={() => nav(`/library/template/${t.id}`)}
            />
          ))}
          {!templates.length && <Empty icon={<ClipboardList />} title="No templates" action={<Button variant="primary" onClick={() => nav('/library/template/new')}>Create template</Button>} />}
        </div>
      ) : (
        <>
          <ExerciseFilters f={f} />
          <div className="card flush">
            {f.list.map((e) => (
              <ListItem
                key={e.id}
                title={
                  <>
                    {e.name} {e.custom && <span className="pill accent" style={{ marginLeft: 4 }}>Custom</span>}
                  </>
                }
                subtitle={`${MUSCLE_LABEL[e.primary]} · ${EQUIPMENT_LABEL[e.equipment]} · ${CATEGORY_LABEL[e.category]}`}
                onClick={() => nav(`/library/exercise/${e.id}`)}
              />
            ))}
          </div>
        </>
      )}

      {creating && <ExerciseSheet onClose={() => setCreating(false)} />}
    </Page>
  );
}

export function ExerciseSheet({ exercise, onClose }: { exercise?: Exercise; onClose: () => void }) {
  const [e, setE] = useState<Exercise>(
    exercise ?? { id: uid(), name: '', category: 'strength', primary: 'chest', secondary: [], equipment: 'dumbbell', tracking: 'weight_reps', custom: true },
  );
  const muscles = Object.keys(MUSCLE_LABEL) as MuscleGroup[];
  const save = () => {
    if (!e.name.trim()) return toast('Name is required');
    actions().upsert('exercises', { ...e, name: e.name.trim() });
    toast(exercise ? 'Exercise updated' : 'Exercise added');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={exercise ? 'Edit exercise' : 'New exercise'} footer={<Button variant="primary" block onClick={save}>Save</Button>}>
      <div className="stack">
        <Field label="Name">
          <TextInput value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} placeholder="e.g. Landmine Row" autoFocus={!exercise} />
        </Field>
        <div className="grid-2">
          <Field label="Category">
            <Select value={e.category} onChange={(v) => setE({ ...e, category: v })} options={(Object.keys(CATEGORY_LABEL) as ExerciseCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] }))} />
          </Field>
          <Field label="Equipment">
            <Select value={e.equipment} onChange={(v) => setE({ ...e, equipment: v })} options={(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((k) => ({ value: k, label: EQUIPMENT_LABEL[k] }))} />
          </Field>
          <Field label="Primary muscle">
            <Select value={e.primary} onChange={(v) => setE({ ...e, primary: v })} options={muscles.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))} />
          </Field>
          <Field label="Track">
            <Select value={e.tracking} onChange={(v) => setE({ ...e, tracking: v })} options={(Object.keys(TRACKING_LABEL) as TrackingMode[]).map((k) => ({ value: k, label: TRACKING_LABEL[k] }))} />
          </Field>
        </div>
        <Field label="Secondary muscles">
          <div className="chips wrap-chips">
            {muscles
              .filter((m) => m !== e.primary)
              .map((m) => (
                <button
                  key={m}
                  className={`chip${e.secondary.includes(m) ? ' on' : ''}`}
                  onClick={() => setE({ ...e, secondary: e.secondary.includes(m) ? e.secondary.filter((x) => x !== m) : [...e.secondary, m] })}
                >
                  {MUSCLE_LABEL[m]}
                </button>
              ))}
          </div>
        </Field>
        <Field label="Coaching cues">
          <textarea className="textarea" value={e.cues ?? ''} onChange={(x) => setE({ ...e, cues: x.target.value || undefined })} placeholder="Setup, key cues, common faults" />
        </Field>
        <Field label="Demo video link" hint="YouTube, Instagram or your own hosted video">
          <TextInput type="url" inputMode="url" value={e.videoUrl ?? ''} onChange={(x) => setE({ ...e, videoUrl: x.target.value || undefined })} placeholder="https://" />
        </Field>
      </div>
    </Sheet>
  );
}
