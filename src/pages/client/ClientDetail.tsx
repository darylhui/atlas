import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity, Dumbbell, MonitorSmartphone, Pencil, Salad, Share2 } from 'lucide-react';
import { useData } from '../../lib/store';
import { age } from '../../lib/util';
import { Avatar, Empty, IconButton, Page } from '../../components/ui';
import { StartWorkoutSheet } from '../../components/sheets';
import { ShareProgressSheet } from '../../components/ShareProgress';
import OverviewTab from './OverviewTab';
import TrainingTab from './TrainingTab';
import RecoveryTab from './RecoveryTab';
import NutritionTab from './NutritionTab';
import BodyTab from './BodyTab';
import GoalsTab from './GoalsTab';
import ProfileTab from './ProfileTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'training', label: 'Training' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'body', label: 'Body' },
  { key: 'goals', label: 'Goals & habits' },
  { key: 'profile', label: 'Profile' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ClientDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const client = useData((d) => d.clients.find((c) => c.id === id));
  const [start, setStart] = useState(false);
  const [share, setShare] = useState(false);
  const tab = (params.get('tab') as TabKey) || 'overview';

  if (!client)
    return (
      <Page title="Client" back="/clients">
        <Empty icon={<Activity />} title="Client not found" />
      </Page>
    );

  const a = age(client.dob);
  const setTab = (k: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', k);
    next.delete('add');
    setParams(next, { replace: true });
  };

  const actionsRow = [
    { icon: Dumbbell, label: 'Workout', on: () => setStart(true) },
    { icon: Activity, label: 'Check-in', on: () => nav(`/clients/${client.id}/check-in`) },
    { icon: Salad, label: 'Nutrition', on: () => setTab('nutrition') },
    { icon: MonitorSmartphone, label: 'Client view', on: () => nav(`/client-mode/${client.id}`) },
  ];

  return (
    <Page
      title={client.name}
      back="/clients"
      compact
      actions={
        <>
          <IconButton label="Share progress" onClick={() => setShare(true)}>
            <Share2 size={19} />
          </IconButton>
          <IconButton label="Edit client" onClick={() => nav(`/clients/${client.id}/edit`)}>
            <Pencil size={19} />
          </IconButton>
        </>
      }
    >
      <div className="row" style={{ marginTop: -6 }}>
        <Avatar name={client.name} color={client.color} size={56} />
        <div className="grow">
          <div className="muted small">
            {[a != null ? `${a} yrs` : null, client.sex === 'female' ? 'Female' : 'Male', client.status !== 'active' ? client.status : null].filter(Boolean).join(' · ')}
          </div>
          <div className="row wrap mt-1" style={{ gap: 6 }}>
            {client.tags.map((t) => (
              <span className="pill" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-grid">
        {actionsRow.map((x) => (
          <button key={x.label} className="quick" onClick={x.on}>
            <span className="quick-icon">
              <x.icon size={20} />
            </span>
            {x.label}
          </button>
        ))}
      </div>

      <div className="tabs-scroll">
        <div className="underline-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: -10 }}>
        {tab === 'overview' && <OverviewTab client={client} onTab={setTab} onStart={() => setStart(true)} />}
        {tab === 'training' && <TrainingTab client={client} />}
        {tab === 'recovery' && <RecoveryTab client={client} />}
        {tab === 'nutrition' && <NutritionTab client={client} autoAdd={params.get('add') === '1'} />}
        {tab === 'body' && <BodyTab client={client} />}
        {tab === 'goals' && <GoalsTab client={client} />}
        {tab === 'profile' && <ProfileTab client={client} />}
      </div>

      <StartWorkoutSheet open={start} clientId={client.id} onClose={() => setStart(false)} />
      <ShareProgressSheet open={share} client={client} onClose={() => setShare(false)} />
    </Page>
  );
}
