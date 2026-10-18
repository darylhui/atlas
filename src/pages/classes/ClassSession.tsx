import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, CheckCheck, ClipboardList, Pencil, Play, Trash2, UserPlus, Users, X } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { Attendee, GroupClass } from '../../lib/types';
import { classTitle, lessonSeconds, presentCount } from '../../lib/classes';
import { dayKey, fmtDay, fmtDuration, fmtTime, uid } from '../../lib/util';
import { ClassForm, LessonPicker, ProgramBadge } from '../../components/classes';
import { Avatar, Button, Card, confirmDialog, Empty, IconButton, ListItem, Page, Section, Stat, toast } from '../../components/ui';
import { RPE_SCALE } from '../WorkoutLogger';

export default function ClassSession() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const data = useStore((s) => s.data);
  const g = data.groupClasses.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const [pickLesson, setPickLesson] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState(g?.notes ?? '');

  // Everyone who has come to a class before, plus PT clients, for quick adding.
  const known = useMemo(() => {
    const m = new Map<string, Attendee>();
    for (const c of data.clients.filter((c) => c.status !== 'archived')) m.set(c.name.toLowerCase(), { id: '', name: c.name, clientId: c.id, present: false });
    for (const x of data.groupClasses) for (const a of x.attendees) if (!m.has(a.name.toLowerCase())) m.set(a.name.toLowerCase(), { ...a, present: false });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.clients, data.groupClasses]);

  if (!g) return <Page title="Class" back="/classes"><Empty icon={<Users />} title="Class not found" /></Page>;

  const lesson = data.lessons.find((l) => l.id === g.lessonId);
  const studio = data.studios.find((s) => s.id === g.studioId);
  const patch = (p: Partial<GroupClass>) => actions().patch('groupClasses', g.id, p);
  const setAttendees = (attendees: Attendee[]) => patch({ attendees });
  const present = presentCount(g);
  const day = dayKey(new Date(g.start));
  const isPastOrToday = day <= dayKey();
  const suggestions = name.trim().length >= 1 ? known.filter((k) => k.name.toLowerCase().includes(name.trim().toLowerCase()) && !g.attendees.some((a) => a.name.toLowerCase() === k.name.toLowerCase())).slice(0, 5) : [];

  const add = (a: Omit<Attendee, 'id' | 'present'>) => {
    if (!a.name.trim() || g.attendees.some((x) => x.name.toLowerCase() === a.name.trim().toLowerCase())) return setName('');
    setAttendees([...g.attendees, { id: uid(), name: a.name.trim(), clientId: a.clientId, present: isPastOrToday }]);
    setName('');
  };

  return (
    <Page
      title={g.programType}
      subtitle={`${fmtDay(day, { weekday: true })} · ${fmtTime(g.start)} · ${g.durationMin} min${studio ? ` · ${studio.name}` : ''}`}
      back
      compact
      actions={
        <IconButton label="Edit class" onClick={() => setEdit(true)}>
          <Pencil size={18} />
        </IconButton>
      }
    >
      <Card>
        <div className="row-between">
          <ProgramBadge type={g.programType} size="lg" />
          <span className={`pill ${g.status === 'completed' ? 'good' : g.status === 'cancelled' ? 'warning' : 'low'}`}>
            <span className="dot" style={{ background: `var(--${g.status === 'completed' ? 'good' : g.status === 'cancelled' ? 'warning' : 'low'})` }} />
            {g.status === 'completed' ? 'Taught' : g.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
          </span>
        </div>
        {lesson ? (
          <button className="list-item" style={{ padding: '12px 0 4px', minHeight: 0, borderBottom: 0 }} onClick={() => nav(`/classes/lesson/${lesson.id}`)}>
            <ClipboardList size={18} className="faint" />
            <div className="grow">
              <div className="bold">{lesson.title}</div>
              <div className="small faint">
                {[lesson.block, lesson.week ? `Week ${lesson.week}` : '', `${lesson.segments.length} blocks`, fmtDuration(lessonSeconds(lesson))].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="section-link small">Coach sheet</span>
          </button>
        ) : (
          <div className="mt-2">
            <Button size="sm" onClick={() => setPickLesson(true)}>
              <ClipboardList size={16} /> Attach a lesson programme
            </Button>
          </div>
        )}
        {g.status !== 'cancelled' && (
          <Button variant="primary" block className="mt-2" disabled={!lesson} onClick={() => lesson && nav(`/classes/timer/${lesson.id}?class=${g.id}`)}>
            <Play size={18} /> {g.status === 'completed' ? 'Run timer again' : 'Teach with class timer'}
          </Button>
        )}
      </Card>

      <div className="grid-3">
        <Stat label="Booked" value={g.attendees.length} unit={g.capacity ? `/ ${g.capacity}` : undefined} />
        <Stat label="Checked in" value={present} />
        <Stat label="Spots left" value={g.capacity ? Math.max(0, g.capacity - g.attendees.length) : '–'} />
      </div>

      <Section
        title="Attendance"
        action={
          g.attendees.length > 0 && present < g.attendees.length ? (
            <button className="section-link row" style={{ gap: 4 }} onClick={() => setAttendees(g.attendees.map((a) => ({ ...a, present: true })))}>
              <CheckCheck size={16} /> Check in all
            </button>
          ) : undefined
        }
      >
        <div className="stack">
          <div style={{ position: 'relative' }}>
            <div className="row">
              <input
                className="input grow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add({ name })}
                placeholder="Add member or client by name"
                aria-label="Add attendee"
              />
              <Button variant="primary" onClick={() => add({ name })} disabled={!name.trim()}>
                <UserPlus size={18} />
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div className="card flush mt-1">
                {suggestions.map((s) => (
                  <ListItem key={s.name} title={s.name} subtitle={s.clientId ? 'PT client — class counts toward their training load' : 'Previous attendee'} chevron={false} onClick={() => add(s)} />
                ))}
              </div>
            )}
          </div>
          <div className="card flush">
            {g.attendees.map((a) => {
              const client = a.clientId ? data.clients.find((c) => c.id === a.clientId) : undefined;
              return (
                <div key={a.id} className="list-item">
                  {client ? <Avatar name={client.name} color={client.color} size={34} /> : <Avatar name={a.name} color="#a0a0a0" size={34} />}
                  <button className="grow" style={{ textAlign: 'left' }} onClick={() => client && nav(`/clients/${client.id}`)}>
                    <div className="bold truncate">{a.name}</div>
                    <div className="xs faint">{client ? 'PT client' : 'Member'}</div>
                  </button>
                  <button
                    className={`set-check${a.present ? ' on' : ''}`}
                    aria-label={a.present ? `Mark ${a.name} absent` : `Check in ${a.name}`}
                    onClick={() => setAttendees(g.attendees.map((x) => (x.id === a.id ? { ...x, present: !x.present } : x)))}
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                  <IconButton label={`Remove ${a.name}`} className="plain" onClick={() => setAttendees(g.attendees.filter((x) => x.id !== a.id))}>
                    <X size={16} />
                  </IconButton>
                </div>
              );
            })}
            {!g.attendees.length && <Empty icon={<Users />} title="No one booked yet">Add members as they arrive, or before class from your booking list.</Empty>}
          </div>
        </div>
      </Section>

      <Section title="After class">
        <div className="stack">
          <Card>
            <div className="row-between">
              <div>
                <div className="bold">Typical member effort</div>
                <div className="small faint">Session RPE, used for linked clients’ training load</div>
              </div>
              <span className="pill">
                {g.rpe ?? 7} · {RPE_SCALE[g.rpe ?? 7]}
              </span>
            </div>
            <input type="range" min={1} max={10} value={g.rpe ?? 7} onChange={(e) => patch({ rpe: Number(e.target.value) })} style={{ width: '100%', marginTop: 14, accentColor: 'var(--accent)' }} aria-label="Class RPE" />
          </Card>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => patch({ notes: notes.trim() || undefined })}
            placeholder="How did it run? Timing, scaling, member feedback, what to change next time"
          />
          {g.status === 'scheduled' && (
            <div className="grid-2">
              <Button
                variant="primary"
                onClick={() => {
                  patch({ status: 'completed', notes: notes.trim() || undefined });
                  toast(`Class marked as taught · ${present} checked in`);
                }}
              >
                <Check size={18} /> Mark as taught
              </Button>
              <Button onClick={() => patch({ status: 'cancelled' })}>Cancel class</Button>
            </div>
          )}
          {g.status !== 'scheduled' && <Button onClick={() => patch({ status: 'scheduled' })}>Reset to scheduled</Button>}
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirmDialog({ title: 'Delete this class?', body: 'Attendance for this class will be removed.', confirm: 'Delete', danger: true })) {
                actions().remove('groupClasses', g.id);
                nav('/classes', { replace: true });
              }
            }}
          >
            <Trash2 size={18} /> Delete class
          </Button>
        </div>
      </Section>

      {edit && <ClassForm open initial={g} onClose={() => setEdit(false)} />}
      <LessonPicker
        open={pickLesson}
        onClose={() => setPickLesson(false)}
        onPick={(l) => {
          patch({ lessonId: l.id, programType: l.programType });
          setPickLesson(false);
          toast(`Attached “${classTitle({ ...g, lessonId: l.id }, data.lessons)}”`);
        }}
      />
    </Page>
  );
}
