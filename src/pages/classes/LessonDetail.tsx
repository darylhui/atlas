import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, ClipboardList, Copy, Pencil, Play, Share2, StickyNote, Trash2 } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { ClassLesson } from '../../lib/types';
import { FORMATS, buildTimeline, cloneLesson, lessonSeconds, lessonText, presentCount, segmentSeconds, segmentSummary } from '../../lib/classes';
import { dayKey, fmtDay, fmtDuration, mean } from '../../lib/util';
import { shareText } from '../../lib/share';
import { ClassForm, ProgramBadge } from '../../components/classes';
import { Button, Card, confirmDialog, Empty, IconButton, Page, Section, toast } from '../../components/ui';

const PHASE_COLOR: Record<string, string> = {
  work: 'var(--accent)',
  rest: 'var(--series-1)',
  change: 'var(--series-2)',
  break: 'var(--series-4)',
  coach: 'var(--series-3)',
};

/** Proportional strip of every interval: the shape of the class at a glance. */
export function ClassShape({ lesson }: { lesson: Pick<ClassLesson, 'segments'> }) {
  const t = buildTimeline(lesson);
  const total = t.reduce((a, x) => a + x.sec, 0) || 1;
  return (
    <div>
      <div className="shape-strip" role="img" aria-label="Class timeline by block">
        {lesson.segments.map((s, si) => {
          const parts = t.filter((x) => x.seg === si && x.phase !== 'break');
          const brk = t.find((x) => x.seg === si && x.phase === 'break');
          const secs = parts.reduce((a, x) => a + x.sec, 0);
          return [
            <span key={`s${si}`} className="shape-block" style={{ flex: secs / total }} title={`${s.name} ${fmtDuration(secs)}`}>
              {parts.map((x, i) => (
                <i key={i} style={{ flex: x.sec, background: PHASE_COLOR[x.phase] }} />
              ))}
            </span>,
            brk ? <span key={`b${si}`} style={{ flex: brk.sec / total, background: PHASE_COLOR.break }} title={`Set-up ${fmtDuration(brk.sec)}`} /> : null,
          ];
        })}
      </div>
      <div className="legend mt-1">
        {[
          ['Work', 'work'],
          ['Rest', 'rest'],
          ['Station change', 'change'],
          ['Coach-led', 'coach'],
          ['Set-up', 'break'],
        ]
          .filter(([, k]) => t.some((x) => x.phase === k))
          .map(([label, k]) => (
            <span key={k}>
              <i className="key-rect" style={{ background: PHASE_COLOR[k] }} />
              {label}
            </span>
          ))}
      </div>
    </div>
  );
}

