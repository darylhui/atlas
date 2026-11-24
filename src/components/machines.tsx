import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Dumbbell, ExternalLink, ImageDown, Plus, Trash2 } from 'lucide-react';
import { loadPhoto } from '../lib/db';
import { addFromCatalog, fetchMachinePhoto, photoKey, removeMachine, setMachinePhoto } from '../lib/machines';
import { MACHINE_CATALOG, MACHINE_CATEGORY, sized } from '../lib/seed/machines';
import { actions, useStore } from '../lib/store';
import type { ID, Machine, MachineCategory } from '../lib/types';
import { uid } from '../lib/util';
import { ExercisePicker } from './sheets';
import { Button, Chips, confirmDialog, Empty, Field, SearchInput, Segmented, Select, Sheet, Stepper, TextInput, toast } from './ui';

type Cat = MachineCategory | 'all';
const CATS = Object.keys(MACHINE_CATEGORY) as MachineCategory[];
export const catOptions = (present: Set<MachineCategory>) => [{ value: 'all' as Cat, label: 'All' }, ...CATS.filter((c) => present.has(c)).map((c) => ({ value: c as Cat, label: MACHINE_CATEGORY[c] }))];

/** Saved picture first, then the store's own image, then an icon. */
export function MachineImage({ m, width = 400 }: { m: Pick<Machine, 'name' | 'imageUrl'> & { id?: ID; photoAt?: string }; width?: number }) {
  const [src, setSrc] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setSrc(undefined);
    setFailed(false);
    if (m.id && m.photoAt) void loadPhoto(photoKey(m.id)).then((v) => live && setSrc(v));
    return () => {
      live = false;
    };
  }, [m.id, m.photoAt, m.imageUrl]);
  const url = src ?? (m.imageUrl && !failed ? sized(m.imageUrl, width) : undefined);
  return (
    <span className="machine-img">
      {url ? <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <Dumbbell size={28} aria-hidden />}
    </span>
  );
}

export function MachineCard({ m, onClick }: { m: Machine; onClick: () => void }) {
  return (
    <button className="machine-card" onClick={onClick}>
      <MachineImage m={m} />
      <span className="machine-body">
        <span className="bold two-line">{m.name}</span>
        <span className="xs faint">{[MACHINE_CATEGORY[m.category], m.quantity > 1 ? `× ${m.quantity}` : null].filter(Boolean).join(' · ')}</span>
        {m.status === 'out' && <span className="pill critical">Out of order</span>}
      </span>
    </button>
  );
}

