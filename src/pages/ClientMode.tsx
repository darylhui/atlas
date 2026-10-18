import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Check, Delete, Droplets, Flame, Lock, Plus, Trophy } from 'lucide-react';
import { NamedIcon } from '../components/icons';
import { actions, useStore } from '../lib/store';
import type { CheckIn } from '../lib/types';
import { achievements, goalProgress, habitStreak, habitWeek } from '../lib/analytics/engagement';
import { latestCheckIn, readinessFor, readinessZone } from '../lib/analytics/recovery';
import { completed, exerciseHistory, prTimeline, topExercises, weekStreak } from '../lib/analytics/strength';
import { dayEntries, totals, waterFor } from '../lib/analytics/nutrition';
import { dayKey, firstName, fmtNum, fmtTime, fmtWeight, relativeDay, round, today, toDisplayWeight, uid, weightUnit } from '../lib/util';
import { celebrate } from '../components/Confetti';
import { LineChart } from '../components/charts';
import { Avatar, Button, Card, Empty, IconButton, Progress, Ring, Section, Sheet, Stat, toast, ZonePill } from '../components/ui';
import { CheckInFields } from './CheckInForm';
import { FoodSheet } from './client/NutritionTab';
import { fs } from '../lib/display';

/** While set, the app keeps the viewer inside this client's view until the PIN is entered. */
export const useClientLock = create<{ path: string | null }>(() => ({ path: null }));

