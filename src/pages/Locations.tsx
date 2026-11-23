import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Studio } from '../lib/types';
import { uid } from '../lib/util';
import { StudioEditor } from '../components/classes';
import { MachineImage } from '../components/machines';
import { Button, Empty, IconButton, Page } from '../components/ui';

export default function Locations() {
  const studios = useStore((s) => s.data.studios);
  const machines = useStore((s) => s.data.machines);
  const nav = useNavigate();
  const [edit, setEdit] = useState<Studio>();
  const create = () => setEdit({ id: uid(), name: '' });
  return (
    <Page
      title="Locations"
      subtitle={`${studios.length} location${studios.length === 1 ? '' : 's'} · ${machines.reduce((n, m) => n + m.quantity, 0)} machines`}
      actions={
        <IconButton label="New location" className="accent" onClick={create}>
          <Plus size={20} />
        </IconButton>
      }
    >
      <div className="location-grid">
        {[...studios]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((s) => {
            const here = machines.filter((m) => m.studioId === s.id);
            const out = here.filter((m) => m.status === 'out').length;
            return (
              <button key={s.id} className="card card-press" onClick={() => nav(`/locations/${s.id}`)}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="icon-tile">
                    <MapPin size={18} aria-hidden />
                  </span>
                  <div className="grow">
                    <div className="card-title truncate">{s.name}</div>
                    <div className="small faint truncate">{s.address || 'No address'}</div>
                  </div>
                  {out > 0 && <span className="pill critical">{out} out of order</span>}
                </div>
                <div className="machine-strip">
                  {here.slice(0, 4).map((m) => (
                    <MachineImage key={m.id} m={m} width={200} />
                  ))}
                  <span className="small muted">{here.length ? `${here.reduce((n, m) => n + m.quantity, 0)} machines` : 'No machines yet'}</span>
                </div>
              </button>
            );
          })}
      </div>
      {!studios.length && (
        <div className="card">
          <Empty icon={<MapPin />} title="No locations yet" action={<Button variant="primary" onClick={create}>Add location</Button>}>
            Add the gyms, studios and condo gyms you coach at, then list their machines.
          </Empty>
        </div>
      )}
      {edit && <StudioEditor studio={edit} onClose={() => setEdit(undefined)} />}
    </Page>
  );
}
