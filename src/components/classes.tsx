import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, MapPin, Plus, Trash2 } from 'lucide-react';
import { actions, useData, useStore } from '../lib/store';
import type { ClassLesson, DayKey, GroupClass, ID, Studio } from '../lib/types';
import { CATEGORY_META, PROGRAM_TYPES, classTitle, lessonSeconds, presentCount, programCategory, programColor } from '../lib/classes';
import { addDays, dayKey, fmtTime, money, toIso, uid } from '../lib/util';
import { Button, Chips, confirmDialog, Empty, Field, ListItem, NumberInput, SearchInput, Select, Sheet, TextInput, toast, Toggle } from './ui';

export function ProgramBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'lg' }) {
  const cat = programCategory(type);
  return (
    <span className={`pill${size === 'lg' ? ' pill-lg' : ''}`}>
      <span className="dot" style={{ background: programColor(type) }} />
      {type}
      {size === 'lg' && <span className="faint">· {CATEGORY_META[cat].label}</span>}
    </span>
  );
}

/** Square tile with the program's initials, coloured by category. */
export function ProgramTile({ type, size = 40 }: { type: string; size?: number }) {
  const letters = type
    .replace(/[^A-Za-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="program-tile" style={{ width: size, height: size, fontSize: size * 0.34, background: programColor(type) }} aria-hidden>
      {letters || '•'}
    </span>
  );
}

export function ClassRow({ g, onClick, showDay }: { g: GroupClass; onClick: () => void; showDay?: string }) {
  const lessons = useData((d) => d.lessons);
  const studio = useData((d) => d.studios.find((s) => s.id === g.studioId));
  const booked = g.attendees.length;
  const present = presentCount(g);
  return (
    <button className="list-item" onClick={onClick} style={{ opacity: g.status === 'cancelled' ? 0.5 : 1 }}>
      <div className="timeline-time">
        {fmtTime(g.start)}
        {showDay && <div className="xs faint">{showDay}</div>}
      </div>
      <ProgramTile type={g.programType} size={36} />
      <div className="grow">
        <div className="bold truncate" style={{ textDecoration: g.status === 'cancelled' ? 'line-through' : undefined }}>
          {g.programType} class
        </div>
        <div className="small faint truncate">
          {[classTitle(g, lessons) !== g.programType ? classTitle(g, lessons) : null, studio?.name, g.durationMin !== 50 ? `${g.durationMin} min` : null].filter(Boolean).join(' · ') || `${g.durationMin} min`}
        </div>
      </div>
      <span className="pill tabular">
        {g.status === 'completed' ? `${present} came` : `${booked}${g.capacity ? `/${g.capacity}` : ''}`}
      </span>
    </button>
  );
}

export function LessonRow({ l, onClick }: { l: ClassLesson; onClick: () => void }) {
  const mins = Math.round(lessonSeconds(l) / 60);
  return (
    <ListItem
      icon={<ProgramTile type={l.programType} size={38} />}
      title={
        <>
          {l.title}
          {l.example && <span className="pill" style={{ marginLeft: 6 }}>Example</span>}
        </>
      }
      subtitle={[l.programType, l.week ? `Wk ${l.week}${l.session ? ` · ${l.session}` : ''}` : l.session, `${l.segments.length} blocks`, `${mins} min`].filter(Boolean).join(' · ')}
      onClick={onClick}
    />
  );
}

/** Searchable programme library grouped by block, then week. */
export function LessonLibrary() {
  const lessons = useData((d) => d.lessons);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const blocks = useMemo(() => [...new Set(lessons.map((l) => l.block || 'Unsorted'))], [lessons]);
  const [block, setBlock] = useState('all');
  const types = useMemo(() => [...new Set(lessons.map((l) => l.programType))].sort(), [lessons]);

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = lessons
      .filter((l) => (type === 'all' || l.programType === type) && (block === 'all' || (l.block || 'Unsorted') === block))
      .filter((l) => !ql || [l.title, l.programType, l.focus, l.block, ...l.segments.flatMap((s) => s.moves.map((m) => m.name))].some((x) => x?.toLowerCase().includes(ql)))
      .sort((a, b) => (a.week ?? 0) - (b.week ?? 0) || a.programType.localeCompare(b.programType) || (a.session ?? '').localeCompare(b.session ?? ''));
    const map = new Map<string, ClassLesson[]>();
    for (const l of list) {
      const k = `${l.block || 'Unsorted'}${l.week ? ` · Week ${l.week}` : ''}`;
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return [...map.entries()];
  }, [lessons, q, type, block]);

  return (
    <div className="stack">
      <div className="row">
        <div className="grow">
          <SearchInput value={q} onChange={setQ} placeholder="Search lessons or exercises" />
        </div>
        <Button variant="primary" onClick={() => nav('/classes/lesson/new/edit')}>
          <Plus size={18} /> Lesson
        </Button>
      </div>
      {blocks.length > 1 && <Chips value={block} onChange={setBlock} options={[{ value: 'all', label: 'All blocks' }, ...blocks.map((b) => ({ value: b, label: b }))]} />}
      <Chips value={type} onChange={setType} options={[{ value: 'all', label: 'All programs' }, ...types.map((t) => ({ value: t, label: t }))]} />
      {groups.map(([k, list]) => (
        <div key={k}>
          <div className="label" style={{ margin: '6px 2px 8px' }}>
            {k}
          </div>
          <div className="card flush">
            {list.map((l) => (
              <LessonRow key={l.id} l={l} onClick={() => nav(`/classes/lesson/${l.id}`)} />
            ))}
          </div>
        </div>
      ))}
      {!groups.length && (
        <Empty icon={<ClipboardList />} title={lessons.length ? 'No matching lessons' : 'No lessons yet'} action={<Button variant="primary" onClick={() => nav('/classes/lesson/new/edit')}>Create a lesson</Button>}>
          Add each week’s lesson programmes here, then teach them with the class timer.
        </Empty>
      )}
    </div>
  );
}

