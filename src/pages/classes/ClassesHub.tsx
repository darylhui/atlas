import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPin, Play, Plus, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { GroupClass } from '../../lib/types';
import { classPay, classTitle, presentCount } from '../../lib/classes';
import { addDays, dayKey, fmtDay, fmtTime, mean, money, relativeDay, today, weekStart } from '../../lib/util';
import { ClassForm, ClassRow, LessonLibrary, ProgramBadge, StudiosSheet } from '../../components/classes';
import { Button, Card, Empty, IconButton, Page, Section, Segmented, Stat } from '../../components/ui';

type Tab = 'timetable' | 'programmes' | 'history';

export default function ClassesHub() {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'timetable';
  const creating = params.get('new') === '1';
  const [studios, setStudios] = useState(false);
  const t = today();
  const cur = data.settings.currency;

  const sorted = useMemo(() => [...data.groupClasses].sort((a, b) => a.start.localeCompare(b.start)), [data.groupClasses]);
  const nowIso = new Date(Date.now() - 50 * 60000).toISOString();
  const upcoming = sorted.filter((g) => g.status === 'scheduled' && g.start >= nowIso);
  const next = upcoming[0];
  const nextLesson = next && data.lessons.find((l) => l.id === next.lessonId);
  const week = sorted.filter((g) => g.status !== 'cancelled' && dayKey(new Date(g.start)) >= weekStart(t) && dayKey(new Date(g.start)) < addDays(weekStart(t), 7));
  const done28 = sorted.filter((g) => g.status === 'completed' && dayKey(new Date(g.start)) >= addDays(t, -27));
  const avgAttendance = done28.length ? Math.round(mean(done28.map(presentCount))) : undefined;
  const fill = done28.filter((g) => g.capacity).map((g) => presentCount(g) / g.capacity!);
  const pay = classPay(data.groupClasses, data.studios, `${t.slice(0, 7)}-01`, t);
  const history = sorted.filter((g) => g.status !== 'scheduled' || dayKey(new Date(g.start)) < t).reverse();

  const byDay = useMemo(() => {
    const m = new Map<string, GroupClass[]>();
    for (const g of upcoming.filter((x) => dayKey(new Date(x.start)) <= addDays(t, 13))) {
      const k = dayKey(new Date(g.start));
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return [...m.entries()];
  }, [upcoming, t]);

  const setTab = (v: Tab) => setParams({ tab: v }, { replace: true });

  return (
    <Page
      title="Classes"
      subtitle={`${week.length} this week · ${data.studios.length} studio${data.studios.length === 1 ? '' : 's'}`}
      actions={
        <>
          <IconButton label="Studios" onClick={() => setStudios(true)}>
            <MapPin size={19} />
          </IconButton>
          <IconButton label="Schedule a class" className="accent" onClick={() => setParams({ tab, new: '1' })}>
            <Plus size={20} />
          </IconButton>
        </>
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'timetable', label: 'Timetable' },
          { value: 'programmes', label: 'Lesson programmes' },
          { value: 'history', label: 'History' },
        ]}
      />

      {tab === 'timetable' && (
        <>
          {next ? (
            <Card>
              <div className="row-between">
                <span className="label" style={{ padding: 0 }}>
                  Next class · {relativeDay(dayKey(new Date(next.start)))} {fmtTime(next.start)}
                </span>
                <ProgramBadge type={next.programType} />
              </div>
              <div className="bold mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                {classTitle(next, data.lessons)}
              </div>
              <div className="small muted mt-1 row" style={{ gap: 6 }}>
                <Users size={14} /> {next.attendees.length}
                {next.capacity ? ` / ${next.capacity}` : ''} booked
                {next.studioId ? ` · ${data.studios.find((s) => s.id === next.studioId)?.name ?? ''}` : ''}
              </div>
              <div className="grid-2 mt-2">
                <Button variant="primary" disabled={!nextLesson} onClick={() => nextLesson && nav(`/classes/timer/${nextLesson.id}?class=${next.id}`)}>
                  <Play size={18} /> Teach
                </Button>
                <Button onClick={() => nav(`/classes/session/${next.id}`)}>
                  <Users size={18} /> Attendance
                </Button>
              </div>
              {!nextLesson && <div className="xs faint mt-1">Attach a lesson programme to run the class timer.</div>}
            </Card>
          ) : (
            <Card>
              <Empty icon={<CalendarDays />} title="No classes scheduled" action={<Button variant="primary" onClick={() => setParams({ tab, new: '1' })}>Schedule a class</Button>}>
                Add your studio timetable, then teach each class from its lesson programme.
              </Empty>
            </Card>
          )}

          <div className="grid-4">
            <Stat label="Classes this week" value={week.length} />
            <Stat label="Avg attendance" value={avgAttendance ?? '–'} delta={<span className="faint">last 4 weeks</span>} />
            <Stat label="Fill rate" value={fill.length ? `${Math.round(mean(fill) * 100)}%` : '–'} delta={<span className="faint">of capacity</span>} />
            <Stat label="Class pay this month" value={money(pay, cur)} delta={<span className="faint">from studio rates</span>} />
          </div>

          {byDay.map(([day, list]) => (
            <Section key={day} title={day === t ? `Today · ${fmtDay(day)}` : `${relativeDay(day)}${relativeDay(day) === fmtDay(day) ? '' : ` · ${fmtDay(day)}`}`}>
              <div className="card flush">
                {list.map((g) => (
                  <ClassRow key={g.id} g={g} onClick={() => nav(`/classes/session/${g.id}`)} />
                ))}
              </div>
            </Section>
          ))}
          {byDay.length > 0 && (
            <button className="section-link center" onClick={() => nav('/schedule')}>
              Open full schedule →
            </button>
          )}
        </>
      )}

      {tab === 'programmes' && <LessonLibrary />}

      {tab === 'history' && (
        <div className="card flush">
          {history.slice(0, 60).map((g) => (
            <ClassRow key={g.id} g={g} showDay={fmtDay(dayKey(new Date(g.start)))} onClick={() => nav(`/classes/session/${g.id}`)} />
          ))}
          {!history.length && <Empty icon={<CalendarDays />} title="No classes taught yet" />}
        </div>
      )}

      {creating && (
        <ClassForm
          open
          day={t}
          lessonId={params.get('lesson') ?? undefined}
          onClose={() => setParams({ tab }, { replace: true })}
        />
      )}
      {studios && <StudiosSheet onClose={() => setStudios(false)} />}
    </Page>
  );
}
