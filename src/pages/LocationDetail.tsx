import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Dumbbell, MapPin, Pencil, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import type { MachineCategory } from '../lib/types';
import { StudioEditor } from '../components/classes';
import { CatalogSheet, catOptions, MachineCard, MachineSheet } from '../components/machines';
import { Button, Chips, Empty, IconButton, Page, SearchInput } from '../components/ui';

export default function LocationDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const studio = useStore((s) => s.data.studios.find((x) => x.id === id));
  const all = useStore((s) => s.data.machines);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState<'catalog' | 'custom'>();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<MachineCategory | 'all'>('all');

  if (!studio)
    return (
      <Page title="Location" back="/locations" compact>
        <Empty icon={<MapPin />} title="Location not found" />
      </Page>
    );

  const machines = all.filter((m) => m.studioId === id).sort((a, b) => a.name.localeCompare(b.name));
  const present = new Set(machines.map((m) => m.category));
  const active = cat !== 'all' && !present.has(cat) ? 'all' : cat;
  const ql = q.trim().toLowerCase();
  const list = machines.filter((m) => (active === 'all' || m.category === active) && (!ql || `${m.name} ${m.brand ?? ''}`.toLowerCase().includes(ql)));
  const open = machines.find((m) => m.id === params.get('machine'));
  const total = machines.reduce((n, m) => n + m.quantity, 0);

  return (
    <Page
      title={studio.name}
      subtitle={`${total} machine${total === 1 ? '' : 's'}`}
      back="/locations"
      compact
      actions={
        <IconButton label="Edit location" onClick={() => setEdit(true)}>
          <Pencil size={18} />
        </IconButton>
      }
    >
      <div className="row wrap">
        <div className="grow">
          {studio.address && (
            <a className="section-link" href={`https://maps.apple.com/?q=${encodeURIComponent(studio.address)}`} target="_blank" rel="noreferrer">
              <MapPin size={16} aria-hidden /> &nbsp;{studio.address}
            </a>
          )}
          {studio.notes && <p className="small muted">{studio.notes}</p>}
        </div>
        <Button variant="primary" onClick={() => setAdding('catalog')}>
          <Plus size={18} aria-hidden /> Add machines
        </Button>
      </div>
      {machines.length > 0 ? (
        <>
          <div className="stack">
            <SearchInput value={q} onChange={setQ} placeholder="Search this location" />
            {present.size > 1 && <Chips value={active} onChange={setCat} options={catOptions(present)} />}
          </div>
          <div className="machine-grid">
            {list.map((m) => (
              <MachineCard key={m.id} m={m} onClick={() => setParams({ machine: m.id }, { replace: true })} />
            ))}
          </div>
          {!list.length && <Empty icon={<Dumbbell />} title="No matches" />}
        </>
      ) : (
        <div className="card">
          <Empty icon={<Dumbbell />} title="No machines yet">
            Pick from the catalogue with pictures, or add your own with a photo.
          </Empty>
        </div>
      )}
      {edit && <StudioEditor studio={studio} onClose={() => setEdit(false)} />}
      {adding === 'catalog' && <CatalogSheet studioId={id} onClose={() => setAdding(undefined)} onCustom={() => setAdding('custom')} />}
      {adding === 'custom' && <MachineSheet studioId={id} onClose={() => setAdding(undefined)} />}
      {open && <MachineSheet key={open.id} machine={open} studioId={id} onClose={() => setParams({}, { replace: true })} />}
    </Page>
  );
}
