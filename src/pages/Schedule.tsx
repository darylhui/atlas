import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Appointment } from '../lib/types';
import { addDays, dayKey, dowShort, fmtDay, parseDay, relativeDay, today, weekStart } from '../lib/util';
import { AppointmentActions, AppointmentForm, AppointmentRow } from '../components/appointments';
import { Empty, IconButton, Page, Section, Stat } from '../components/ui';

export default function Schedule() {
  const appts = useStore((s) => s.data.appointments);
  const [params, setParams] = useSearchParams();
  const t = today();
  const [day, setDay] = useState(t);
  const [week, setWeek] = useState(weekStart(t));
  const [open, setOpen] = useState<Appointment>();
  const creating = params.get('new') === '1';
  const presetClient = params.get('client') ?? undefined;

  const byDay = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appts) {
      const k = dayKey(new Date(a.start));
      const list = m.get(k) ?? [];
      list.push(a);
      m.set(k, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return m;
  }, [appts]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const list = byDay.get(day) ?? [];
  const weekAppts = days.flatMap((d) => byDay.get(d) ?? []);
  const booked = weekAppts.filter((a) => a.status !== 'cancelled');
  const hours = booked.reduce((a, x) => a + x.durationMin, 0) / 60;
  const noShows = weekAppts.filter((a) => a.status === 'no_show').length;
  const upcoming = useMemo(
    () => appts.filter((a) => a.status === 'scheduled' && dayKey(new Date(a.start)) > day).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5),
    [appts, day],
  );

  const closeNew = () => {
    const p = new URLSearchParams(params);
    p.delete('new');
    p.delete('client');
    setParams(p, { replace: true });
  };

  const month = parseDay(week).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Page
      title="Schedule"
      subtitle={month}
      actions={
        <IconButton label="Book session" className="accent" onClick={() => setParams({ new: '1' })}>
          <Plus size={20} />
        </IconButton>
      }
    >
      <div className="card tight">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <IconButton label="Previous week" className="plain" onClick={() => setWeek(addDays(week, -7))}>
            <ChevronLeft size={20} />
          </IconButton>
          <button
            className="small bold"
            onClick={() => {
              setWeek(weekStart(t));
              setDay(t);
            }}
          >
            {week === weekStart(t) ? 'This week' : `Week of ${fmtDay(week)}`}
          </button>
          <IconButton label="Next week" className="plain" onClick={() => setWeek(addDays(week, 7))}>
            <ChevronRight size={20} />
          </IconButton>
        </div>
        <div className="day-strip">
          {days.map((d) => {
            const n = (byDay.get(d) ?? []).filter((a) => a.status !== 'cancelled').length;
            return (
              <button key={d} className={`day-cell${d === day ? ' on' : ''}${d === t ? ' today' : ''}`} onClick={() => setDay(d)}>
                {dowShort(d)}
                <b>{parseDay(d).getDate()}</b>
                <span className="dots">
                  {Array.from({ length: Math.min(n, 4) }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid-3">
        <Stat label="Booked" value={booked.length} delta={<span className="faint">this week</span>} />
        <Stat label="Hours" value={Math.round(hours * 10) / 10} delta={<span className="faint">coaching</span>} />
        <Stat label="No-shows" value={noShows} delta={<span className="faint">this week</span>} />
      </div>

      <Section title={relativeDay(day) === fmtDay(day) ? fmtDay(day, { weekday: true }) : `${relativeDay(day)} · ${fmtDay(day)}`} action={<button className="section-link" onClick={() => setParams({ new: '1' })}>+ Book</button>}>
        <div className="card flush">
          {list.map((a) => (
            <AppointmentRow key={a.id} a={a} onClick={() => setOpen(a)} />
          ))}
          {!list.length && <Empty icon={<CalendarDays />} title="Free day">Nothing booked.</Empty>}
        </div>
      </Section>

      {upcoming.length > 0 && (
        <Section title="Coming up">
          <div className="card flush">
            {upcoming.map((a) => (
              <div key={a.id}>
                <div className="xs faint" style={{ padding: '8px 16px 0' }}>
                  {relativeDay(dayKey(new Date(a.start)))}
                </div>
                <AppointmentRow a={a} onClick={() => setOpen(a)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <AppointmentActions appt={open} onClose={() => setOpen(undefined)} />
      {creating && <AppointmentForm open onClose={closeNew} day={day} clientId={presetClient} />}
    </Page>
  );
}
