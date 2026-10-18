import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarCheck, CircleX, ClipboardList, Dumbbell, Trash2, UserRound, Video } from 'lucide-react';
import { actions, useData } from '../lib/store';
import type { Appointment, AppointmentStatus, AppointmentType, DayKey, ID } from '../lib/types';
import { addDays, dayKey, fmtDay, fmtTime, toIso, uid } from '../lib/util';
import { StartWorkoutSheet } from './sheets';
import { Avatar, Button, confirmDialog, Field, ListItem, NumberInput, Select, Sheet, TextInput, toast, Toggle } from './ui';

export const APPT_TYPE: Record<AppointmentType, { label: string; icon: typeof Dumbbell }> = {
  session: { label: 'Training session', icon: Dumbbell },
  assessment: { label: 'Assessment', icon: ClipboardList },
  check_in: { label: 'Check-in call', icon: Activity },
  online: { label: 'Online session', icon: Video },
};

export const APPT_STATUS: Record<AppointmentStatus, { label: string; zone: 'good' | 'warning' | 'critical' | 'low' }> = {
  scheduled: { label: 'Scheduled', zone: 'low' },
  completed: { label: 'Completed', zone: 'good' },
  cancelled: { label: 'Cancelled', zone: 'warning' },
  no_show: { label: 'No-show', zone: 'critical' },
};

export function AppointmentRow({ a, onClick }: { a: Appointment; onClick: () => void }) {
  const client = useData((d) => d.clients.find((c) => c.id === a.clientId));
  const T = APPT_TYPE[a.type];
  const s = APPT_STATUS[a.status];
  return (
    <button className="list-item" onClick={onClick} style={{ opacity: a.status === 'cancelled' ? 0.5 : 1 }}>
      <div className="timeline-time">{fmtTime(a.start)}</div>
      {client && <Avatar name={client.name} color={client.color} size={36} />}
      <div className="grow">
        <div className="bold truncate" style={{ textDecoration: a.status === 'cancelled' ? 'line-through' : undefined }}>
          {client?.name ?? 'Unknown client'}
        </div>
        <div className="small faint row" style={{ gap: 5 }}>
          <T.icon size={13} /> {T.label} · {a.durationMin} min{a.location ? ` · ${a.location}` : ''}
        </div>
      </div>
      {a.status !== 'scheduled' && (
        <span className={`pill ${s.zone}`}>
          <span className="dot" style={{ background: `var(--${s.zone})` }} />
          {s.label}
        </span>
      )}
    </button>
  );
}

/** Action sheet for a single appointment. */
export function AppointmentActions({ appt, onClose }: { appt?: Appointment; onClose: () => void }) {
  const nav = useNavigate();
  const [edit, setEdit] = useState(false);
  const [start, setStart] = useState(false);
  const client = useData((d) => d.clients.find((c) => c.id === appt?.clientId));
  if (!appt) return null;
  const setStatus = (status: AppointmentStatus) => {
    actions().patch('appointments', appt.id, { status });
    toast(`Marked ${APPT_STATUS[status].label.toLowerCase()}`);
    onClose();
  };
  if (edit) return <AppointmentForm open initial={appt} onClose={() => { setEdit(false); onClose(); }} />;
  if (start && client) return <StartWorkoutSheet open clientId={client.id} onClose={() => { setStart(false); onClose(); }} />;
  return (
    <Sheet open onClose={onClose} title={`${fmtDay(dayKey(new Date(appt.start)), { weekday: true })} · ${fmtTime(appt.start)}`}>
      <div className="stack">
        {client && (
          <div className="row">
            <Avatar name={client.name} color={client.color} size={44} />
            <div>
              <div className="bold">{client.name}</div>
              <div className="small muted">
                {APPT_TYPE[appt.type].label} · {appt.durationMin} min
              </div>
            </div>
          </div>
        )}
        {appt.notes && <p className="small muted">{appt.notes}</p>}
        <div className="card flush">
          {appt.workoutId ? (
            <ListItem icon={<Dumbbell size={18} />} title="View workout" onClick={() => { onClose(); nav(`/sessions/${appt.workoutId}`); }} />
          ) : (
            appt.status === 'scheduled' && <ListItem icon={<Dumbbell size={18} color="var(--accent)" />} title="Start workout" subtitle="Session auto-completes when you finish" onClick={() => setStart(true)} />
          )}
          {client && <ListItem icon={<Activity size={18} />} title="Readiness check-in" onClick={() => { onClose(); nav(`/clients/${client.id}/check-in`); }} />}
          {client && <ListItem icon={<UserRound size={18} />} title="Open client profile" onClick={() => { onClose(); nav(`/clients/${client.id}`); }} />}
          {appt.status === 'scheduled' && (
            <>
              <ListItem icon={<CalendarCheck size={18} />} title="Mark completed" chevron={false} onClick={() => setStatus('completed')} />
              <ListItem icon={<CircleX size={18} />} title="Mark no-show" chevron={false} onClick={() => setStatus('no_show')} />
              <ListItem icon={<CircleX size={18} />} title="Cancel appointment" chevron={false} onClick={() => setStatus('cancelled')} />
            </>
          )}
          {appt.status !== 'scheduled' && <ListItem icon={<CalendarCheck size={18} />} title="Reset to scheduled" chevron={false} onClick={() => setStatus('scheduled')} />}
          <ListItem icon={<ClipboardList size={18} />} title="Edit details" onClick={() => setEdit(true)} />
        </div>
        <Button
          variant="danger"
          block
          onClick={async () => {
            if (await confirmDialog({ title: 'Delete appointment?', confirm: 'Delete', danger: true })) {
              actions().remove('appointments', appt.id);
              onClose();
            }
          }}
        >
          <Trash2 size={18} /> Delete
        </Button>
      </div>
    </Sheet>
  );
}