export function CatalogSheet({ studioId, onClose, onCustom }: { studioId: ID; onClose: () => void; onCustom: () => void }) {
  const machines = useStore((s) => s.data.machines);
  const here = useMemo(() => new Set(machines.filter((m) => m.studioId === studioId).map((m) => m.catalogId)), [machines, studioId]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat>('all');
  const [sel, setSel] = useState<string[]>([]);
  const ql = q.trim().toLowerCase();
  const list = MACHINE_CATALOG.filter((c) => (cat === 'all' || c.category === cat) && (!ql || c.name.toLowerCase().includes(ql) || MACHINE_CATEGORY[c.category].toLowerCase().includes(ql)));

  const add = () => {
    const picks = MACHINE_CATALOG.filter((c) => sel.includes(c.id));
    toast(`${picks.length} machine${picks.length === 1 ? '' : 's'} added`);
    onClose();
    void addFromCatalog(studioId, picks).then((n) => {
      if (n < picks.length) toast(`${picks.length - n} picture${picks.length - n === 1 ? '' : 's'} not saved. Open the machine to try again.`);
    });
  };

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title="Add machines"
      footer={
        sel.length ? (
          <Button variant="primary" block onClick={add}>
            Add {sel.length} machine{sel.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <Button block onClick={onCustom}>
            <Plus size={18} /> Not listed? Add your own
          </Button>
        )
      }
    >
      <div className="stack">
        <SearchInput value={q} onChange={setQ} placeholder="Search machines or brands" />
        <Chips value={cat} onChange={setCat} options={catOptions(new Set(MACHINE_CATALOG.map((c) => c.category)))} />
        <div className="machine-grid">
          {list.map((c) => {
            const on = sel.includes(c.id);
            return (
              <button key={c.id} className={`machine-card${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}>
                <MachineImage m={c} width={300} />
                <span className="machine-body">
                  <span className="bold two-line">{c.name}</span>
                  <span className="xs faint">{here.has(c.id) ? 'Already here' : MACHINE_CATEGORY[c.category]}</span>
                </span>
                {on && (
                  <span className="machine-tick">
                    <Check size={16} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!list.length && (
          <Empty icon={<Dumbbell />} title="No matches">
            Try another search, or add your own below.
          </Empty>
        )}
        <p className="xs faint">Product names and pictures: F1 Recreation and the manufacturers. A picture is saved on this device when you add a machine.</p>
      </div>
    </Sheet>
  );
}

/** Create (no `machine`) or edit a machine. */
export function MachineSheet({ machine, studioId, onClose }: { machine?: Machine; studioId: ID; onClose: () => void }) {
  const live = useStore((s) => s.data.machines.find((x) => x.id === machine?.id));
  const exercises = useStore((s) => s.data.exercises);
  const [m, setM] = useState<Machine>(machine ?? { id: uid(), studioId, name: '', category: 'strength', quantity: 1, status: 'ok' });
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!m.name.trim()) return toast('Name is required');
    setBusy(true);
    actions().upsert('machines', { ...m, name: m.name.trim(), brand: m.brand?.trim() || undefined, notes: m.notes?.trim() || undefined, photoAt: live?.photoAt });
    if (file && !(await setMachinePhoto(m.id, file))) {
      setBusy(false);
      return toast('Saved, but that image could not be read');
    }
    toast(machine ? 'Machine updated' : 'Machine added');
    onClose();
  };

  if (picking)
    return (
      <ExercisePicker
        open
        multi
        onClose={() => setPicking(false)}
        onPick={(ids) => setM((x) => ({ ...x, exerciseIds: [...new Set([...(x.exerciseIds ?? []), ...ids])] }))}
      />
    );

  return (
    <Sheet
      open
      onClose={onClose}
      title={machine ? 'Machine' : 'New machine'}
      footer={
        <>
          {machine && (
            <Button
              variant="danger"
              aria-label="Remove machine"
              onClick={async () => {
                if (!(await confirmDialog({ title: `Remove ${machine.name}?`, confirm: 'Remove', danger: true }))) return;
                await removeMachine(machine.id);
                onClose();
              }}
            >
              <Trash2 size={18} aria-hidden />
            </Button>
          )}
          <Button variant="primary" block disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="machine-hero">{preview ? <span className="machine-img"><img src={preview} alt="" /></span> : <MachineImage m={live ?? m} width={900} />}</div>
        <div className="row wrap">
          <Button size="sm" onClick={() => input.current?.click()}>
            <Camera size={16} aria-hidden /> {live?.photoAt || preview ? 'Replace photo' : 'Add photo'}
          </Button>
          {live?.imageUrl && !live.photoAt && !preview && (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await fetchMachinePhoto(live);
                setBusy(false);
                toast(ok ? 'Picture saved on this device' : 'Could not save that picture');
              }}
            >
              <ImageDown size={16} aria-hidden /> Save for offline
            </Button>
          )}
          {m.sourceUrl && (
            <a className="btn btn-ghost btn-sm" href={m.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> Product page
            </a>
          )}
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        </div>
        <Field label="Name">
          <TextInput value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="e.g. Plate-loaded hack squat" />
        </Field>
        <div className="grid-2">
          <Field label="Brand">
            <TextInput value={m.brand ?? ''} onChange={(e) => setM({ ...m, brand: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={m.category} onChange={(v) => setM({ ...m, category: v })} options={CATS.map((c) => ({ value: c, label: MACHINE_CATEGORY[c] }))} />
          </Field>
        </div>
        <div className="row-between">
          <span className="bold">How many</span>
          <Stepper value={m.quantity} onChange={(v) => setM({ ...m, quantity: v })} min={1} max={99} />
        </div>
        <Segmented value={m.status} onChange={(v) => setM({ ...m, status: v })} options={[{ value: 'ok', label: 'Working' }, { value: 'out', label: 'Out of order' }]} />
        <Field label="Set-up notes">
          <textarea className="textarea" value={m.notes ?? ''} onChange={(e) => setM({ ...m, notes: e.target.value })} placeholder="Seat positions, starting weight, quirks, where it is on the floor" />
        </Field>
        <div>
          <div className="label">Exercises on this machine</div>
          <div className="chips wrap-chips mt-1">
            {(m.exerciseIds ?? []).map((id) => {
              const name = exercises.find((e) => e.id === id)?.name;
              return name ? (
                <button key={id} className="chip" aria-label={`Remove ${name}`} onClick={() => setM({ ...m, exerciseIds: m.exerciseIds?.filter((x) => x !== id) })}>
                  {name} ×
                </button>
              ) : null;
            })}
            <button className="chip" onClick={() => setPicking(true)}>
              <Plus size={16} aria-hidden /> Link exercise
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