export function LessonPicker({ open, onClose, onPick, title = 'Choose a lesson' }: { open: boolean; onClose: () => void; onPick: (l: ClassLesson) => void; title?: string }) {
  const lessons = useData((d) => d.lessons);
  const [q, setQ] = useState('');
  const list = lessons
    .filter((l) => !q.trim() || `${l.title} ${l.programType} ${l.block ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="stack">
        <SearchInput value={q} onChange={setQ} placeholder="Search lessons" />
        <div className="card flush">
          {list.map((l) => (
            <LessonRow key={l.id} l={l} onClick={() => onPick(l)} />
          ))}
          {!list.length && <Empty icon={<ClipboardList />} title="No lessons found" />}
        </div>
      </div>
    </Sheet>
  );
}

/** Schedule (or edit) a group class, optionally repeating weekly. */
export function ClassForm({ open, onClose, initial, lessonId, day }: { open: boolean; onClose: () => void; initial?: GroupClass; lessonId?: ID; day?: DayKey }) {
  const lessons = useData((d) => d.lessons);
  const studios = useData((d) => d.studios);
  const [lid, setLid] = useState<string>(initial?.lessonId ?? lessonId ?? '');
  const lesson = lessons.find((l) => l.id === lid);
  const [type, setType] = useState(initial?.programType ?? lesson?.programType ?? 'Strength');
  const [date, setDate] = useState<DayKey>(initial ? dayKey(new Date(initial.start)) : day ?? dayKey());
  const [time, setTime] = useState(initial ? fmtTime(initial.start) : '06:00');
  const [duration, setDuration] = useState<number | undefined>(initial?.durationMin ?? (lesson ? Math.round(lessonSeconds(lesson) / 60) : 50));
  const [studioId, setStudioId] = useState(initial?.studioId ?? studios[0]?.id ?? '');
  const studio = studios.find((s) => s.id === studioId);
  const [capacity, setCapacity] = useState<number | undefined>(initial?.capacity ?? studio?.capacity);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState<number | undefined>(8);
  const [studioSheet, setStudioSheet] = useState(false);

  const pickLesson = (id: string) => {
    setLid(id);
    const l = lessons.find((x) => x.id === id);
    if (l) {
      setType(l.programType);
      setDuration(Math.round(lessonSeconds(l) / 60));
    }
  };

  const save = () => {
    const base: Omit<GroupClass, 'id' | 'start'> = {
      lessonId: lid || undefined,
      programType: type.trim() || 'Class',
      studioId: studioId || undefined,
      durationMin: duration ?? 50,
      capacity,
      attendees: initial?.attendees ?? [],
      status: initial?.status ?? 'scheduled',
      rpe: initial?.rpe,
      notes: initial?.notes,
      title: initial?.title,
    };
    actions().upsert('groupClasses', { ...base, id: initial?.id ?? uid(), start: toIso(date, time) });
    let n = 1;
    if (!initial && repeat) {
      for (let w = 1; w < (weeks ?? 1); w++) {
        actions().upsert('groupClasses', { ...base, attendees: [], id: uid(), start: toIso(addDays(date, w * 7), time) });
        n++;
      }
    }
    toast(initial ? 'Class updated' : n > 1 ? `${n} classes scheduled` : 'Class scheduled');
    onClose();
  };

  const typeOptions = [...new Set([...PROGRAM_TYPES.map((p) => p.name), ...lessons.map((l) => l.programType), type])];

  return (
    <>
      <Sheet open={open && !studioSheet} onClose={onClose} title={initial ? 'Edit class' : 'Schedule a class'} footer={<Button variant="primary" block onClick={save}>{initial ? 'Save' : 'Schedule'}</Button>}>
        <div className="stack">
          <Field label="Lesson programme">
            <Select value={lid} onChange={pickLesson} options={[{ value: '', label: 'No lesson yet' }, ...lessons.map((l) => ({ value: l.id, label: `${l.programType} · ${l.title}${l.week ? ` (wk ${l.week})` : ''}` }))]} />
          </Field>
          <Field label="Program">
            <Select value={type} onChange={setType} options={typeOptions.map((t) => ({ value: t, label: t }))} />
          </Field>
          <div className="grid-2">
            <Field label="Date">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start">
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Duration">
              <NumberInput value={duration} onChange={setDuration} decimal={false} suffix="min" />
            </Field>
            <Field label="Capacity">
              <NumberInput value={capacity} onChange={setCapacity} decimal={false} suffix="spots" />
            </Field>
          </div>
          <Field label="Studio">
            <div className="row">
              <div className="grow">
                <Select
                  value={studioId}
                  onChange={(v) => {
                    setStudioId(v);
                    const s = studios.find((x) => x.id === v);
                    if (s?.capacity && !initial) setCapacity(s.capacity);
                  }}
                  options={[{ value: '', label: 'No studio' }, ...studios.map((s) => ({ value: s.id, label: s.name }))]}
                />
              </div>
              <Button size="sm" onClick={() => setStudioSheet(true)}>
                Studios
              </Button>
            </div>
          </Field>
          {!initial && (
            <div className="card tight">
              <div className="row-between">
                <div>
                  <div className="bold">Repeat weekly</div>
                  <div className="small faint">Same day and time, e.g. for a block</div>
                </div>
                <Toggle on={repeat} onChange={setRepeat} label="Repeat weekly" />
              </div>
              {repeat && (
                <div className="mt-2">
                  <Field label="Number of weeks">
                    <NumberInput value={weeks} onChange={setWeeks} decimal={false} suffix="wks" />
                  </Field>
                </div>
              )}
            </div>
          )}
        </div>
      </Sheet>
      {studioSheet && <StudiosSheet onClose={() => setStudioSheet(false)} />}
    </>
  );
}

export function StudiosSheet({ onClose }: { onClose: () => void }) {
  const studios = useStore((s) => s.data.studios);
  const currency = useStore((s) => s.data.settings.currency);
  const [edit, setEdit] = useState<Studio | null>(null);
  if (edit) return <StudioEditor studio={edit} onClose={() => setEdit(null)} />;
  return (
    <Sheet open onClose={onClose} title="Studios" footer={<Button variant="primary" block onClick={() => setEdit({ id: uid(), name: '', capacity: 24 })}><Plus size={18} /> Add studio</Button>}>
      <div className="card flush">
        {studios.map((s) => (
          <ListItem
            key={s.id}
            icon={<MapPin size={18} className="faint" />}
            title={s.name}
            subtitle={[s.address, s.capacity ? `${s.capacity} spots` : null, s.payPerClass ? `${money(s.payPerClass, currency)} per class` : null].filter(Boolean).join(' · ')}
            onClick={() => setEdit(s)}
          />
        ))}
        {!studios.length && <Empty icon={<MapPin />} title="No studios yet">Add the studios you coach at to track classes and pay per location.</Empty>}
      </div>
    </Sheet>
  );
}

function StudioEditor({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const exists = useStore((s) => s.data.studios.some((x) => x.id === studio.id));
  const currency = useStore((s) => s.data.settings.currency);
  const [s, setS] = useState(studio);
  return (
    <Sheet
      open
      onClose={onClose}
      title={exists ? 'Edit studio' : 'New studio'}
      footer={
        <>
          {exists && (
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirmDialog({ title: `Remove ${s.name}?`, body: 'Classes at this studio stay in your history without a studio.', confirm: 'Remove', danger: true })) {
                  actions().remove('studios', s.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button
            variant="primary"
            block
            disabled={!s.name.trim()}
            onClick={() => {
              actions().upsert('studios', { ...s, name: s.name.trim() });
              onClose();
            }}
          >
            Save studio
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Name">
          <TextInput value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="e.g. BFT Northside" autoFocus={!exists} />
        </Field>
        <Field label="Address">
          <TextInput value={s.address ?? ''} onChange={(e) => setS({ ...s, address: e.target.value || undefined })} />
        </Field>
        <div className="grid-2">
          <Field label="Class capacity">
            <NumberInput value={s.capacity} onChange={(v) => setS({ ...s, capacity: v })} decimal={false} suffix="spots" />
          </Field>
          <Field label={`Pay per class (${currency})`} hint="For your class earnings">
            <NumberInput value={s.payPerClass} onChange={(v) => setS({ ...s, payPerClass: v })} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
