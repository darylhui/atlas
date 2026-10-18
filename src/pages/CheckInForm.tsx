import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { actions, useStore } from '../lib/store';
import type { CheckIn, MuscleGroup } from '../lib/types';
import { MUSCLE_LABEL, SORE_AREAS } from '../lib/seed/exercises';
import { baseline, readiness, readinessZone } from '../lib/analytics/recovery';
import { firstName, today, uid } from '../lib/util';
import { Button, Card, Empty, Field, NumberInput, Page, Ring, Scale, Section, Stepper, toast, ZonePill } from '../components/ui';

export const SCALES = {
  sleepQuality: { labels: ['Awful', 'Poor', 'OK', 'Good', 'Great'] },
  energy: { labels: ['Drained', 'Low', 'OK', 'Good', 'Charged'] },
  mood: { labels: ['Low', 'Meh', 'OK', 'Good', 'Great'] },
  stress: { labels: ['None', 'Mild', 'Some', 'High', 'Very high'] },
  soreness: { labels: ['None', 'Mild', 'Moderate', 'Sore', 'Very'] },
};

export function CheckInFields({ c, set }: { c: CheckIn; set: (p: Partial<CheckIn>) => void }) {
  const toggleArea = (m: MuscleGroup) => set({ soreAreas: c.soreAreas.includes(m) ? c.soreAreas.filter((x) => x !== m) : [...c.soreAreas, m] });
  return (
    <div className="stack-lg">
      <Section title="Sleep">
        <div className="stack">
          <Card className="row-between">
            <div>
              <div className="bold">Hours slept</div>
              <div className="small faint">Last night</div>
            </div>
            <Stepper value={c.sleepHours} onChange={(v) => set({ sleepHours: v })} step={0.5} min={0} max={14} format={(v) => `${v}h`} />
          </Card>
          <div className="label">Sleep quality</div>
          <Scale value={c.sleepQuality} onChange={(v) => set({ sleepQuality: v })} {...SCALES.sleepQuality} />
        </div>
      </Section>

      <Section title="How do you feel?">
        <div className="stack">
          <div className="label">Energy</div>
          <Scale value={c.energy} onChange={(v) => set({ energy: v })} {...SCALES.energy} />
          <div className="label">Mood</div>
          <Scale value={c.mood} onChange={(v) => set({ mood: v })} {...SCALES.mood} />
          <div className="label">Stress</div>
          <Scale value={c.stress} onChange={(v) => set({ stress: v })} {...SCALES.stress} />
        </div>
      </Section>

      <Section title="Muscle soreness">
        <div className="stack">
          <Scale value={c.soreness} onChange={(v) => set({ soreness: v, soreAreas: v === 1 ? [] : c.soreAreas })} {...SCALES.soreness} />
          {c.soreness > 1 && (
            <>
              <div className="label">Where? (tap all that apply)</div>
              <div className="chips wrap-chips">
                {SORE_AREAS.map((m) => (
                  <button key={m} className={`chip${c.soreAreas.includes(m) ? ' on' : ''}`} onClick={() => toggleArea(m)}>
                    {MUSCLE_LABEL[m]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Section>
    </div>
  );
}

export default function CheckInForm() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const client = useStore((s) => s.data.clients.find((c) => c.id === id));
  const checkIns = useStore((s) => s.data.checkIns);
  const editId = params.get('id');
  const existing = editId ? checkIns.find((c) => c.id === editId) : checkIns.find((c) => c.clientId === id && c.date === today());

  const [c, setC] = useState<CheckIn>(
    () =>
      existing ?? {
        id: uid(),
        clientId: id,
        date: today(),
        sleepHours: 7,
        sleepQuality: 3,
        energy: 3,
        mood: 3,
        stress: 2,
        soreness: 1,
        soreAreas: [],
      },
  );
  const set = (p: Partial<CheckIn>) => setC((x) => ({ ...x, ...p }));
  const base = useMemo(() => baseline(checkIns, id, c.date), [checkIns, id, c.date]);
  const r = readiness(c, base);
  const z = readinessZone(r.score);

  if (!client) return <Page title="Check-in" back><Empty icon="?" title="Client not found" /></Page>;

  const save = () => {
    actions().upsert('checkIns', c);
    toast(`Check-in saved · readiness ${r.score}`);
    nav(`/clients/${client.id}?tab=recovery`, { replace: true });
  };

  return (
    <Page title={`${firstName(client.name)}’s check-in`} subtitle={existing ? 'Editing an existing check-in' : 'About 30 seconds — answer for this morning'} back compact>
      <Field label="Date">
        <input className="input" type="date" value={c.date} max={today()} onChange={(e) => set({ date: e.target.value })} />
      </Field>

      <CheckInFields c={c} set={set} />

      <Section title="Wearable data (optional)">
        <div className="grid-2">
          <Field label="HRV (ms)" hint="Morning reading, e.g. from Apple Watch or Whoop">
            <NumberInput value={c.hrv} onChange={(v) => set({ hrv: v })} decimal={false} placeholder="e.g. 62" />
          </Field>
          <Field label="Resting HR (bpm)">
            <NumberInput value={c.restingHr} onChange={(v) => set({ restingHr: v })} decimal={false} placeholder="e.g. 58" />
          </Field>
        </div>
      </Section>

      <Field label="Notes">
        <textarea className="textarea" value={c.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} placeholder="Anything affecting training today?" />
      </Field>

      <Card>
        <div className="row" style={{ gap: 16 }}>
          <Ring pct={r.score / 100} size={92} color={`var(--${z.zone})`}>
            <b>{r.score}</b>
          </Ring>
          <div className="grow">
            <ZonePill zone={z.zone}>{z.label}</ZonePill>
            <p className="small muted mt-1">{z.advice}</p>
            {base.hrv && c.hrv && <p className="xs faint mt-1">HRV {c.hrv} vs baseline {Math.round(base.hrv)} ms</p>}
          </div>
        </div>
      </Card>

      <Button variant="primary" block onClick={save}>
        Save check-in
      </Button>
      {existing && (
        <Button
          variant="danger"
          block
          onClick={() => {
            actions().remove('checkIns', existing.id);
            nav(-1);
          }}
        >
          <Trash2 size={18} /> Delete check-in
        </Button>
      )}
    </Page>
  );
}
