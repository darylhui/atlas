import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Plus, Ruler, Trash2 } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { Client, Measurement, PhotoPose, ProgressPhoto } from '../../lib/types';
import { compressImage, deletePhoto, loadPhoto, savePhoto } from '../../lib/db';
import { fmtDay, fmtNum, fromDisplayLength, fromDisplayWeight, lengthUnit, round, today, toDisplayLength, toDisplayWeight, uid, weightUnit } from '../../lib/util';
import { ChartCard, LineChart } from '../../components/charts';
import { Button, Card, Chips, confirmDialog, Delta, Empty, Field, NumberInput, Section, Segmented, Sheet, toast } from '../../components/ui';

type MKey = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'hipsCm' | 'chestCm' | 'armCm' | 'thighCm';

const FIELDS: { key: MKey; label: string; kind: 'weight' | 'pct' | 'length' }[] = [
  { key: 'weightKg', label: 'Weight', kind: 'weight' },
  { key: 'bodyFatPct', label: 'Body fat', kind: 'pct' },
  { key: 'waistCm', label: 'Waist', kind: 'length' },
  { key: 'hipsCm', label: 'Hips', kind: 'length' },
  { key: 'chestCm', label: 'Chest', kind: 'length' },
  { key: 'armCm', label: 'Arm', kind: 'length' },
  { key: 'thighCm', label: 'Thigh', kind: 'length' },
];

