import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, TriangleAlert } from 'lucide-react';
import { actions, useData, useSettings } from '../lib/store';
import type { ActivityLevel, Client, Sex } from '../lib/types';
import { ACTIVITY } from '../lib/analytics/nutrition';
import { fromDisplayLength, fromDisplayWeight, lengthUnit, round, today, toDisplayLength, uid, weightUnit } from '../lib/util';
import { Button, Card, confirmDialog, Field, NumberInput, Page, Section, Segmented, Select, TextInput, toast, Toggle } from '../components/ui';

export const PARQ_QUESTIONS = [
  'Has a doctor ever said you have a heart condition and should only do physical activity recommended by a doctor?',
  'Do you feel pain in your chest when you do physical activity?',
  'In the past month, have you had chest pain when you were not doing physical activity?',
  'Do you have high blood pressure or take medication for blood pressure or a heart condition?',
  'Do you lose your balance because of dizziness, or do you ever lose consciousness?',
  'Do you have a bone, joint or soft-tissue problem that could be made worse by a change in physical activity?',
  'Do you know of any other reason why you should not do physical activity?',
];

const COLORS = ['#3987e5', '#e87ba4', '#199e70', '#c98500', '#9085e9', '#d95926', '#e66767', '#4fb3c9', '#a3c43b'];

export default function ClientForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const existing = useData((d) => d.clients.find((c) => c.id === id));
  const units = useSettings().units;
  const clientCount = useData((d) => d.clients.length);

  const [c, setC] = useState<Client>(
    () =>
      existing ?? {
        id: uid(),
        name: '',
        sex: 'female',
        color: COLORS[clientCount % COLORS.length],
        status: 'active',
        startDate: today(),
        activityLevel: 'moderate',
        tags: [],
        createdAt: new Date().toISOString(),
        parq: { answers: PARQ_QUESTIONS.map(() => false) },
      },
  );
  const [weight, setWeight] = useState<number | undefined>();
  const [tags, setTags] = useState(c.tags.join(', '));
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!c.name.trim()) {
      toast('Please enter a name');
      return;
    }
    const client: Client = { ...c, name: c.name.trim(), tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
    actions().upsert('clients', client);
    if (!existing && weight) {
      actions().upsert('measurements', { id: uid(), clientId: client.id, date: today(), weightKg: round(fromDisplayWeight(weight, units), 2) });
    }
    toast(existing ? 'Client updated' : `${client.name} added`);
    nav(`/clients/${client.id}`, { replace: true });
  };

  const parqYes = c.parq?.answers.some(Boolean);

  return (
    <Page title={existing ? 'Edit client' : 'New client'} back compact actions={<Button variant="primary" size="sm" onClick={save}>Save</Button>}>
      <Section title="Profile">
        <div className="stack">
          <Field label="Full name">
            <TextInput value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Jordan Smith" autoFocus={!existing} />
          </Field>
          <div className="grid-2">
            <Field label="Email">
              <TextInput type="email" inputMode="email" value={c.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput type="tel" inputMode="tel" value={c.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Date of birth">
              <input className="input" type="date" value={c.dob ?? ''} onChange={(e) => set('dob', e.target.value || undefined)} />
            </Field>
            <Field label="Sex (for BMR)">
              <Segmented<Sex> value={c.sex} onChange={(v) => set('sex', v)} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Height">
              <NumberInput
                value={c.heightCm ? round(toDisplayLength(c.heightCm, units), 1) : undefined}
                onChange={(v) => set('heightCm', v ? fromDisplayLength(v, units) : undefined)}
                suffix={lengthUnit(units)}
              />
            </Field>
            {!existing && (
              <Field label="Starting weight">
                <NumberInput value={weight} onChange={setWeight} suffix={weightUnit(units)} />
              </Field>
            )}
          </div>
          <Field label="Activity level">
            <Select<ActivityLevel>
              value={c.activityLevel}
              onChange={(v) => set('activityLevel', v)}
              options={(Object.keys(ACTIVITY) as ActivityLevel[]).map((k) => ({ value: k, label: `${ACTIVITY[k].label} — ${ACTIVITY[k].hint}` }))}
            />
          </Field>
          <Field label="Colour">
            <div className="row wrap" style={{ gap: 8 }}>
              {COLORS.map((col) => (
                <button
                  key={col}
                  aria-label={`Colour ${col}`}
                  onClick={() => set('color', col)}
                  style={{ width: 36, height: 36, borderRadius: 12, background: col, outline: c.color === col ? '3px solid var(--text)' : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Goals & coaching">
        <div className="stack">
          <Field label="Main goal">
            <textarea className="textarea" value={c.goalSummary ?? ''} onChange={(e) => set('goalSummary', e.target.value)} placeholder="What do they want to achieve, and why?" />
          </Field>
          <Field label="Tags" hint="Comma separated, e.g. Fat loss, Online, Morning">
            <TextInput value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Start date">
              <input className="input" type="date" value={c.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={c.status} onChange={(v) => set('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'archived', label: 'Archived' }]} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Health screening">
        <div className="stack">
          <Field label="Injuries & limitations">
            <textarea className="textarea" value={c.injuries ?? ''} onChange={(e) => set('injuries', e.target.value)} placeholder="Past or current injuries, movements to avoid" />
          </Field>
          <Field label="Medical notes">
            <textarea className="textarea" value={c.medical ?? ''} onChange={(e) => set('medical', e.target.value)} placeholder="Conditions, medication, GP clearance" />
          </Field>
          <Field label="Emergency contact">
            <TextInput value={c.emergencyContact ?? ''} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name & phone" />
          </Field>
          <Card className="flush">
            <div style={{ padding: '14px 16px 4px' }}>
              <div className="card-title">PAR-Q readiness questionnaire</div>
              <div className="card-sub">Hand the device to your client to answer.</div>
            </div>
            {PARQ_QUESTIONS.map((q, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="grow small">{q}</div>
                <Toggle
                  label={q}
                  on={!!c.parq?.answers[i]}
                  onChange={(v) => set('parq', { answers: (c.parq?.answers ?? PARQ_QUESTIONS.map(() => false)).map((a, j) => (j === i ? v : a)), completedAt: today() })}
                />
              </div>
            ))}
          </Card>
          {parqYes && (
            <div className="banner danger">
              <TriangleAlert size={20} />
              <span>One or more “yes” answers — obtain medical clearance before increasing training intensity.</span>
            </div>
          )}
        </div>
      </Section>

      <Button variant="primary" block onClick={save}>
        {existing ? 'Save changes' : 'Add client'}
      </Button>

      {existing && (
        <Button
          variant="danger"
          block
          onClick={async () => {
            const ok = await confirmDialog({
              title: `Delete ${existing.name}?`,
              body: 'This permanently removes the client and all of their sessions, check-ins, nutrition logs, measurements and appointments. Consider archiving instead.',
              confirm: 'Delete forever',
              danger: true,
            });
            if (ok) {
              actions().deleteClient(existing.id);
              toast('Client deleted');
              nav('/clients', { replace: true });
            }
          }}
        >
          <Trash2 size={18} /> Delete client
        </Button>
      )}
    </Page>
  );
}
