import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CircleCheck, ListOrdered, Pause, Play, SkipBack, SkipForward, StickyNote, Volume2, VolumeX, X } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import { FORMATS, buildTimeline, type Interval } from '../../lib/classes';
import { fmtDuration } from '../../lib/util';
import { requestWakeLock, speak, tone, unlockAudio } from '../../lib/sound';
import { Button, confirmDialog, Empty, ListItem, Sheet, toast, useNow } from '../../components/ui';
import { ProgramBadge } from '../../components/classes';
import { fs } from '../../lib/display';

const PHASE_LABEL: Record<Interval['phase'], string> = {
  work: 'Work',
  rest: 'Rest',
  change: 'Change stations',
  break: 'Set up',
  coach: 'Coach-led',
};

interface Clock {
  running: boolean;
  /** Seconds into the class at the moment `anchor` was taken. */
  pos: number;
  anchor: number;
}

export default function ClassTimer() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const classId = params.get('class') ?? undefined;
  const nav = useNavigate();
  const lesson = useStore((s) => s.data.lessons.find((l) => l.id === id));
  const groupClass = useStore((s) => (classId ? s.data.groupClasses.find((g) => g.id === classId) : undefined));
  const timeline = useMemo(() => (lesson ? buildTimeline(lesson) : []), [lesson]);
  const starts = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const x of timeline) {
      out.push(acc);
      acc += x.sec;
    }
    return out;
  }, [timeline]);
  const total = timeline.reduce((a, x) => a + x.sec, 0);

  const [clock, setClock] = useState<Clock>({ running: false, pos: 0, anchor: 0 });
  const [started, setStarted] = useState(false);
  const [voice, setVoice] = useState(false);
  const [jump, setJump] = useState(false);
  const now = useNow(200);
  const position = Math.min(total, clock.running ? clock.pos + (now - clock.anchor) / 1000 : clock.pos);
  const done = started && position >= total;

  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= position) idx = i;
  const cur = timeline[idx];
  const seg = lesson?.segments[cur?.seg ?? 0];
  // During a set-up break, the board previews the block coming up.
  const boardSeg = cur?.phase === 'break' ? lesson?.segments[cur.seg + 1] : seg;
  const elapsedIn = position - (starts[idx] ?? 0);
  const remaining = Math.max(0, (cur?.sec ?? 0) - elapsedIn);
  const next = timeline[idx + 1];

  // Keep the screen awake for the whole class.
  useEffect(() => {
    let release: (() => void) | undefined;
    void requestWakeLock().then((r) => (release = r));
    return () => release?.();
  }, []);

  // Stop when the class ends.
  useEffect(() => {
    if (done && clock.running) {
      setClock({ running: false, pos: total, anchor: 0 });
      tone(1320, 600, 0.4);
      if (voice) speak('Class complete. Great work everyone.');
    }
  }, [done, clock.running, total, voice]);

  // Cue each new interval.
  const lastIdx = useRef(-1);
  useEffect(() => {
    if (!started || !clock.running || !cur || idx === lastIdx.current) return;
    lastIdx.current = idx;
    if (cur.phase === 'work') tone(1320, 380, 0.38);
    else tone(660, 300, 0.3);
    if (voice) {
      const mv = cur.move != null ? seg?.moves[cur.move]?.name : undefined;
      speak(cur.phase === 'work' ? mv ?? cur.label : cur.phase === 'change' ? 'Change stations' : cur.phase === 'break' ? `Set up for ${lesson?.segments[cur.seg + 1]?.name ?? 'the next block'}` : PHASE_LABEL[cur.phase]);
    }
  }, [idx, cur, started, clock.running, voice, seg, lesson]);

  // 3-2-1 ticks before each change.
  const lastTick = useRef<string>('');
  const whole = Math.ceil(remaining);
  useEffect(() => {
    if (!clock.running || cur?.countUp) return;
    const key = `${idx}-${whole}`;
    if (whole >= 1 && whole <= 3 && lastTick.current !== key) {
      lastTick.current = key;
      tone(880, 120, 0.28);
    }
  }, [whole, idx, clock.running, cur]);

  const seek = useCallback(
    (pos: number, run?: boolean) => {
      lastIdx.current = -1;
      setClock((c) => ({ running: run ?? c.running, pos: Math.max(0, Math.min(total, pos)), anchor: Date.now() }));
    },
    [total],
  );

  const toggle = useCallback(() => {
    unlockAudio();
    setStarted(true);
    setClock((c) => (c.running ? { running: false, pos: c.pos + (Date.now() - c.anchor) / 1000, anchor: 0 } : { running: true, pos: c.pos >= total ? 0 : c.pos, anchor: Date.now() }));
  }, [total]);

  // Skip/back read the live clock inside the state update so rapid taps each move one interval.
  const indexAt = useCallback(
    (pos: number) => {
      let i = 0;
      for (let j = 0; j < starts.length; j++) if (starts[j] <= pos + 1e-6) i = j;
      return i;
    },
    [starts],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      lastIdx.current = -1;
      setClock((c) => {
        const pos = c.running ? c.pos + (Date.now() - c.anchor) / 1000 : c.pos;
        const i = indexAt(pos);
        const target = dir === 1 ? starts[i + 1] ?? total : pos - starts[i] > 2 ? starts[i] : starts[Math.max(0, i - 1)];
        return { ...c, pos: Math.max(0, Math.min(total, target)), anchor: Date.now() };
      });
    },
    [indexAt, starts, total],
  );
  const skip = useCallback(() => step(1), [step]);
  const back = useCallback(() => step(-1), [step]);

  // Keyboard / remote: space = play/pause, arrows = skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') skip();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, skip, back]);

  if (!lesson)
    return (
      <div className="main no-tabs">
        <Empty icon={<X />} title="Lesson not found" action={<Button onClick={() => nav('/classes')}>Back to classes</Button>} />
      </div>
    );

  const exit = async () => {
    if (clock.running && !(await confirmDialog({ title: 'Leave the class timer?', body: 'The timer will stop.', confirm: 'Leave' }))) return;
    nav(-1);
  };

  const finish = () => {
    if (groupClass && groupClass.status === 'scheduled') {
      actions().patch('groupClasses', groupClass.id, { status: 'completed' });
      toast('Class marked as taught');
      nav(`/classes/session/${groupClass.id}`, { replace: true });
    } else nav(-1);
  };

  // Segment progress strip (each block sized by its share of the class).
  const segBounds = lesson.segments.map((_, i) => {
    const first = timeline.findIndex((x) => x.seg === i);
    let last = -1;
    timeline.forEach((x, j) => x.seg === i && (last = j));
    const a = first >= 0 ? starts[first] : 0;
    const b = last >= 0 ? starts[last] + timeline[last].sec : a;
    return { a, b };
  });

  const phase = !started ? 'coach' : done ? 'work' : cur?.phase ?? 'coach';
  const highlighted = cur?.move;
  const moveName = cur?.move != null ? seg?.moves[cur.move]?.name : undefined;
  const nextText = next
    ? next.phase === 'work'
      ? next.move != null
        ? lesson.segments[next.seg].moves[next.move]?.name ?? next.label
        : `${lesson.segments[next.seg].name} · ${next.label}`
      : `${PHASE_LABEL[next.phase]} ${fmtDuration(next.sec)}`
    : 'Finish';

  return (
    <div className="ct" data-phase={phase}>
      <div className="ct-head">
        <button className="icon-btn" aria-label="Exit timer" onClick={exit}>
          <X size={20} />
        </button>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="bold truncate" style={{ fontSize: fs(17) }}>
            {lesson.title}
          </div>
          <div className="xs muted truncate">
            {lesson.programType}
            {groupClass ? ` · ${groupClass.attendees.filter((a) => a.present).length || groupClass.attendees.length} in class` : ''}
          </div>
        </div>
        <div className="tabular small muted" style={{ textAlign: 'right' }}>
          {fmtDuration(position)} / {fmtDuration(total)}
          <div className="xs faint">{fmtDuration(total - position)} left</div>
        </div>
        <button className="icon-btn" aria-label={voice ? 'Turn voice cues off' : 'Turn voice cues on'} onClick={() => setVoice((v) => !v)}>
          {voice ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        <button className="icon-btn" aria-label="Jump to block" onClick={() => setJump(true)}>
          <ListOrdered size={19} />
        </button>
      </div>

      <div className="ct-main">
        <div className="ct-clock">
          {!started ? (
            <>
              <ProgramBadge type={lesson.programType} size="lg" />
              <div className="ct-time">{fmtDuration(total)}</div>
              <div className="ct-move">{lesson.title}</div>
              <div className="ct-meta">
                {lesson.segments.length} blocks · starts with {lesson.segments[0]?.name}
              </div>
              <Button variant="primary" className="mt-3" onClick={toggle} style={{ minHeight: 60, padding: '0 32px', fontSize: fs(19) }}>
                <Play size={22} /> Start class
              </Button>
              <div className="xs faint mt-2">Tip: mirror this screen to the studio TV with AirPlay. Space bar or arrow keys work too.</div>
            </>
          ) : done ? (
            <>
              <span className="ct-phase">Done</span>
              <div className="ct-time" style={{ color: 'var(--md-secondary)' }}><CircleCheck size="0.8em" strokeWidth={1.5} aria-hidden /></div>
              <div className="ct-move">Class complete</div>
              <div className="row mt-3" style={{ gap: 10 }}>
                <Button variant="primary" onClick={finish}>
                  {groupClass?.status === 'scheduled' ? 'Mark class as taught' : 'Done'}
                </Button>
                <Button onClick={() => seek(0, false)}>Restart</Button>
              </div>
            </>
          ) : (
            <>
              <span className="ct-phase">{PHASE_LABEL[cur.phase]}</span>
              <div className={`ct-time${remaining <= 3 && !cur.countUp ? ' low' : ''}`} aria-live="off">
                {cur.countUp ? fmtDuration(elapsedIn) : fmtDuration(Math.ceil(remaining))}
              </div>
              <div className="ct-move">{cur.phase === 'work' || cur.phase === 'rest' ? moveName ?? (cur.phase === 'work' ? seg?.name : 'Recover') : cur.phase === 'coach' ? seg?.name : cur.phase === 'break' ? 'Set up the next block' : cur.label}</div>
              {cur.phase === 'break' ? (
                <div className="ct-meta">
                  Up next: {boardSeg?.name} · {boardSeg ? FORMATS[boardSeg.format].label : ''}
                  {boardSeg?.zone ? ` · Zone ${boardSeg.zone}` : ''}
                </div>
              ) : (
                <div className="ct-meta">
                  {seg?.name} · {seg ? FORMATS[seg.format].label : ''}
                  {cur.rounds > 1 ? ` · ${seg?.format === 'stations' ? 'Rotation' : seg?.format === 'emom' ? 'Minute' : 'Round'} ${cur.round}/${cur.rounds}` : ''}
                  {cur.sets && cur.sets > 1 ? ` · Set ${cur.set}/${cur.sets}` : ''}
                  {cur.label.startsWith('Partner') ? ` · ${cur.label}` : ''}
                  {seg?.zone ? ` · Zone ${seg.zone}` : ''}
                  {cur.countUp ? ` · cap ${fmtDuration(cur.sec)}` : ''}
                </div>
              )}
              <div className="ct-next">Next: {nextText}</div>
            </>
          )}
        </div>

        {started && !done && boardSeg && boardSeg.moves.length > 0 && (
          <div className="ct-board" aria-label="Block board">
            {boardSeg.moves.map((m, i) => (
              <div key={m.id} className={`ct-board-row${highlighted === i && boardSeg === seg ? ' on' : ''}`}>
                <span className="idx">{boardSeg.format === 'stations' ? `S${i + 1}` : i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="nm">{m.name}</div>
                  {(m.target || m.load || m.options) && <div className="sub">{[m.target, m.load, m.options].filter(Boolean).join(' · ')}</div>}
                </div>
              </div>
            ))}
            {boardSeg.notes && (
              <div className="ct-board-row">
                <span className="idx"><StickyNote size={20} aria-hidden /></span>
                <div className="sub">{boardSeg.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ct-foot">
        <div className="ct-strip" aria-hidden>
          {segBounds.map((b, i) => (
            <span key={i} style={{ flex: Math.max(1, b.b - b.a) }} onClick={() => seek(b.a)}>
              <i style={{ width: `${Math.max(0, Math.min(1, (position - b.a) / Math.max(1, b.b - b.a))) * 100}%` }} />
            </span>
          ))}
        </div>
        {started && !done && (
          <div className="ct-controls">
            <button className="ct-btn" aria-label="Previous interval" onClick={back}>
              <SkipBack size={24} />
            </button>
            <button className="ct-btn big" aria-label={clock.running ? 'Pause' : 'Resume'} onClick={toggle}>
              {clock.running ? <Pause size={34} /> : <Play size={34} />}
            </button>
            <button className="ct-btn" aria-label="Next interval" onClick={skip}>
              <SkipForward size={24} />
            </button>
          </div>
        )}
      </div>

      {jump && (
        <Sheet open onClose={() => setJump(false)} title="Jump to block">
          <div className="card flush">
            {lesson.segments.map((s, i) => (
              <ListItem
                key={s.id}
                title={`${i + 1}. ${s.name}`}
                subtitle={`${FORMATS[s.format].label} · starts at ${fmtDuration(segBounds[i].a)}`}
                right={cur?.seg === i && started && !done ? <span className="pill accent">Now</span> : undefined}
                onClick={() => {
                  setStarted(true);
                  unlockAudio();
                  seek(segBounds[i].a);
                  setJump(false);
                }}
              />
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