export function LessonSheet({ lesson }: { lesson: ClassLesson }) {
  return (
    <div className="stack">
      {lesson.segments.map((s, i) => (
        <div key={s.id} className="seg-card">
          <div className="seg-head">
            <span className="seg-num">{i + 1}</span>
            <div className="grow">
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <span className="bold" style={{ fontSize: 17 }}>
                  {s.name}
                </span>
                <span className="small tabular faint">{fmtDuration(segmentSeconds(s))}</span>
              </div>
              <div className="small muted mt-1 row wrap" style={{ gap: 6 }}>
                <span className="pill">{FORMATS[s.format].label}</span>
                <span>{segmentSummary(s)}</span>
                {s.zone ? <span className="zone-chip">Z{s.zone}</span> : null}
              </div>
            </div>
          </div>
          {s.moves.map((m, j) => (
            <div key={m.id} className="move-row">
              <span className="move-idx">{s.format === 'stations' ? `S${j + 1}` : j + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div className="bold">{m.name}</div>
                {m.options && <div className="xs faint">{m.options}</div>}
              </div>
              <div className="small muted" style={{ textAlign: 'right' }}>
                {[m.target, m.load].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
          {s.notes && (
            <div className="small row" style={{ gap: 6, padding: '10px 16px', borderTop: '1px solid var(--border)', color: 'var(--warning)' }}>
              <StickyNote size={14} style={{ flex: 'none' }} aria-hidden /> {s.notes}
            </div>
          )}
          {s.breakSec > 0 && i < lesson.segments.length - 1 && <div className="xs faint" style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>Then {fmtDuration(s.breakSec)} to set up the next block</div>}
        </div>
      ))}
    </div>
  );
}

export default function LessonDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const data = useStore((s) => s.data);
  const lesson = data.lessons.find((l) => l.id === id);
  const [schedule, setSchedule] = useState(false);
  const taught = useMemo(
    () => data.groupClasses.filter((g) => g.lessonId === id && g.status === 'completed').sort((a, b) => b.start.localeCompare(a.start)),
    [data.groupClasses, id],
  );

  if (!lesson) return <Page title="Lesson" back="/classes?tab=programmes"><Empty icon={<ClipboardList />} title="Lesson not found" /></Page>;

  const secs = lessonSeconds(lesson);
  const diff = Math.round(secs / 60) - lesson.targetMin;

  return (
    <Page
      title={lesson.title}
      back
      compact
      actions={
        <>
          <IconButton
            label="Share lesson"
            onClick={async () => {
              const r = await shareText(lesson.title, lessonText(lesson));
              if (r === 'copied') toast('Lesson copied — paste it to your coaching team');
            }}
          >
            <Share2 size={18} />
          </IconButton>
          <IconButton label="Edit lesson" onClick={() => nav(`/classes/lesson/${lesson.id}/edit`)}>
            <Pencil size={18} />
          </IconButton>
        </>
      }
    >
      <div className="row wrap" style={{ gap: 8, marginTop: -6 }}>
        <ProgramBadge type={lesson.programType} size="lg" />
        {(lesson.block || lesson.week) && <span className="pill">{[lesson.block, lesson.week ? `Week ${lesson.week}` : '', lesson.session ? `Session ${lesson.session}` : ''].filter(Boolean).join(' · ')}</span>}
        {lesson.example && <span className="pill">Example lesson</span>}
      </div>

      <Card>
        <div className="row-between" style={{ alignItems: 'baseline' }}>
          <span className="stat-value">
            {fmtDuration(secs)}
            <span className="stat-unit">of {lesson.targetMin} min</span>
          </span>
          <span className={`small ${Math.abs(diff) > 3 ? '' : 'faint'}`}>{diff === 0 ? 'On time' : diff > 0 ? `${diff} min over` : `${-diff} min spare`}</span>
        </div>
        <div className="mt-2">
          <ClassShape lesson={lesson} />
        </div>
        <div className="grid-2 mt-2">
          <Button variant="primary" onClick={() => nav(`/classes/timer/${lesson.id}`)}>
            <Play size={18} /> Teach now
          </Button>
          <Button onClick={() => setSchedule(true)}>
            <CalendarPlus size={18} /> Schedule
          </Button>
        </div>
      </Card>

      {(lesson.focus || lesson.equipment || lesson.setup) && (
        <div className="card flush">
          {[
            ['Focus', lesson.focus],
            ['Equipment', lesson.equipment],
            ['Set-up', lesson.setup],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span className="xs faint">{k}</span>
                <span>{v}</span>
              </div>
            ))}
        </div>
      )}

      <Section title="Blocks">
        <LessonSheet lesson={lesson} />
      </Section>

      {lesson.coachNotes && (
        <Section title="Coach notes">
          <Card>
            <p style={{ whiteSpace: 'pre-wrap' }}>{lesson.coachNotes}</p>
          </Card>
        </Section>
      )}

      {taught.length > 0 && (
        <Section title={`Taught ${taught.length} time${taught.length > 1 ? 's' : ''}`}>
          <Card>
            <div className="small muted">
              Average attendance {Math.round(mean(taught.map(presentCount)))} · last taught {fmtDay(dayKey(new Date(taught[0].start)))}
            </div>
            {taught.filter((g) => g.notes).slice(0, 3).map((g) => (
              <div key={g.id} className="small mt-2">
                <span className="faint">{fmtDay(dayKey(new Date(g.start)))}:</span> {g.notes}
              </div>
            ))}
          </Card>
        </Section>
      )}

      <div className="grid-2">
        <Button
          onClick={() => {
            const copy = cloneLesson(lesson, { title: `${lesson.title} (copy)`, week: lesson.week ? lesson.week + 1 : undefined });
            actions().upsert('lessons', copy);
            toast('Lesson duplicated');
            nav(`/classes/lesson/${copy.id}/edit`);
          }}
        >
          <Copy size={18} /> Duplicate
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            if (await confirmDialog({ title: `Delete “${lesson.title}”?`, body: 'Scheduled classes keep their time and program but lose the lesson link.', confirm: 'Delete', danger: true })) {
              actions().remove('lessons', lesson.id);
              nav('/classes?tab=programmes', { replace: true });
            }
          }}
        >
          <Trash2 size={18} /> Delete
        </Button>
      </div>

      {schedule && <ClassForm open lessonId={lesson.id} onClose={() => setSchedule(false)} />}
    </Page>
  );
}
