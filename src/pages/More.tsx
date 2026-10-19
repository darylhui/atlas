import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Calculator, CalendarDays, ClipboardList, MonitorSmartphone, Settings, Share, Smartphone, Timer } from 'lucide-react';
import { useSettings } from '../lib/store';
import { Logo } from '../components/Layout';
import { ClientPicker } from '../components/sheets';
import { Card, ListItem, Page, Sheet } from '../components/ui';
import { fs } from '../lib/display';

export default function More() {
  const nav = useNavigate();
  const settings = useSettings();
  const [pick, setPick] = useState(false);
  const [install, setInstall] = useState(false);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone);

  // iOS Settings-style tiles: a white glyph on a system color.
  const icon = (I: typeof Settings, color: string) => (
    <div className="icon-tile sm" style={{ background: color }}>
      <I size={18} strokeWidth={2.2} aria-hidden />
    </div>
  );

  return (
    <Page title="More">
      <Card>
        <div className="row">
          <Logo size={44} />
          <div>
            <div className="bold" style={{ fontSize: fs(17) }}>
              {settings.businessName || 'Atlas'}
            </div>
            <div className="small faint">{settings.trainerName || 'Personal trainer'}</div>
          </div>
        </div>
      </Card>
      <div className="card flush">
        <ListItem icon={icon(CalendarDays, '#ff3b30')} title="Schedule" subtitle="PT sessions and group classes by week" onClick={() => nav('/schedule')} />
        <ListItem icon={icon(Timer, '#ff9500')} title="Classes" subtitle="Studio timetable, lesson programmes, class timer" onClick={() => nav('/classes')} />
        <ListItem icon={icon(ClipboardList, '#007aff')} title="Library" subtitle="PT templates, class lessons & exercises" onClick={() => nav('/library')} />
        <ListItem icon={icon(MonitorSmartphone, '#af52de')} title="Client view" subtitle="Hand your device to a client" onClick={() => setPick(true)} />
        <ListItem icon={icon(Calculator, '#5856d6')} title="Coach tools" subtitle="1RM, plates, interval timer, RPE chart" onClick={() => nav('/tools')} />
        <ListItem icon={icon(Banknote, '#34c759')} title="Business" subtitle="Revenue, renewals, attendance" onClick={() => nav('/business')} />
        <ListItem icon={icon(Settings, '#8e8e93')} title="Settings & backup" subtitle="Display, text size, units, PIN, backup" onClick={() => nav('/settings')} />
        {!standalone && !__SINGLE_FILE__ && <ListItem icon={icon(Smartphone, '#007aff')} title="Install on iPhone / iPad" subtitle="Full-screen app from your Home Screen" onClick={() => setInstall(true)} />}
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