export default function ClientMode() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const data = useStore((s) => s.data);
  const client = data.clients.find((c) => c.id === id);
  const [exiting, setExiting] = useState(false);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [food, setFood] = useState(false);
  const t = today();
  const units = data.settings.units;
  const exMap = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
  const pin = data.settings.clientModePin;

  useEffect(() => {
    if (pin) useClientLock.setState({ path: `/client-mode/${id}` });
  }, [pin, id]);

  const exit = () => {
    useClientLock.setState({ path: null });
    nav(`/clients/${id}`);
  };

  const stats = useMemo(() => {
    if (!client) return undefined;
    const sessions = completed(data.sessions, client.id);
    const top = topExercises(data.sessions, client.id, exMap, 1)[0];
    return {
      sessions,
      month: sessions.filter((s) => s.date.slice(0, 7) === t.slice(0, 7)).length,
      streak: weekStreak(data.sessions, client.id),
      prs: prTimeline(data.sessions, client.id).filter((p) => p.kind === 'e1rm').length,
      badges: achievements(client.id, data),
      top,
      topHist: top ? exerciseHistory(data.sessions, top, client.id) : [],
    };
  }, [client, data, exMap, t]);

  if (!client || !stats)
    return (
      <div className="main no-tabs">
        <Empty icon={<Lock />} title="Client not found" action={<Button onClick={() => nav('/')}>Back</Button>} />
      </div>
    );

  const ci = latestCheckIn(data.checkIns, client.id);
  const todayCi = ci?.date === t ? ci : undefined;
  const score = todayCi ? readinessFor(data.checkIns, todayCi) : undefined;
  const zone = score != null ? readinessZone(score) : undefined;
  const habits = data.habits.filter((h) => h.clientId === client.id);
  const goals = data.goals.filter((g) => g.clientId === client.id);
  const next = data.appointments
    .filter((a) => a.clientId === client.id && a.status === 'scheduled' && a.start >= new Date().toISOString())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const nutrition = totals(dayEntries(data.foodEntries, client.id, t));
  const water = waterFor(data.water, client.id, t);
  const target = client.nutrition;
  const weights = data.measurements.filter((m) => m.clientId === client.id && m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date));
  const earned = stats.badges.filter((b) => b.earned);

  const saveCheckIn = () => {
    if (!checkIn) return;
    actions().upsert('checkIns', checkIn);
    setCheckIn(null);
    toast('Thanks! Check-in saved');
  };

  return (
    <div className="main no-tabs" style={{ paddingLeft: 'calc(16px + var(--safe-left))', maxWidth: 900 }}>
      <header className="page-head">
        <div className="page-head-row">
          <Avatar name={client.name} color={client.color} size={44} />
          <div className="grow">
            <h1 className="page-title">Hi {firstName(client.name)}</h1>
            <div className="page-sub">{data.settings.businessName}</div>
          </div>
          <IconButton label="Exit client view" onClick={() => (pin ? setExiting(true) : exit())}>
            <Lock size={18} />
          </IconButton>
        </div>
      </header>

      <div className="stack-lg mt-1">
        <div className="cols">
          <Card>
            {zone && score != null ? (
              <div className="row" style={{ gap: 16 }}>
                <Ring pct={score / 100} size={104} color={`var(--${zone.zone})`}>
                  <b>{score}</b>
                  <small>readiness</small>
                </Ring>
                <div className="grow">
                  <ZonePill zone={zone.zone}>{zone.label}</ZonePill>
                  <p className="small muted mt-1">{zone.advice}</p>
                  <button className="section-link small mt-1" onClick={() => setCheckIn(todayCi!)}>
                    Edit check-in
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <div className="card-title">How are you feeling today?</div>
                <p className="small muted">A 30-second check-in helps your coach tailor today’s session.</p>
                <Button
                  variant="primary"
                  onClick={() =>
                    setCheckIn({ id: uid(), clientId: client.id, date: t, sleepHours: 7, sleepQuality: 3, energy: 3, mood: 3, stress: 2, soreness: 1, soreAreas: [] })
                  }
                >
                  Start check-in
                </Button>
              </div>
            )}
          </Card>

          <div className="grid-2">
            <Stat label="Sessions this month" value={stats.month} />
            <Stat label="Week streak" value={stats.streak} icon={stats.streak >= 4 ? <Flame size={16} color="var(--serious)" /> : undefined} />
            <Stat label="Personal records" value={stats.prs} icon={<Trophy size={16} color="var(--warning)" />} />
            <Stat label="Badges" value={`${earned.length}/${stats.badges.length}`} />
          </div>
        </div>

        {next && (
          <Card>
            <div className="row">
              <CalendarDays size={20} color="var(--accent)" />
              <div className="grow">
                <div className="bold">Next session</div>
                <div className="small muted">
                  {relativeDay(dayKey(new Date(next.start)))} at {fmtTime(next.start)}
                  {next.location ? ` · ${next.location}` : ''}
                </div>
              </div>
            </div>
          </Card>
        )}

        {habits.length > 0 && (
          <Section title="Today’s habits">
            <div className="card flush">
              {habits.map((h) => {
                const done = data.habitLogs.some((l) => l.habitId === h.id && l.date === t);
                const w = habitWeek(h, data.habitLogs);
                const streak = habitStreak(h.id, data.habitLogs);
                return (
                  <button
                    key={h.id}
                    className="list-item"
                    onClick={() => {
                      actions().toggleHabit(h.id, t);
                      if (!done && w.done + 1 === w.target) {
                        celebrate();
                        toast(`Weekly target hit: ${h.name}!`);
                      }
                    }}
                  >
                    <span className="icon-tile"><NamedIcon name={h.icon} size={22} /></span>
                    <div className="grow">
                      <div className="bold">{h.name}</div>
                      <div className="xs faint">
                        {w.done}/{w.target} this week{streak > 1 ? ` · ${streak}-day streak` : ''}
                      </div>
                    </div>
                    <span className={`set-check${done ? ' on' : ''}`}>
                      <Check size={20} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <div className="cols">
          {target && (
            <Card>
              <div className="row-between">
                <div className="card-title">Today’s nutrition</div>
                <Button size="sm" onClick={() => setFood(true)}>
                  <Plus size={16} /> Log food
                </Button>
              </div>
              <div className="stack mt-2" style={{ gap: 10 }}>
                <div>
                  <div className="row-between small">
                    <span className="muted">Calories</span>
                    <span className="tabular">
                      <b>{Math.round(nutrition.calories)}</b> <span className="faint">/ {target.calories}</span>
                    </span>
                  </div>
                  <div className="mt-1">
                    <Progress pct={nutrition.calories / target.calories} />
                  </div>
                </div>
                <div>
                  <div className="row-between small">
                    <span className="muted">Protein</span>
                    <span className="tabular">
                      <b>{Math.round(nutrition.protein)} g</b> <span className="faint">/ {target.protein} g</span>
                    </span>
                  </div>
                  <div className="mt-1">
                    <Progress pct={nutrition.protein / target.protein} color="var(--series-1)" />
                  </div>
                </div>
                <div className="row-between">
                  <span className="row small muted" style={{ gap: 6 }}>
                    <Droplets size={16} color="var(--series-1)" /> {(water / 1000).toFixed(2)} / {(target.waterMl / 1000).toFixed(1)} L
                  </span>
                  <Button size="sm" onClick={() => actions().setWater(client.id, t, water + 250)}>
                    +250 ml
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {goals.length > 0 && (
            <Card>
              <div className="card-title">Your goals</div>
              <div className="stack mt-2">
                {goals.map((g) => {
                  const p = goalProgress(g, data);
                  return (
                    <div key={g.id}>
                      <div className="row-between small">
                        <span className="bold">{g.title}</span>
                        <span className="faint">{p.achieved ? 'Done' : `${Math.round(p.pct * 100)}%`}</span>
                      </div>
                      <div className="mt-1">
                        <Progress pct={p.pct} color={p.achieved ? 'var(--good)' : undefined} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <div className="cols">
          {stats.top && stats.topHist.length > 1 && (
            <Card>
              <div className="card-title">{exMap.get(stats.top)?.name} strength</div>
              <div className="card-sub">
                Estimated 1RM · {fmtWeight(stats.topHist[0].bestE1rm, units)} → {fmtWeight(Math.max(...stats.topHist.map((h) => h.bestE1rm)), units)}
              </div>
              <div className="mt-2">
                <LineChart
                  ariaLabel="Strength trend"
                  height={160}
                  series={[{ name: 'e1RM', color: 'var(--series-1)', area: true, points: stats.topHist.map((h) => ({ x: h.date, y: round(toDisplayWeight(h.bestE1rm, units), 1) })) }]}
                  yFormat={(v) => fmtNum(v, 0)}
                  tipFormat={(v) => `${fmtNum(v)} ${weightUnit(units)}`}
                />
              </div>
            </Card>
          )}
          {weights.length > 1 && (
            <Card>
              <div className="card-title">Bodyweight</div>
              <div className="card-sub">
                {fmtWeight(weights[0].weightKg, units)} → {fmtWeight(weights[weights.length - 1].weightKg, units)}
              </div>
              <div className="mt-2">
                <LineChart
                  ariaLabel="Bodyweight trend"
                  height={160}
                  series={[{ name: 'Weight', color: 'var(--series-1)', points: weights.map((m) => ({ x: m.date, y: round(toDisplayWeight(m.weightKg!, units), 1) })) }]}
                  yFormat={(v) => fmtNum(v, 1)}
                  tipFormat={(v) => `${fmtNum(v)} ${weightUnit(units)}`}
                />
              </div>
            </Card>
          )}
        </div>

        <Section title="Achievements">
          <div className="badge-grid">
            {stats.badges.map((b) => (
              <div key={b.id} className={`badge${b.earned ? '' : ' locked'}`}>
                <span className="emo"><NamedIcon name={b.icon} size={24} /></span>
                <span className="badge-title">{b.title}</span>
                <span className="xs faint">{b.earned ? b.description : b.progressLabel}</span>
              </div>
            ))}
          </div>
        </Section>

        {stats.sessions.length > 0 && (
          <Section title="Recent workouts">
            <div className="card flush">
              {stats.sessions
                .slice(-3)
                .reverse()
                .map((s) => {
                  const prs = prTimeline(data.sessions, client.id).filter((p) => p.sessionId === s.id && p.kind === 'e1rm').length;
                  return (
                    <div key={s.id} className="list-item">
                      <div className="grow">
                        <div className="bold">{s.name}</div>
                        <div className="xs faint">
                          {relativeDay(s.date)} · {s.exercises.length} exercises · {s.durationMin} min
                        </div>
                      </div>
                      {prs > 0 && (
                        <span className="pill accent">
                          <Trophy size={12} /> {prs} PR{prs > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </Section>
        )}
      </div>

      {checkIn && (
        <Sheet open onClose={() => setCheckIn(null)} title="Daily check-in" footer={<Button variant="primary" block onClick={saveCheckIn}>Save check-in</Button>}>
          <CheckInFields c={checkIn} set={(p) => setCheckIn((x) => (x ? { ...x, ...p } : x))} />
        </Sheet>
      )}
      {food && <FoodSheet client={client} day={t} meal={new Date().getHours() < 11 ? 'breakfast' : new Date().getHours() < 15 ? 'lunch' : 'dinner'} onClose={() => setFood(false)} />}
      {exiting && pin && <PinPad pin={pin} onSuccess={exit} onClose={() => setExiting(false)} />}
    </div>
  );
}

function PinPad({ pin, onSuccess, onClose }: { pin: string; onSuccess: () => void; onClose: () => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState(false);
  const press = (d: string) => {
    const next = (v + d).slice(0, 4);
    setV(next);
    setErr(false);
    if (next.length === 4) {
      if (next === pin) onSuccess();
      else {
        setErr(true);
        setTimeout(() => setV(''), 400);
      }
    }
  };
  return (
    <Sheet open onClose={onClose} title="Trainer PIN">
      <div className="stack" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 14, margin: '8px 0 16px' }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: i < v.length ? (err ? 'var(--critical)' : 'var(--accent)') : 'var(--surface-3)' }} />
          ))}
        </div>
        <div className="grid-3" style={{ width: '100%', maxWidth: 300 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((d) =>
            d === '' ? (
              <span key="blank" />
            ) : (
              <button key={d} className="btn btn-secondary" style={{ minHeight: 64, fontSize: fs(24) }} aria-label={d === 'del' ? 'Delete digit' : undefined} onClick={() => (d === 'del' ? setV(v.slice(0, -1)) : press(d))}>
                {d === 'del' ? <Delete size={24} /> : d}
              </button>
            ),
          )}
        </div>
        {err && <div className="small" style={{ color: 'var(--md-error)' }}>Incorrect PIN</div>}
      </div>
    </Sheet>
  );
}