function downloadIcs(a: Appointment, clientName: string, business: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(a.start);
  const end = new Date(start.getTime() + a.durationMin * 60000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atlas//PT//EN',
    'BEGIN:VEVENT',
    `UID:${a.id}@atlas`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${APPT_TYPE[a.type].label} — ${business}`,
    `DESCRIPTION:${clientName}${a.notes ? ' — ' + a.notes.replace(/\n/g, ' ') : ''}`,
    a.location ? `LOCATION:${a.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `session-${dayKey(start)}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AppointmentForm({
  open,
  onClose,
  initial,
  clientId,
  day,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Appointment;
  clientId?: ID;
  day?: DayKey;
}) {
  const clients = useData((d) => d.clients);
  const settings = useData((d) => d.settings);
  const active = clients.filter((c) => c.status !== 'archived');
  const [cid, setCid] = useState<ID>(initial?.clientId ?? clientId ?? active[0]?.id ?? '');
  const [date, setDate] = useState<DayKey>(initial ? dayKey(new Date(initial.start)) : day ?? dayKey());
  const [time, setTime] = useState(initial ? fmtTime(initial.start) : '09:00');
  const [duration, setDuration] = useState<number | undefined>(initial?.durationMin ?? 60);
  const [type, setType] = useState<AppointmentType>(initial?.type ?? 'session');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState<number | undefined>(8);
  const [exportIcs, setExportIcs] = useState(false);

  useEffect(() => {
    if (!initial && day) setDate(day);
  }, [day, initial]);

  const save = () => {
    if (!cid) return;
    const base: Omit<Appointment, 'id' | 'start'> = {
      clientId: cid,
      durationMin: duration ?? 60,
      type,
      status: initial?.status ?? 'scheduled',
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      workoutId: initial?.workoutId,
    };
    const first: Appointment = { ...base, id: initial?.id ?? uid(), start: toIso(date, time) };
    actions().upsert('appointments', first);
    let count = 1;
    if (!initial && repeat) {
      for (let w = 1; w < (weeks ?? 1); w++) {
        actions().upsert('appointments', { ...base, id: uid(), start: toIso(addDays(date, w * 7), time) });
        count++;
      }
    }
    if (exportIcs) downloadIcs(first, clients.find((c) => c.id === cid)?.name ?? '', settings.businessName);
    toast(initial ? 'Appointment updated' : count > 1 ? `${count} sessions booked` : 'Session booked');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit appointment' : 'Book a session'}
      footer={
        <Button variant="primary" block onClick={save} disabled={!cid}>
          {initial ? 'Save changes' : 'Book'}
        </Button>
      }
    >
      <div className="stack">
        <Field label="Client">
          <Select value={cid} onChange={setCid} options={active.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <div className="grid-2">
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Type">
            <Select value={type} onChange={setType} options={(Object.keys(APPT_TYPE) as AppointmentType[]).map((k) => ({ value: k, label: APPT_TYPE[k].label }))} />
          </Field>
          <Field label="Duration">
            <NumberInput value={duration} onChange={setDuration} suffix="min" decimal={false} />
          </Field>
        </div>
        <Field label="Location">
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Studio, park, video call…" />
        </Field>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Focus for this session" />
        </Field>
        {!initial && (
          <div className="card tight">
            <div className="row-between">
              <div>
                <div className="bold">Repeat weekly</div>
                <div className="small faint">Same day and time</div>
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
        <div className="card tight row-between">
          <div>
            <div className="bold">Add to calendar</div>
            <div className="small faint">Download an .ics invite to send the client</div>
          </div>
          <Toggle on={exportIcs} onChange={setExportIcs} label="Export calendar invite" />
        </div>
      </div>
    </Sheet>
  );
}
