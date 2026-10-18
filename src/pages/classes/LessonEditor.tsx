import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ClipboardPaste, Minus, Plus, Trash2, X } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { ClassLesson, ClassMove, ClassSegment, SegmentFormat } from '../../lib/types';
import { FORMATS, PROGRAM_TYPES, lessonSeconds, newSegment, segmentSeconds } from '../../lib/classes';
import { fmtDuration, uid } from '../../lib/util';
import { Button, Field, IconButton, NumberInput, Page, Section, Select, Sheet, Stepper, TextInput, toast } from '../../components/ui';
import { ClassShape } from './LessonDetail';
import { fs } from '../../lib/display';

function draftLesson(type: string): ClassLesson {
  return {
    id: uid(),
    title: '',
    programType: type,
    targetMin: 50,
    createdAt: new Date().toISOString(),
    segments: [
      { ...newSegment('coach', 'Warm-up'), breakSec: 30, zone: 2 },
      { ...newSegment('stations', 'Block A'), zone: 3 },
      { ...newSegment('coach', 'Cool-down'), durationSec: 300 },
    ],
  };
}

/** mm:ss value with ± buttons; tap the value to type seconds. */
function TimeField({ value, onChange, step = 5, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  const [typing, setTyping] = useState(false);
  return (
    <div className="time-field">
      <button aria-label="Less" onClick={() => onChange(Math.max(min, value - step))}>
        <Minus size={16} />
      </button>
      {typing ? (
        <NumberInput
          className="input"
          value={value}
          decimal={false}
          autoFocus
          onBlur={() => setTyping(false)}
          onChange={(v) => onChange(Math.max(min, v ?? 0))}
          style={{ minHeight: 34, padding: '4px 6px', textAlign: 'center', width: 70 }}
        />
      ) : (
        <b onClick={() => setTyping(true)} role="button" tabIndex={0}>
          {fmtDuration(value)}
        </b>
      )}
      <button aria-label="More" onClick={() => onChange(value + step)}>
        <Plus size={16} />
      </button>
    </div>
  );
}

function parseLines(text: string): ClassMove[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•*]|S\d+[:.)]?)\s*/i, '').trim())
    .filter(Boolean)
    .map((line) => {
      const [name, target, load, options] = line.split(/\s+[—–|]\s+|\s+-\s+/).map((x) => x.trim());
      return { id: uid(), name, target: target || undefined, load: load || undefined, options: options || undefined };
    });
}