export default function BodyTab({ client }: { client: Client }) {
  const data = useStore((s) => s.data);
  const units = data.settings.units;
  const [adding, setAdding] = useState<Measurement | null>(null);
  const [metric, setMetric] = useState<MKey>('weightKg');
  const ms = useMemo(() => data.measurements.filter((m) => m.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date)), [data.measurements, client.id]);
  const goal = data.goals.find((g) => g.clientId === client.id && (metric === 'weightKg' ? g.kind === 'bodyweight' : metric === 'bodyFatPct' ? g.kind === 'bodyfat' : false));

  const conv = (k: MKey, v: number) => {
    const f = FIELDS.find((x) => x.key === k)!;
    return f.kind === 'weight' ? toDisplayWeight(v, units) : f.kind === 'length' ? toDisplayLength(v, units) : v;
  };
  const unitOf = (k: MKey) => {
    const f = FIELDS.find((x) => x.key === k)!;
    return f.kind === 'weight' ? weightUnit(units) : f.kind === 'length' ? lengthUnit(units) : '%';
  };

  const pts = ms.filter((m) => m[metric] != null).map((m) => ({ x: m.date, y: round(conv(metric, m[metric]!), 1) }));
  const available = FIELDS.filter((f) => ms.some((m) => m[f.key] != null));

  return (
    <div className="stack-lg">
      {ms.length ? (
        <>
          <div className="stack">
            <Chips value={metric} onChange={setMetric} options={(available.length ? available : FIELDS.slice(0, 1)).map((f) => ({ value: f.key, label: f.label }))} />
            <ChartCard
              title={`${FIELDS.find((f) => f.key === metric)!.label} (${unitOf(metric)})`}
              subtitle={
                pts.length > 1 ? (
                  <>
                    <Delta value={pts[pts.length - 1].y - pts[0].y} goodWhen={metric === 'weightKg' || metric === 'bodyFatPct' || metric === 'waistCm' ? (goal ? (goal.targetValue < goal.startValue ? 'down' : 'up') : 'none') : 'none'} suffix={` ${unitOf(metric)}`} /> since {fmtDay(pts[0].x)}
                  </>
                ) : undefined
              }
              table={{ columns: ['Date', unitOf(metric)], rows: [...pts].reverse().map((p) => [fmtDay(p.x), fmtNum(p.y)]) }}
            >
              {pts.length ? (
                <LineChart
                  ariaLabel={`${metric} trend`}
                  series={[{ name: metric, color: 'var(--series-1)', area: false, points: pts }]}
                  refLine={goal ? { y: round(conv(metric, goal.targetValue), 1), label: `Goal ${fmtNum(conv(metric, goal.targetValue))}` } : undefined}
                  yFormat={(v) => fmtNum(v, 1)}
                  tipFormat={(v) => `${fmtNum(v)} ${unitOf(metric)}`}
                />
              ) : (
                <div className="small faint">No {metric} entries yet.</div>
              )}
            </ChartCard>
          </div>

          <Section title="Measurements" action={<button className="section-link" onClick={() => setAdding({ id: uid(), clientId: client.id, date: today() })}>+ Add</button>}>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Start</th>
                    <th>Latest</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {available.map((f) => {
                    const withVal = ms.filter((m) => m[f.key] != null);
                    const a = conv(f.key, withVal[0][f.key]!);
                    const b = conv(f.key, withVal[withVal.length - 1][f.key]!);
                    return (
                      <tr key={f.key}>
                        <td>{f.label}</td>
                        <td>{fmtNum(a)}</td>
                        <td>
                          <b>{fmtNum(b)}</b> <span className="faint">{unitOf(f.key)}</span>
                        </td>
                        <td>
                          {b - a > 0 ? '+' : ''}
                          {fmtNum(b - a)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card flush mt-2">
              {[...ms]
                .reverse()
                .slice(0, 8)
                .map((m) => (
                  <button key={m.id} className="list-item" onClick={() => setAdding(m)}>
                    <Ruler size={18} className="faint" />
                    <div className="grow">
                      <div className="bold">{fmtDay(m.date, { year: true })}</div>
                      <div className="xs faint truncate">
                        {FIELDS.filter((f) => m[f.key] != null)
                          .map((f) => `${f.label} ${fmtNum(conv(f.key, m[f.key]!))}${unitOf(f.key) === '%' ? '%' : ' ' + unitOf(f.key)}`)
                          .join(' · ')}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </Section>
        </>
      ) : (
        <Empty icon={<Ruler />} title="No measurements yet" action={<Button variant="primary" onClick={() => setAdding({ id: uid(), clientId: client.id, date: today() })}><Plus size={18} /> Add measurement</Button>}>
          Track bodyweight, body fat and girths to show progress beyond the scale.
        </Empty>
      )}

      <Photos client={client} />

      {adding && <MeasurementSheet m={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function MeasurementSheet({ m, onClose }: { m: Measurement; onClose: () => void }) {
  const units = useStore((s) => s.data.settings.units);
  const exists = useStore((s) => s.data.measurements.some((x) => x.id === m.id));
  const [draft, setDraft] = useState<Measurement>(m);
  const toUi = (f: (typeof FIELDS)[number], v?: number) => (v == null ? undefined : round(f.kind === 'weight' ? toDisplayWeight(v, units) : f.kind === 'length' ? toDisplayLength(v, units) : v, 1));
  const fromUi = (f: (typeof FIELDS)[number], v?: number) => (v == null ? undefined : f.kind === 'weight' ? fromDisplayWeight(v, units) : f.kind === 'length' ? fromDisplayLength(v, units) : v);
  const save = () => {
    actions().upsert('measurements', draft);
    toast('Measurement saved');
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={exists ? 'Edit measurement' : 'New measurement'}
      footer={
        <>
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                actions().remove('measurements', m.id);
                onClose();
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" block onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Date">
          <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </Field>
        <div className="grid-2">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <NumberInput
                value={toUi(f, draft[f.key])}
                onChange={(v) => setDraft({ ...draft, [f.key]: fromUi(f, v) })}
                suffix={f.kind === 'weight' ? weightUnit(units) : f.kind === 'length' ? lengthUnit(units) : '%'}
              />
            </Field>
          ))}
        </div>
        <div className="xs faint">Measure at the same time of day, ideally first thing in the morning, for consistent trends.</div>
      </div>
    </Sheet>
  );
}

function usePhoto(id?: string) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let live = true;
    if (id) void loadPhoto(id).then((v) => live && setSrc(v));
    return () => {
      live = false;
    };
  }, [id]);
  return src;
}

function PhotoTile({ p, onClick, selected }: { p: ProgressPhoto; onClick: () => void; selected?: boolean }) {
  const src = usePhoto(p.id);
  return (
    <button className="photo-tile" onClick={onClick} style={{ outline: selected ? '3px solid var(--accent)' : 'none', outlineOffset: -3 }}>
      {src && <img src={src} alt={`${p.pose} ${p.date}`} />}
      <span className="photo-cap">
        {fmtDay(p.date)} · {p.pose}
      </span>
    </button>
  );
}

function Photos({ client }: { client: Client }) {
  const photos = useStore((s) => s.data.photos);
  const list = useMemo(() => photos.filter((p) => p.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date)), [photos, client.id]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [viewing, setViewing] = useState<ProgressPhoto>();
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const dataUrl = await compressImage(f);
        const id = uid();
        await savePhoto(id, dataUrl);
        actions().upsert('photos', { id, clientId: client.id, date: today(), pose });
      }
      toast('Photo saved');
    } catch {
      toast('Could not read that image');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const [a, b] = compare.map((id) => list.find((p) => p.id === id)!).sort((x, y) => x.date.localeCompare(y.date));

  return (
    <Section title="Progress photos" action={list.length > 1 ? <button className="section-link" onClick={() => { setComparing((v) => !v); setCompare([]); }}>{comparing ? 'Done' : 'Compare'}</button> : undefined}>
      <div className="stack">
        <div className="row">
          <div className="grow">
            <Segmented value={pose} onChange={setPose} options={[{ value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' }]} />
          </div>
          <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={18} /> {busy ? 'Saving…' : 'Add'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        {comparing && <div className="small muted">Tap two photos to compare them side by side.</div>}
        {list.length ? (
          <>
            <div className="photo-grid">
              {list.map((p) => (
                <PhotoTile key={p.id} p={p} selected={compare.includes(p.id)} onClick={() => (comparing ? toggleCompare(p.id) : setViewing(p))} />
              ))}
            </div>
            {list.length > 1 && !comparing && (
              <Button size="sm" onClick={() => { setComparing(true); setCompare([list[list.length - 1].id, list[0].id]); }}>
                Compare first vs latest
              </Button>
            )}
          </>
        ) : (
          <Card>
            <div className="small muted">Photos are stored only on this device, compressed to save space. Take them in the same spot and lighting each time for fair comparisons.</div>
          </Card>
        )}
        {comparing && a && b && <CompareSlider before={a} after={b} />}
      </div>
      {viewing && (
        <Sheet open onClose={() => setViewing(undefined)} title={`${fmtDay(viewing.date, { year: true })} · ${viewing.pose}`}>
          <ViewPhoto p={viewing} />
          <Button
            variant="danger"
            block
            className="mt-2"
            onClick={async () => {
              if (await confirmDialog({ title: 'Delete photo?', confirm: 'Delete', danger: true })) {
                await deletePhoto(viewing.id);
                actions().remove('photos', viewing.id);
                setViewing(undefined);
              }
            }}
          >
            <Trash2 size={18} /> Delete photo
          </Button>
        </Sheet>
      )}
    </Section>
  );
}

function ViewPhoto({ p }: { p: ProgressPhoto }) {
  const src = usePhoto(p.id);
  return <div className="compare">{src && <img src={src} alt="" />}</div>;
}

function CompareSlider({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const a = usePhoto(before.id);
  const b = usePhoto(after.id);
  const [pos, setPos] = useState(50);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  return (
    <Card>
      <div className="row-between small" style={{ marginBottom: 8 }}>
        <span className="pill">Before · {fmtDay(before.date)}</span>
        <span className="pill accent">After · {fmtDay(after.date)}</span>
      </div>
      <div className="compare" onPointerDown={move} onPointerMove={(e) => e.buttons && move(e)} style={{ maxWidth: 480, margin: '0 auto' }}>
        {b && <img src={b} alt="After" />}
        {a && <img src={a} alt="Before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
        <div className="handle" style={{ left: `${pos}%` }} />
      </div>
    </Card>
  );
}
