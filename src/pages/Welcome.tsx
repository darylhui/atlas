import { useState } from 'react';
import { Activity, Dumbbell, Salad, Sparkles, Timer, Users } from 'lucide-react';
import { Logo } from '../components/Layout';
import { Button, Field, Segmented, Select, TextInput, toast } from '../components/ui';
import { CURRENCIES } from './Settings';
import { actions, useStore } from '../lib/store';
import { buildDemoData } from '../lib/seed/demo';
import type { Units } from '../lib/types';
import { fs } from '../lib/display';

const FEATURES = [
  { icon: Dumbbell, title: 'Live workout logging', text: 'Previous numbers, PR detection, rest timer.' },
  { icon: Activity, title: 'Recovery analytics', text: 'Readiness score, HRV, workload ratio.' },
  { icon: Salad, title: 'Nutrition coaching', text: 'Macro targets, food log, adherence.' },
  { icon: Timer, title: 'Group classes', text: 'Lesson programmes, class timer, attendance.' },
  { icon: Users, title: 'Client engagement', text: 'Goals, habits, badges, shareable progress.' },
];

export default function Welcome() {
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const defaults = useStore((s) => s.data.settings);
  const [units, setUnits] = useState<Units>(defaults.units);
  const [currency, setCurrency] = useState(defaults.currency);
  const persistent = useStore((s) => s.persistent);

  const loadDemo = () => {
    actions().replaceAll(buildDemoData());
    toast('Demo studio loaded — explore away!');
  };

  const start = () => {
    actions().updateSettings({ trainerName: name.trim(), businessName: business.trim() || 'My Studio', units, currency, onboarded: true });
  };

  if (step === 'setup')
    return (
      <div className="welcome">
        <div className="stack-lg">
          <div>
            <h1 className="page-title">Set up your studio</h1>
            <p className="muted mt-1">You can change all of this later in Settings.</p>
          </div>
          <div className="stack">
            <Field label="Your name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coach Alex" autoComplete="name" />
            </Field>
            <Field label="Business name">
              <TextInput value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Peak Performance PT" />
            </Field>
            <Field label="Units">
              <Segmented
                value={units}
                onChange={setUnits}
                options={[
                  { value: 'metric', label: 'Metric (kg, cm)' },
                  { value: 'imperial', label: 'Imperial (lb, in)' },
                ]}
              />
            </Field>
            <Field label="Currency" hint="Used for packages and revenue">
              <Select value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </Field>
          </div>
          <div className="stack">
            <Button variant="primary" block onClick={start}>
              Get started
            </Button>
            <Button variant="ghost" block onClick={() => setStep('intro')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="welcome">
      <div className="stack-lg">
        <div className="stack" style={{ gap: 16 }}>
          <Logo size={64} />
          <div>
            <h1 className="hero-num" style={{ fontSize: fs(44) }}>
              Atlas
            </h1>
            <p className="muted mt-1" style={{ fontSize: fs(17) }}>
              The personal trainer’s toolkit for training, recovery and nutrition — built for iPhone and iPad.
            </p>
          </div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="row" style={{ alignItems: 'flex-start' }}>
              <div className="quick-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <f.icon size={20} />
              </div>
              <div>
                <div className="bold">{f.title}</div>
                <div className="small muted">{f.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="stack">
          <Button variant="primary" block onClick={loadDemo}>
            <Sparkles size={18} /> Explore with demo clients
          </Button>
          <Button block onClick={() => setStep('setup')}>
            Start fresh
          </Button>
          <p className="xs faint center">
            {persistent
              ? 'Your data stays on this device. Add Atlas to your Home Screen for the full-screen app experience.'
              : 'Storage is unavailable in this browser view — changes will be lost when you close the page.'}
          </p>
        </div>
      </div>
    </div>
  );
}