function SegmentEditor({
  s,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  s: ClassSegment;
  index: number;
  count: number;
  onChange: (s: ClassSegment) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState('');
  const meta = FORMATS[s.format];
  const set = (p: Partial<ClassSegment>) => onChange({ ...s, ...p });
  const setMove = (id: string, p: Partial<ClassMove>) => set({ moves: s.moves.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const moveWord = s.format === 'stations' ? 'station' : 'move';

  return (
    <div className="seg-card">
      <div className="seg-head" style={{ alignItems: 'center' }}>
        <span className="seg-num">{index + 1}</span>
        <input className="input grow" value={s.name} onChange={(e) => set({ name: e.target.value })} aria-label="Block name" style={{ minHeight: 40, fontWeight: 700 }} />
        <span className="small tabular faint" style={{ minWidth: 44, textAlign: 'right' }}>
          {fmtDuration(segmentSeconds(s))}
        </span>
        <IconButton label={open ? 'Collapse' : 'Expand'} className="plain" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </IconButton>
      </div>
      {open && (
        <div className="stack" style={{ padding: '0 14px 14px' }}>
          <div className="grid-2">
            <Field label="Format">
              <Select<SegmentFormat>
                value={s.format}
                onChange={(f) => {
                  const d = newSegment(f);
                  onChange({ ...s, format: f, workSec: d.workSec, restSec: d.restSec, rounds: d.rounds, sets: d.sets, transitionSec: d.transitionSec, durationSec: d.durationSec });
                }}
                options={(Object.keys(FORMATS) as SegmentFormat[]).map((f) => ({ value: f, label: FORMATS[f].label }))}
              />
            </Field>
            <Field label="Heart-rate zone">
              <Select value={String(s.zone ?? '')} onChange={(v) => set({ zone: v ? Number(v) : undefined })} options={[{ value: '', label: 'None' }, ...[1, 2, 3, 4, 5].map((z) => ({ value: String(z), label: `Zone ${z}` }))]} />
            </Field>
          </div>
          <div className="xs faint" style={{ marginTop: -4 }}>
            {meta.hint}
          </div>
          <div className="grid-2">
            {meta.fields.includes('work') && (
              <Field label={s.format === 'emom' ? 'Interval' : 'Work'}>
                <TimeField value={s.workSec} onChange={(v) => set({ workSec: v })} min={5} />
              </Field>
            )}
            {meta.fields.includes('rest') && (
              <Field label={meta.restLabel ?? 'Rest'}>
                <TimeField value={s.restSec} onChange={(v) => set({ restSec: v })} />
              </Field>
            )}
            {meta.fields.includes('sets') && (
              <Field label="Sets per station">
                <Stepper value={s.sets} onChange={(v) => set({ sets: v })} min={1} max={10} format={(v) => <span style={{ fontSize: fs(18) }}>{v}</span>} />
              </Field>
            )}
            {meta.fields.includes('transition') && (
              <Field label={meta.transitionLabel ?? 'Transition'}>
                <TimeField value={s.transitionSec} onChange={(v) => set({ transitionSec: v })} />
              </Field>
            )}
            {meta.fields.includes('rounds') && (
              <Field label={meta.roundsLabel ?? 'Rounds'}>
                <Stepper value={s.rounds} onChange={(v) => set({ rounds: v })} min={1} max={60} format={(v) => <span style={{ fontSize: fs(18) }}>{v}</span>} />
              </Field>
            )}
            {meta.fields.includes('duration') && (
              <Field label={s.format === 'for_time' ? 'Time cap' : 'Duration'}>
                <TimeField value={s.durationSec} onChange={(v) => set({ durationSec: v })} step={30} min={30} />
              </Field>
            )}
            {index < count - 1 && (
              <Field label="Set-up time after">
                <TimeField value={s.breakSec} onChange={(v) => set({ breakSec: v })} step={15} />
              </Field>
            )}
          </div>

          <div className="label">{s.format === 'stations' ? 'Stations' : 'Moves'}</div>
          {s.moves.map((m, j) => (
            <div key={m.id} className="stack" style={{ gap: 6 }}>
              <div className="move-edit">
                <input className="input move-name" list="ex-names" value={m.name} placeholder={`${s.format === 'stations' ? `Station ${j + 1}` : `Move ${j + 1}`}`} onChange={(e) => setMove(m.id, { name: e.target.value })} aria-label="Exercise" />
                <input className="input" value={m.target ?? ''} placeholder="Reps / time" onChange={(e) => setMove(m.id, { target: e.target.value || undefined })} aria-label="Target" />
                <input className="input" value={m.load ?? ''} placeholder="Load / RPE" onChange={(e) => setMove(m.id, { load: e.target.value || undefined })} aria-label="Load" />
                <IconButton label="Remove move" className="plain" onClick={() => set({ moves: s.moves.filter((x) => x.id !== m.id) })}>
                  <X size={16} />
                </IconButton>
              </div>
              <input className="input" value={m.options ?? ''} placeholder="Regression / progression (optional)" onChange={(e) => setMove(m.id, { options: e.target.value || undefined })} aria-label="Options" style={{ minHeight: 38, fontSize: fs(16), padding: '6px 10px' }} />
            </div>
          ))}
          <div className="grid-2">
            <Button size="sm" onClick={() => set({ moves: [...s.moves, { id: uid(), name: '' }] })}>
              <Plus size={16} /> Add {moveWord}
            </Button>
            <Button size="sm" onClick={() => setPaste(true)}>
              <ClipboardPaste size={16} /> Paste list
            </Button>
          </div>
          <TextInput value={s.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} placeholder="Block notes (cues, scaling, set-up)…" />
          <div className="row" style={{ gap: 6 }}>
            <Button size="sm" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp size={16} />
            </Button>
            <Button size="sm" disabled={index === count - 1} onClick={() => onMove(1)}>
              <ArrowDown size={16} />
            </Button>
            <div className="grow" />
            <Button size="sm" variant="danger" onClick={onRemove}>
              <Trash2 size={16} /> Remove block
            </Button>
          </div>
        </div>
      )}
      {paste && (
        <Sheet
          open
          onClose={() => setPaste(false)}
          title={`Paste ${moveWord}s`}
          footer={
            <Button
              variant="primary"
              block
              disabled={!parseLines(text).length}
              onClick={() => {
                const moves = parseLines(text);
                set({ moves: [...s.moves.filter((m) => m.name.trim()), ...moves] });
                toast(`Added ${moves.length} ${moveWord}${moves.length > 1 ? 's' : ''}`);
                setText('');
                setPaste(false);
              }}
            >
              Add {parseLines(text).length || ''} {moveWord}s
            </Button>
          }
        >
          <div className="stack">
            <p className="small muted">One per line. Optionally add the target, load and options separated by “ — ” or “ | ”. Numbering and bullets are ignored.</p>
            <textarea
              className="textarea"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'1. Back squat — 8 reps — RPE 7\n2. Kettlebell swing — 15 reps — Heavy\n3. Push-up — 40s — Bodyweight — Regress: knees'}
              style={{ minHeight: 180 }}
            />
          </div>
        </Sheet>
      )}
    </div>
  );
}

const ADD_BLOCKS: { label: string; format: SegmentFormat; name: string }[] = [
  { label: 'Warm-up', format: 'coach', name: 'Warm-up' },
  { label: 'Stations', format: 'stations', name: 'Block' },
  { label: 'Circuit', format: 'circuit', name: 'Circuit' },
  { label: 'EMOM', format: 'emom', name: 'EMOM' },
  { label: 'AMRAP', format: 'amrap', name: 'AMRAP' },
  { label: 'Intervals', format: 'intervals', name: 'Intervals' },
  { label: 'Tabata', format: 'tabata', name: 'Tabata' },
  { label: 'Partner YGIG', format: 'partner', name: 'Partner finisher' },
  { label: 'For time', format: 'for_time', name: 'For time' },
  { label: 'Cool-down', format: 'coach', name: 'Cool-down' },
];

export default function LessonEditor() {
  const { id = 'new' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const existing = useStore((s) => s.data.lessons.find((l) => l.id === id));
  const lessons = useStore((s) => s.data.lessons);
  const exercises = useStore((s) => s.data.exercises);
  const [l, setL] = useState<ClassLesson>(() => existing ?? draftLesson(params.get('type') ?? 'Strength'));
  const blocks = useMemo(() => [...new Set(lessons.map((x) => x.block).filter(Boolean))] as string[], [lessons]);
  const secs = lessonSeconds(l);
  const set = (p: Partial<ClassLesson>) => setL((x) => ({ ...x, ...p }));

  const save = () => {
    if (!l.title.trim()) return toast('Give the lesson a title');
    const clean: ClassLesson = {
      ...l,
      title: l.title.trim(),
      programType: l.programType.trim() || 'Class',
      example: existing ? l.example : false,
      updatedAt: new Date().toISOString(),
      segments: l.segments.map((s) => ({ ...s, moves: s.moves.filter((m) => m.name.trim()) })),
    };
    actions().upsert('lessons', clean);
    toast('Lesson saved');
    nav(`/classes/lesson/${clean.id}`, { replace: true });
  };

  const addBlock = (b: (typeof ADD_BLOCKS)[number]) => {
    const n = l.segments.filter((s) => s.format !== 'coach').length;
    const name = b.format === 'stations' ? `Block ${String.fromCharCode(65 + n)}` : b.name;
    const seg = { ...newSegment(b.format, name), zone: b.format === 'coach' ? (b.name === 'Cool-down' ? 1 : 2) : 3 };
    const cooldownIdx = l.segments.findIndex((s) => s.name.toLowerCase().includes('cool'));
    const segments = [...l.segments];
    if (b.name !== 'Cool-down' && cooldownIdx >= 0) segments.splice(cooldownIdx, 0, seg);
    else segments.push(seg);
    set({ segments });
  };

  return (
    <Page
      title={existing ? 'Edit lesson' : 'New lesson'}
      subtitle={`${fmtDuration(secs)} of ${l.targetMin} min · ${l.segments.length} blocks`}
      back
      compact
      actions={
        <Button variant="primary" size="sm" onClick={save}>
          Save
        </Button>
      }
    >
      <datalist id="ex-names">
        {exercises.map((e) => (
          <option key={e.id} value={e.name} />
        ))}
      </datalist>
      <datalist id="block-names">
        {blocks.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      <div className="stack">
        <Field label="Lesson title">
          <TextInput value={l.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lower-body strength" autoFocus={!existing} />
        </Field>
        <Field label="Program">
          <TextInput value={l.programType} onChange={(e) => set({ programType: e.target.value })} />
        </Field>
        <div className="chips">
          {PROGRAM_TYPES.map((p) => (
            <button key={p.name} className={`chip${l.programType === p.name ? ' on' : ''}`} onClick={() => set({ programType: p.name })}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid-2">
          <Field label="Block / cycle">
            <input className="input" list="block-names" value={l.block ?? ''} onChange={(e) => set({ block: e.target.value || undefined })} placeholder="e.g. Block 12" />
          </Field>
          <Field label="Week">
            <NumberInput value={l.week} onChange={(v) => set({ week: v })} decimal={false} />
          </Field>
          <Field label="Session">
            <TextInput value={l.session ?? ''} onChange={(e) => set({ session: e.target.value || undefined })} placeholder="e.g. A" />
          </Field>
          <Field label="Class length">
            <NumberInput value={l.targetMin} onChange={(v) => set({ targetMin: v ?? 50 })} decimal={false} suffix="min" />
          </Field>
        </div>
        <Field label="Focus">
          <TextInput value={l.focus ?? ''} onChange={(e) => set({ focus: e.target.value || undefined })} placeholder="What this session develops" />
        </Field>
        <Field label="Equipment">
          <TextInput value={l.equipment ?? ''} onChange={(e) => set({ equipment: e.target.value || undefined })} placeholder="Barbells, KBs, bikes…" />
        </Field>
        <Field label="Floor set-up">
          <TextInput value={l.setup ?? ''} onChange={(e) => set({ setup: e.target.value || undefined })} placeholder="Station layout, pairs, lanes…" />
        </Field>
      </div>

      <div className="card">
        <ClassShape lesson={l} />
      </div>

      <Section title="Blocks">
        <div className="stack">
          {l.segments.map((s, i) => (
            <SegmentEditor
              key={s.id}
              s={s}
              index={i}
              count={l.segments.length}
              onChange={(next) => set({ segments: l.segments.map((x) => (x.id === s.id ? next : x)) })}
              onMove={(dir) => {
                const list = [...l.segments];
                const j = i + dir;
                [list[i], list[j]] = [list[j], list[i]];
                set({ segments: list });
              }}
              onRemove={() => set({ segments: l.segments.filter((x) => x.id !== s.id) })}
            />
          ))}
          <div className="label">Add a block</div>
          <div className="chips wrap-chips">
            {ADD_BLOCKS.map((b) => (
              <button key={b.label} className="chip" onClick={() => addBlock(b)}>
                <Plus size={14} /> {b.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Field label="Coach notes">
        <textarea className="textarea" value={l.coachNotes ?? ''} onChange={(e) => set({ coachNotes: e.target.value || undefined })} placeholder="Demos, cues, timing tips, things to watch for" />
      </Field>

      <Button variant="primary" block onClick={save}>
        Save lesson
      </Button>
    </Page>
  );
}
