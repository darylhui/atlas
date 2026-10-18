import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Calculator, ClipboardList, MonitorSmartphone, Settings, Share, Smartphone } from 'lucide-react';
import { useSettings } from '../lib/store';
import { Logo } from '../components/Layout';
import { ClientPicker } from '../components/sheets';
import { Card, ListItem, Page, Sheet } from '../components/ui';

export default function More() {
  const nav = useNavigate();
  const settings = useSettings();
  const [pick, setPick] = useState(false);
  const [install, setInstall] = useState(false);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone);

  const icon = (I: typeof Settings) => (
    <div className="quick-icon">
      <I size={19} />
    </div>
  );

  return (
    <Page title="More">
      <Card>
        <div className="row">
          <Logo size={44} />
          <div>
            <div className="bold" style={{ fontSize: 17 }}>
              {settings.businessName || 'Atlas'}
            </div>
            <div className="small faint">{settings.trainerName || 'Personal trainer'}</div>
          </div>
        </div>
      </Card>
      <div className="card flush">
        <ListItem icon={icon(ClipboardList)} title="Library" subtitle="Workout templates & exercises" onClick={() => nav('/library')} />
        <ListItem icon={icon(MonitorSmartphone)} title="Client view" subtitle="Hand your device to a client" onClick={() => setPick(true)} />
        <ListItem icon={icon(Calculator)} title="Coach tools" subtitle="1RM, plates, interval timer, RPE chart" onClick={() => nav('/tools')} />
        <ListItem icon={icon(Banknote)} title="Business" subtitle="Revenue, renewals, attendance" onClick={() => nav('/business')} />
        <ListItem icon={icon(Settings)} title="Settings & backup" subtitle="Units, PIN, export, demo data" onClick={() => nav('/settings')} />
        {!standalone && !__SINGLE_FILE__ && <ListItem icon={icon(Smartphone)} title="Install on iPhone / iPad" subtitle="Full-screen app from your Home Screen" onClick={() => setInstall(true)} />}
      </div>

      <ClientPicker open={pick} onClose={() => setPick(false)} title="Open client view for…" onPick={(c) => nav(`/client-mode/${c.id}`)} />
      <Sheet open={install} onClose={() => setInstall(false)} title="Add Atlas to your Home Screen">
        <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            Open this page in <b>Safari</b>.
          </li>
          <li>
            Tap the <b>Share</b> button <Share size={16} style={{ verticalAlign: '-3px' }} /> in the toolbar.
          </li>
          <li>
            Choose <b>Add to Home Screen</b>, then <b>Add</b>.
          </li>
          <li>Launch Atlas from the new icon — it opens full screen, works offline, and keeps your data on the device.</li>
        </ol>
        <p className="small faint mt-2">Tip: export a backup from Settings regularly, since data lives on this device only.</p>
      </Sheet>
    </Page>
  );
}
