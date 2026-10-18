import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardList, Repeat, Share2, Trash2, Trophy } from 'lucide-react';
import { actions, useStore } from '../lib/store';
import type { WorkoutSession } from '../lib/types';
import { sessionLoad } from '../lib/analytics/recovery';
import { isWorking, sessionPRs, sessionSetCount, sessionVolume } from '../lib/analytics/strength';
import { compact, firstName, fmtDay, fmtDuration, fmtNum, fmtTime, fmtWeight, toDisplayWeight, uid, weightUnit } from '../lib/util';
import { shareText } from '../lib/share';
import { Avatar, Button, Card, confirmDialog, Empty, Page, Section, Stat, toast } from '../components/ui';
import { RPE_SCALE } from './WorkoutLogger';

export default function SessionSummary() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const data = useStore((s) => s.data);
  const session = data.sessions.find((s) => s.id === id);
  const client = data.clients.find((c) => c.id === session?.clientId);
  const units = data.settings.units;
  const exMap = new Map(data.exercises.map((e) => [e.id, e]));
  const prs = useMemo(() => (session ? sessionPRs(session, data.sessions) : []), [session, data.sessions]);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const justDone = params.get('done') === '1';

  if (!session || !client) return <Page title="Session" back><Empty icon={<ClipboardList />} title="Session not found" /></Page>;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;

  const vol = sessionVolume(session);
  const wu = weightUnit(units);
  const prSet = new Set(prs.filter((p) => p.kind === 'e1rm').map((p) => p.exerciseId));

  const fmtSet = (exId: string, s: WorkoutSession['exercises'][number]['sets'][number]) => {
    const t = exMap.get(exId)?.tracking;
    const tag = s.type === 'warmup' ? ' (W)' : s.type === 'drop' ? ' (D)' : s.type === 'failure' ? ' (F)' : '';
    if (t === 'weight_reps') return `${fmtNum(toDisplayWeight(s.weight ?? 0, units))}×${s.reps}${tag}`;
    if (t === 'reps') return `${s.reps} reps${tag}`;
    if (t === 'time') return `${fmtDuration(s.durationSec ?? 0)}${tag}`;
    return `${s.distanceM ?? 0}m in ${fmtDuration(s.durationSec ?? 0)}`;
  };

  const summaryText = () => {
    const lines = [
      `💪 Workout summary — ${firstName(client.name)}, ${fmtDay(session.date, { weekday: true })}`,
      `${session.name} · ${session.durationMin ?? '–'} min${session.sessionRpe ? ` · RPE ${session.sessionRpe}` : ''}`,
      '',
      ...session.exercises.map((e) => `• ${exMap.get(e.exerciseId)?.name}: ${e.sets.map((s) => fmtSet(e.exerciseId, s)).join(', ')}${prSet.has(e.exerciseId) ? ' 🏆 PR' : ''}`),
      '',
      vol > 0 ? `Total volume: ${Math.round(toDisplayWeight(vol, units)).toLocaleString()} ${wu}` : '',
      prs.length ? `🏆 ${prs.filter((p) => p.kind === 'e1rm').length || prs.length} new personal record${prs.length > 1 ? 's' : ''}!` : '',
      session.notes ? `\nCoach notes: ${session.notes}` : '',
      `\n— ${data.settings.trainerName || 'Your coach'}${data.settings.businessName ? `, ${data.settings.businessName}` : ''}`,
    ];
    return lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');
  };

  const saveTemplate = () => {
    actions().upsert('templates', {
      id: uid(),
      name: `${session.name} (${firstName(client.name)})`,
      description: `Saved from ${fmtDay(session.date)} session`,
      createdAt: new Date().toISOString(),
      exercises: session.exercises.map((e) => {
        const working = e.sets.filter((s) => s.type !== 'warmup');
        const reps = working.map((s) => s.reps).filter((r): r is number => r != null);
        const repStr = reps.length ? (Math.min(...reps) === Math.max(...reps) ? String(reps[0]) : `${Math.min(...reps)}-${Math.max(...reps)}`) : e.target ?? '10';
        return { id: uid(), exerciseId: e.exerciseId, sets: working.length || e.sets.length, reps: repStr, restSec: e.restSec ?? data.settings.defaultRestSec };
      }),
    });
    toast('Saved as template');
  };

  return (
    <Page title={justDone ? 'Workout complete 🎉' : session.name} back={justDone ? `/clients/${client.id}` : true} compact>
      <div className="row">
        <Avatar name={client.name} color={client.color} size={44} />
        <div className="grow">
          <div className="bold">{client.name}</div>
          <div className="small muted">
            {justDone ? `${session.name} · ` : ''}
            {fmtDay(session.date, { weekday: true, year: true })} · {fmtTime(session.startedAt)}
          </div>
        </div>
      </div>

      <div className="grid-4">
        <Stat label="Duration" value={session.durationMin ?? '–'} unit="min" />
        <Stat label="Volume" value={compact(toDisplayWeight(vol, units))} unit={wu} />
        <Stat label="Working sets" value={sessionSetCount(session)} />
        <Stat label="Session RPE" value={session.sessionRpe ?? '–'} delta={<span className="faint">{session.sessionRpe ? RPE_SCALE[session.sessionRpe] : ''} · load {sessionLoad(session)} AU</span>} />
      </div>

      {prs.length > 0 && (
        <Card style={{ background: 'linear-gradient(135deg, rgba(198,244,50,0.14), rgba(198,244,50,0.03))', borderColor: 'rgba(198,244,50,0.3)' }}>
          <div className="row" style={{ gap: 8 }}>
            <Trophy size={20} color="var(--accent)" />
            <span className="bold">{prs.length} personal record{prs.length > 1 ? 's' : ''}</span>
          </div>
          <div className="stack mt-2" style={{ gap: 6 }}>
            {prs.map((p, i) => (
              <div key={i} className="small row-between">
                <span>
                  {exMap.get(p.exerciseId)?.name} · {p.kind === 'e1rm' ? 'est. 1RM' : 'heaviest'}
                </span>
                <span className="tabular">
                  <b>{fmtWeight(p.value, units)}</b>
                  <span className="faint"> (was {fmtWeight(p.previous, units)})</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid-2">
        <Button
          variant="primary"
          onClick={async () => {
            const r = await shareText('Workout summary', summaryText());
            if (r === 'copied') toast('Summary copied — paste it into WhatsApp or iMessage');
          }}
        >
          <Share2 size={18} /> Send to client
        </Button>
        <Button
          onClick={() => {
            const nid = actions().startSession(client.id, { repeatSessionId: session.id });
            nav(`/workout/${nid}`);
          }}
        >
          <Repeat size={18} /> Repeat
        </Button>
      </div>

      <Section title="Exercises">
        <div className="stack">
          {session.exercises.map((e) => {
            const def = exMap.get(e.exerciseId);
            return (
              <Card key={e.id}>
                <div className="row-between">
                  <div className="bold">
                    {def?.name}
                    {prSet.has(e.exerciseId) && <span className="pr-flag">PR</span>}
                  </div>
                  {def?.tracking === 'weight_reps' && <span className="small faint">{compact(toDisplayWeight(e.sets.filter(isWorking).reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0), units))} {wu}</span>}
                </div>
                <div className="row wrap mt-1" style={{ gap: 6 }}>
                  {e.sets.map((s, i) => (
                    <span key={s.id} className="pill tabular" style={{ fontSize: 13 }}>
                      <span className="faint">{i + 1}</span> {fmtSet(e.exerciseId, s)}
                      {s.rpe ? <span className="faint">@{s.rpe}</span> : null}
                    </span>
                  ))}
                </div>
                {e.notes && <div className="small faint mt-1">📝 {e.notes}</div>}
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Notes">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => actions().patch('sessions', session.id, { notes: notes.trim() || undefined })} placeholder="Session notes" />
      </Section>

      <div className="grid-2">
        <Button onClick={saveTemplate}>
          <ClipboardList size={18} /> Save as template
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            if (await confirmDialog({ title: 'Delete this session?', body: 'Volume, PRs and load history will be recalculated without it.', confirm: 'Delete', danger: true })) {
              actions().remove('sessions', session.id);
              nav(`/clients/${client.id}`, { replace: true });
            }
          }}
        >
          <Trash2 size={18} /> Delete
        </Button>
      </div>
    </Page>
  );
}
