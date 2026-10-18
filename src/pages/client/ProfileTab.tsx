import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Minus, Package as PackageIcon, Phone, Pin, Plus, StickyNote, Trash2 } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { Client, Package } from '../../lib/types';
import { addDays, age, fmtDay, fmtNum, money, today, toDisplayLength, lengthUnit, uid } from '../../lib/util';
import { PARQ_QUESTIONS } from '../ClientForm';
import { Button, Card, Empty, Field, IconButton, NumberInput, Progress, Section, Sheet, TextInput, toast, Toggle } from '../../components/ui';

export default function ProfileTab({ client }: { client: Client }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [note, setNote] = useState('');
  const [pkg, setPkg] = useState<Package | null>(null);
  const units = data.settings.units;
  const notes = data.notes.filter((n) => n.clientId === client.id).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));
  const packages = data.packages.filter((p) => p.clientId === client.id).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  const parqYes = client.parq?.answers.map((a, i) => (a ? PARQ_QUESTIONS[i] : null)).filter(Boolean) ?? [];

  const addNote = () => {
    if (!note.trim()) return;
    actions().upsert('notes', { id: uid(), clientId: client.id, date: new Date().toISOString(), text: note.trim() });
    setNote('');
  };

  const info: [string, string | undefined][] = [
    ['Age', age(client.dob) != null ? `${age(client.dob)} (${fmtDay(client.dob!, { year: true })})` : undefined],
    ['Height', client.heightCm ? `${fmtNum(toDisplayLength(client.heightCm, units), 0)} ${lengthUnit(units)}` : undefined],
    ['Client since', fmtDay(client.startDate, { year: true })],
    ['Emergency contact', client.emergencyContact],
  ];

  return (
    <div className="stack-lg">
      <div className="cols">
        <Section title="Notes">
          <div className="stack">
            <div className="row">
              <div className="grow">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a coaching note…" onKeyDown={(e) => e.key === 'Enter' && addNote()} />
              </div>
              <Button variant="primary" onClick={addNote} disabled={!note.trim()}>
                Add
              </Button>
            </div>
            <div className="card flush">
              {notes.map((n) => (
                <div key={n.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
                    <div className="xs faint mt-1">
                      {n.pinned ? 'Pinned · ' : ''}
                      {fmtDay(n.date.slice(0, 10), { year: true })}
                    </div>
                  </div>
                  <IconButton label={n.pinned ? 'Unpin' : 'Pin'} className="plain" onClick={() => actions().patch('notes', n.id, { pinned: !n.pinned })}>
                    <Pin size={16} color={n.pinned ? 'var(--accent)' : undefined} />
                  </IconButton>
                  <IconButton label="Delete note" className="plain" onClick={() => actions().remove('notes', n.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              ))}
              {!notes.length && <Empty icon={<StickyNote />} title="No notes">Cues, preferences, life events — everything you want to remember.</Empty>}
            </div>
          </div>
        </Section>

        <Section title="Packages" action={<button className="section-link" onClick={() => setPkg({ id: uid(), clientId: client.id, name: '10 Session Pack', totalSessions: 10, usedSessions: 0, price: 0, purchasedAt: today(), paid: true })}>+ Add</button>}>
          <div className="stack">
            {packages.map((p) => {
              const left = p.totalSessions - p.usedSessions;
              const expired = p.expiresAt && p.expiresAt < today();
              return (
                <Card key={p.id}>
                  <div className="row-between">
                    <button className="grow" style={{ textAlign: 'left' }} onClick={() => setPkg(p)}>
                      <div className="bold">{p.name}</div>
                      <div className="xs faint">
                        {money(p.price, data.settings.currency)} · bought {fmtDay(p.purchasedAt)}
                        {p.expiresAt ? ` · ${expired ? 'expired' : 'expires'} ${fmtDay(p.expiresAt)}` : ''}
                        {!p.paid ? ' · unpaid' : ''}
                      </div>
                    </button>
                    <div className="row" style={{ gap: 6 }}>
                      <IconButton label="Remove a used session" onClick={() => actions().patch('packages', p.id, { usedSessions: Math.max(0, p.usedSessions - 1) })}>
                        <Minus size={16} />
                      </IconButton>
                      <IconButton label="Use a session" onClick={() => actions().patch('packages', p.id, { usedSessions: Math.min(p.totalSessions, p.usedSessions + 1) })}>
                        <Plus size={16} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress pct={p.usedSessions / p.totalSessions} color={left <= 2 ? 'var(--warning)' : undefined} />
                  </div>
                  <div className="row-between xs mt-1">
                    <span className="faint">
                      {p.usedSessions} of {p.totalSessions} used
                    </span>
                    <span className="bold">{left} left</span>
                  </div>
                </Card>
              );
            })}
            {!packages.length && <Empty icon={<PackageIcon />} title="No packages">Track prepaid session blocks — sessions are deducted automatically when you finish a workout.</Empty>}
          </div>
        </Section>
      </div>

      <div className="cols">
        <Section title="Details" action={<button className="section-link" onClick={() => nav(`/clients/${client.id}/edit`)}>Edit</button>}>
          <div className="card flush">
            {client.phone && (
              <a className="list-item" href={`tel:${client.phone}`}>
                <Phone size={18} className="faint" />
                <span className="grow">{client.phone}</span>
              </a>
            )}
            {client.email && (
              <a className="list-item" href={`mailto:${client.email}`}>
                <Mail size={18} className="faint" />
                <span className="grow truncate">{client.email}</span>
              </a>
            )}
            {info
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="list-item">
                  <span className="grow faint">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            {client.goalSummary && (
              <div className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="faint small">Goal</span>
                <span>{client.goalSummary}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title="Health">
          <div className="card flush">
            <div className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <span className="faint small">Injuries & limitations</span>
              <span>{client.injuries || 'None recorded'}</span>
            </div>
            <div className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <span className="faint small">Medical</span>
              <span>{client.medical || 'None recorded'}</span>
            </div>
            <div className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <span className="faint small">PAR-Q {client.parq?.completedAt ? `· ${fmtDay(client.parq.completedAt, { year: true })}` : ''}</span>
              {client.parq?.completedAt ? (
                parqYes.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
                    {parqYes.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                ) : (
                  <span>All “no” — cleared for activity</span>
                )
              ) : (
                <span className="faint">Not completed</span>
              )}
            </div>
          </div>
        </Section>
      </div>

      {pkg && <PackageSheet pkg={pkg} onClose={() => setPkg(null)} />}
    </div>
  );
}

function PackageSheet({ pkg, onClose }: { pkg: Package; onClose: () => void }) {
  const exists = useStore((s) => s.data.packages.some((p) => p.id === pkg.id));
  const currency = useStore((s) => s.data.settings.currency);
  const [p, setP] = useState(pkg);
  return (
    <Sheet
      open
      onClose={onClose}
      title={exists ? 'Edit package' : 'New package'}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => { actions().remove('packages', p.id); onClose(); }}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button
            variant="primary"
            block
            onClick={() => {
              actions().upsert('packages', p);
              toast(exists ? 'Package updated' : 'Package added');
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Name">
          <TextInput value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <div className="grid-2">
          <Field label="Sessions">
            <NumberInput value={p.totalSessions} onChange={(v) => setP({ ...p, totalSessions: v ?? 0 })} decimal={false} />
          </Field>
          <Field label="Used">
            <NumberInput value={p.usedSessions} onChange={(v) => setP({ ...p, usedSessions: v ?? 0 })} decimal={false} />
          </Field>
          <Field label={`Price (${currency})`}>
            <NumberInput value={p.price} onChange={(v) => setP({ ...p, price: v ?? 0 })} />
          </Field>
          <Field label="Purchased">
            <input className="input" type="date" value={p.purchasedAt} onChange={(e) => setP({ ...p, purchasedAt: e.target.value })} />
          </Field>
        </div>
        <Field label="Expires (optional)">
          <div className="row">
            <input className="input" type="date" value={p.expiresAt ?? ''} onChange={(e) => setP({ ...p, expiresAt: e.target.value || undefined })} />
            <Button size="sm" onClick={() => setP({ ...p, expiresAt: addDays(p.purchasedAt, 90) })}>
              +90d
            </Button>
          </div>
        </Field>
        <div className="row-between">
          <span className="bold">Paid</span>
          <Toggle on={p.paid} onChange={(v) => setP({ ...p, paid: v })} label="Paid" />
        </div>
        {p.totalSessions > 0 && p.price > 0 && <div className="xs faint">{money(p.price / p.totalSessions, currency)} per session</div>}
      </div>
    </Sheet>
  );
}
