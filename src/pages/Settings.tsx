import { useRef, useState } from 'react';
import { Download, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { actions, emptyData, useStore } from '../lib/store';
import type { AppData, Units } from '../lib/types';
import { loadPhoto, savePhoto } from '../lib/db';
import { buildDemoData } from '../lib/seed/demo';
import { downloadJson } from '../lib/share';
import { fmtDuration, today } from '../lib/util';
import { Button, Card, confirmDialog, Field, ListItem, Page, Section, Segmented, Select, Stepper, TextInput, toast, Toggle } from '../components/ui';

export const CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'NZD', 'CAD', 'SGD', 'MYR', 'HKD', 'INR', 'AED'];

export default function SettingsPage() {
  const data = useStore((s) => s.data);
  const persistent = useStore((s) => s.persistent);
  const s = data.settings;
  const upd = actions().updateSettings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState(s.clientModePin ?? '');
  const [withPhotos, setWithPhotos] = useState(true);

  const exportBackup = async () => {
    const photos: Record<string, string> = {};
    if (withPhotos) {
      for (const p of data.photos) {
        const v = await loadPhoto(p.id);
        if (v) photos[p.id] = v;
      }
    }
    downloadJson({ app: 'atlas', version: data.version, exportedAt: new Date().toISOString(), data, photos }, `atlas-backup-${today()}.json`);
    toast('Backup downloaded');
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text()) as { app?: string; data?: AppData; photos?: Record<string, string> };
      if (json.app !== 'atlas' || !json.data?.clients) throw new Error('bad file');
      const ok = await confirmDialog({
        title: 'Restore this backup?',
        body: `It contains ${json.data.clients.length} clients and ${json.data.sessions.length} sessions. Everything currently on this device will be replaced.`,
        confirm: 'Restore',
        danger: true,
      });
      if (!ok) return;
      for (const [id, url] of Object.entries(json.photos ?? {})) await savePhoto(id, url);
      actions().replaceAll({ ...json.data, settings: { ...json.data.settings, onboarded: true } });
      toast('Backup restored');
    } catch {
      toast('That file isn’t an Atlas backup');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Page title="Settings" back compact>
      <Section title="Your business">
        <div className="stack">
          <Field label="Your name">
            <TextInput value={s.trainerName} onChange={(e) => upd({ trainerName: e.target.value })} />
          </Field>
          <Field label="Business name" hint="Shown on shared summaries and progress cards">
            <TextInput value={s.businessName} onChange={(e) => upd({ businessName: e.target.value })} />
          </Field>
          <div className="grid-2">
            <Field label="Units">
              <Segmented<Units> value={s.units} onChange={(v) => upd({ units: v })} options={[{ value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lb / in' }]} />
            </Field>
            <Field label="Currency">
              <Select value={s.currency} onChange={(v) => upd({ currency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Training">
        <div className="card flush">
          <div className="list-item">
            <div className="grow">
              <div className="bold">Default rest timer</div>
              <div className="small faint">Used when an exercise has no rest set</div>
            </div>
            <Stepper value={s.defaultRestSec} onChange={(v) => upd({ defaultRestSec: v })} step={15} min={0} max={600} format={(v) => <span style={{ fontSize: 17 }}>{fmtDuration(v)}</span>} />
          </div>
          <div className="list-item">
            <div className="grow">
              <div className="bold">Auto-deduct packages</div>
              <div className="small faint">Use a session from the client’s package when a workout is finished</div>
            </div>
            <Toggle on={s.autoDeductPackage} onChange={(v) => upd({ autoDeductPackage: v })} label="Auto-deduct packages" />
          </div>
        </div>
      </Section>

      <Section title="Client view lock">
        <Card>
          <p className="small muted">Set a 4-digit PIN to stop clients leaving the client view and seeing other clients’ data. Leave blank for no lock.</p>
          <div className="row mt-2">
            <div className="grow">
              <TextInput inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" style={{ letterSpacing: '0.4em' }} />
            </div>
            <Button
              variant="primary"
              onClick={() => {
                if (pin && pin.length !== 4) return toast('PIN must be 4 digits');
                upd({ clientModePin: pin || undefined });
                toast(pin ? 'PIN saved' : 'PIN removed');
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Data & backup">
        <div className="stack">
          {__SINGLE_FILE__ && (
            <div className="banner">
              <span>👀</span>
              <span className="small">This is a preview link. Backup files and installing to the Home Screen work in the full hosted version of Atlas.</span>
            </div>
          )}
          <div className={`banner${persistent ? ' info' : ''}`}>
            <span>{persistent ? '🔒' : '⚠️'}</span>
            <span className="small">
              {persistent
                ? 'All data is stored privately on this device. Export a backup regularly — and before switching devices.'
                : 'This browser view can’t save data permanently. Open Atlas in Safari or add it to your Home Screen.'}
            </span>
          </div>
          <div className="card flush">
            <div className="list-item">
              <div className="grow">
                <div className="bold">Include progress photos</div>
                <div className="small faint">Larger file, but a complete backup</div>
              </div>
              <Toggle on={withPhotos} onChange={setWithPhotos} label="Include photos in backup" />
            </div>
            <ListItem icon={<Download size={18} />} title="Export backup" subtitle={`${data.clients.length} clients · ${data.sessions.length} sessions · ${data.checkIns.length} check-ins`} onClick={exportBackup} />
            <ListItem icon={<Upload size={18} />} title="Restore from backup" subtitle="Replace this device’s data with a backup file" onClick={() => fileRef.current?.click()} />
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
          <div className="card flush">
            <ListItem
              icon={<Sparkles size={18} />}
              title="Load demo studio"
              subtitle="5 sample clients with months of data"
              onClick={async () => {
                if (await confirmDialog({ title: 'Load demo data?', body: 'This replaces everything currently on this device.', confirm: 'Load demo', danger: data.clients.length > 0 })) {
                  actions().replaceAll(buildDemoData());
                  toast('Demo studio loaded');
                }
              }}
            />
            <ListItem
              icon={<RotateCcw size={18} />}
              title="Erase all data"
              subtitle="Start completely fresh"
              onClick={async () => {
                if (await confirmDialog({ title: 'Erase everything?', body: 'All clients, sessions, logs and settings on this device will be permanently deleted. Export a backup first if you might need it.', confirm: 'Erase', danger: true })) {
                  actions().replaceAll(emptyData());
                }
              }}
            />
          </div>
        </div>
      </Section>
      <p className="xs faint center">Atlas v1.0 · local-first · no account needed</p>
    </Page>
  );
}
