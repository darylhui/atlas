import { useEffect, useMemo, useState } from 'react';
import { Apple, ChevronLeft, ChevronRight, Copy, Droplets, Moon, Plus, Salad, Sun, Sunrise, Trash2, type LucideIcon } from 'lucide-react';
import { actions, useStore } from '../../lib/store';
import type { ActivityLevel, Client, Food, FoodEntry, MealSlot, NutritionGoal, NutritionTargets } from '../../lib/types';
import { ACTIVITY, GOALS, adherence, bmr, dailySeries, dayEntries, suggestTargets, totals, waterFor } from '../../lib/analytics/nutrition';
import { addDays, age, fmtDay, fmtNum, fmtShortDay, fromDisplayWeight, relativeDay, round, today, toDisplayWeight, uid, weightUnit } from '../../lib/util';
import { BarChart, ChartCard, Legend } from '../../components/charts';
import { Button, Card, Chips, Empty, Field, IconButton, NumberInput, Ring, SearchInput, Section, Segmented, Select, Sheet, Stat, Stepper, TextInput, toast, Toggle } from '../../components/ui';

const MEALS: { key: MealSlot; label: string; icon: LucideIcon }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: Sunrise },
  { key: 'lunch', label: 'Lunch', icon: Sun },
  { key: 'dinner', label: 'Dinner', icon: Moon },
  { key: 'snack', label: 'Snacks', icon: Apple },
];

function defaultMeal(): MealSlot {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

export default function NutritionTab({ client, autoAdd }: { client: Client; autoAdd?: boolean }) {
  const data = useStore((s) => s.data);
  const [day, setDay] = useState(today());
  const [adding, setAdding] = useState<MealSlot | null>(autoAdd ? defaultMeal() : null);
  const [editing, setEditing] = useState<FoodEntry>();
  const [targetsOpen, setTargetsOpen] = useState(false);
  const targets = client.nutrition;

  const entries = useMemo(() => dayEntries(data.foodEntries, client.id, day), [data.foodEntries, client.id, day]);
  const tot = totals(entries);
  const water = waterFor(data.water, client.id, day);
  const series = useMemo(() => dailySeries(data.foodEntries, data.water, client.id, 14), [data.foodEntries, data.water, client.id]);
  const adh = adherence(series, targets);

  const copyYesterday = () => {
    const prev = dayEntries(data.foodEntries, client.id, addDays(day, -1));
    if (!prev.length) return toast('Nothing logged the day before');
    for (const e of prev) actions().upsert('foodEntries', { ...e, id: uid(), date: day });
    toast(`Copied ${prev.length} items`);
  };

  const macro = (label: string, val: number, target: number | undefined, color: string) => (
    <div>
      <div className="row-between xs">
        <span className="row" style={{ gap: 6 }}>
          <i className="key-rect" style={{ background: color }} />
          <span className="muted">{label}</span>
        </span>
        <span className="tabular">
          <b>{Math.round(val)}</b>
          <span className="faint">{target ? ` / ${target} g` : ' g'}</span>
        </span>
      </div>
      <div className="bar-track mt-1" style={{ height: 6 }}>
        <div className="bar-fill" style={{ width: `${target ? Math.min(100, (val / target) * 100) : 0}%`, background: color }} />
      </div>
    </div>
  );

  const calPct = targets ? tot.calories / targets.calories : 0;

  return (
    <div className="stack-lg">
      <div className="row-between">
        <IconButton label="Previous day" onClick={() => setDay(addDays(day, -1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="center">
          <div className="bold">{relativeDay(day)}</div>
          <div className="xs faint">{fmtDay(day, { weekday: true })}</div>
        </div>
        <IconButton label="Next day" onClick={() => setDay(addDays(day, 1))} disabled={day >= today()} style={{ opacity: day >= today() ? 0.3 : 1 }}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="cols">
        <Card>
          {targets ? (
            <div className="row" style={{ gap: 18 }}>
              <Ring pct={calPct} size={118} color={calPct > 1.1 ? 'var(--serious)' : 'var(--accent)'}>
                <b>{Math.round(tot.calories).toLocaleString()}</b>
                <small>of {targets.calories.toLocaleString()} kcal</small>
              </Ring>
              <div className="grow stack" style={{ gap: 10 }}>
                {macro('Protein', tot.protein, targets.protein, 'var(--series-1)')}
                {macro('Carbs', tot.carbs, targets.carbs, 'var(--series-2)')}
                {macro('Fat', tot.fat, targets.fat, 'var(--series-3)')}
              </div>
            </div>
          ) : (
            <div className="stack">
              <div className="card-title">No nutrition targets yet</div>
              <p className="small muted">Use the calculator to set calorie and macro targets from BMR, activity and goal.</p>
            </div>
          )}
          <Button block className="mt-2" onClick={() => setTargetsOpen(true)}>
            {targets ? `Targets · ${GOALS[targets.goal].label}` : 'Set targets'}
          </Button>
        </Card>

        <Card>
          <div className="row-between">
            <div className="row" style={{ gap: 8 }}>
              <Droplets size={18} color="var(--series-1)" />
              <span className="card-title">Water</span>
            </div>
            <span className="tabular">
              <b>{(water / 1000).toFixed(2)} L</b>
              <span className="faint"> / {((targets?.waterMl ?? 2500) / 1000).toFixed(1)} L</span>
            </span>
          </div>
          <div className="row mt-2" style={{ gap: 4 }}>
            {Array.from({ length: Math.round((targets?.waterMl ?? 2500) / 250) }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 26, borderRadius: 6, background: i < water / 250 ? 'var(--series-1)' : 'var(--surface-3)' }} />
            ))}
          </div>
          <div className="grid-3 mt-2">
            <Button size="sm" onClick={() => actions().setWater(client.id, day, Math.max(0, water - 250))}>
              −250
            </Button>
            <Button size="sm" onClick={() => actions().setWater(client.id, day, water + 250)}>
              +250 ml
            </Button>
            <Button size="sm" onClick={() => actions().setWater(client.id, day, water + 500)}>
              +500 ml
            </Button>
          </div>
        </Card>
      </div>

      <Section
        title="Food log"
        action={
          <button className="section-link row" style={{ gap: 4 }} onClick={copyYesterday}>
            <Copy size={14} /> Copy previous day
          </button>
        }
      >
        <div className="stack">
          {MEALS.map((m) => {
            const list = entries.filter((e) => e.meal === m.key);
            const kcal = totals(list).calories;
            return (
              <div key={m.key} className="card flush">
                <div className="row-between" style={{ padding: '12px 12px 8px 16px' }}>
                  <div className="row" style={{ gap: 8 }}>
                    <m.icon size={18} color="var(--md-on-surface-variant)" aria-hidden />
                    <span className="bold">{m.label}</span>
                    {kcal > 0 && <span className="small faint">{Math.round(kcal)} kcal</span>}
                  </div>
                  <IconButton label={`Add to ${m.label}`} className="accent" onClick={() => setAdding(m.key)}>
                    <Plus size={18} />
                  </IconButton>
                </div>
                {list.map((e) => (
                  <button key={e.id} className="list-item" style={{ minHeight: 48 }} onClick={() => setEditing(e)}>
                    <div className="grow">
                      <div className="truncate">{e.name}</div>
                      <div className="xs faint">
                        {e.servings !== 1 ? `${e.servings} × ` : ''}P {fmtNum(e.protein * e.servings)} · C {fmtNum(e.carbs * e.servings)} · F {fmtNum(e.fat * e.servings)}
                      </div>
                    </div>
                    <span className="small tabular muted">{Math.round(e.calories * e.servings)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Last 14 days">
        <div className="stack">
          <div className="grid-4">
            <Stat label="Adherence score" value={targets ? adh.score : '–'} unit={targets ? '/ 100' : undefined} />
            <Stat label="Days logged" value={adh.daysLogged} unit={`/ ${adh.days}`} />
            <Stat label="Calories on target" value={targets ? `${Math.round(adh.calorieHit * 100)}%` : '–'} delta={<span className="faint">within ±10%</span>} />
            <Stat label="Protein on target" value={targets ? `${Math.round(adh.proteinHit * 100)}%` : '–'} delta={<span className="faint">≥ 90% of goal</span>} />
          </div>
          <div className="cols">
            <ChartCard
              title="Calories"
              subtitle={`Avg ${Math.round(adh.avgCalories).toLocaleString()} kcal on logged days`}
              table={{ columns: ['Date', 'kcal', 'Protein', 'Carbs', 'Fat'], rows: [...series].reverse().map((d) => [fmtDay(d.date), Math.round(d.calories), Math.round(d.protein), Math.round(d.carbs), Math.round(d.fat)]) }}
            >
              <BarChart
                ariaLabel="Daily calories, last 14 days"
                data={series.map((d) => ({ key: d.date, label: fmtShortDay(d.date), value: Math.round(d.calories), tip: fmtDay(d.date, { weekday: true }) }))}
                refLine={targets ? { y: targets.calories, label: 'Target' } : undefined}
              />
            </ChartCard>
            <ChartCard title="Protein" subtitle={`Avg ${Math.round(adh.avgProtein)} g on logged days`}>
              <BarChart
                ariaLabel="Daily protein, last 14 days"
                color="var(--series-1)"
                data={series.map((d) => ({ key: d.date, label: fmtShortDay(d.date), value: Math.round(d.protein), tip: fmtDay(d.date, { weekday: true }) }))}
                refLine={targets ? { y: targets.protein, label: 'Target' } : undefined}
                yFormat={(v) => `${Math.round(v)}`}
              />
            </ChartCard>
          </div>
          {adh.daysLogged > 0 && (
            <Card>
              <div className="card-title">Average macro split</div>
              <div className="row mt-2" style={{ height: 14, gap: 2, borderRadius: 4, overflow: 'hidden' }}>
                {(() => {
                  const p = adh.avgProtein * 4;
                  const c = adh.avgCarbs * 4;
                  const f = adh.avgFat * 9;
                  const sum = p + c + f || 1;
                  return [
                    { v: p, color: 'var(--series-1)' },
                    { v: c, color: 'var(--series-2)' },
                    { v: f, color: 'var(--series-3)' },
                  ].map((s, i) => <div key={i} style={{ width: `${(s.v / sum) * 100}%`, height: '100%', background: s.color }} />);
                })()}
              </div>
              <div className="mt-2">
                {(() => {
                  const p = adh.avgProtein * 4;
                  const c = adh.avgCarbs * 4;
                  const f = adh.avgFat * 9;
                  const sum = p + c + f || 1;
                  return (
                    <Legend
                      kind="rect"
                      items={[
                        { name: `Protein ${Math.round((p / sum) * 100)}%`, color: 'var(--series-1)' },
                        { name: `Carbs ${Math.round((c / sum) * 100)}%`, color: 'var(--series-2)' },
                        { name: `Fat ${Math.round((f / sum) * 100)}%`, color: 'var(--series-3)' },
                      ]}
                    />
                  );
                })()}
              </div>
            </Card>
          )}
        </div>
      </Section>

      {adding && <FoodSheet client={client} day={day} meal={adding} onClose={() => setAdding(null)} />}
      {editing && <EntrySheet entry={editing} onClose={() => setEditing(undefined)} />}
      {targetsOpen && <TargetsSheet client={client} onClose={() => setTargetsOpen(false)} />}
    </div>
  );
}

export function FoodSheet({ client, day, meal: initialMeal, onClose }: { client: Client; day: string; meal: MealSlot; onClose: () => void }) {
  const foods = useStore((s) => s.data.foods);
  const entries = useStore((s) => s.data.foodEntries);
  const [mode, setMode] = useState<'search' | 'quick'>('search');
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [picked, setPicked] = useState<Food>();
  const [servings, setServings] = useState(1);
  const [quick, setQuick] = useState({ name: '', calories: undefined as number | undefined, protein: undefined as number | undefined, carbs: undefined as number | undefined, fat: undefined as number | undefined });
  const [saveFood, setSaveFood] = useState(true);

  const recentIds = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of [...entries].filter((x) => x.clientId === client.id && x.foodId).sort((a, b) => b.date.localeCompare(a.date))) {
      if (!seen.has(e.foodId!)) {
        seen.add(e.foodId!);
        out.push(e.foodId!);
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [entries, client.id]);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) {
      const recent = recentIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is Food => !!f);
      const rest = foods.filter((f) => !recentIds.includes(f.id));
      return { recent, rest };
    }
    return { recent: [], rest: foods.filter((f) => f.name.toLowerCase().includes(ql)) };
  }, [foods, q, recentIds]);

  const addFood = (f: Food, n: number) => {
    actions().upsert('foodEntries', { id: uid(), clientId: client.id, date: day, meal, name: f.name, servings: n, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, foodId: f.id });
    toast(`Added ${f.name}`);
    setPicked(undefined);
    setServings(1);
  };

  const addQuick = () => {
    if (!quick.name.trim() || quick.calories == null) return toast('Name and calories are required');
    const food: Food = { id: uid(), name: quick.name.trim(), serving: '1 serving', calories: quick.calories, protein: quick.protein ?? 0, carbs: quick.carbs ?? 0, fat: quick.fat ?? 0, custom: true };
    if (saveFood) actions().upsert('foods', food);
    addFood(food, 1);
    setQuick({ name: '', calories: undefined, protein: undefined, carbs: undefined, fat: undefined });
  };

  const row = (f: Food) => (
    <button key={f.id} className="list-item" onClick={() => setPicked(f)}>
      <div className="grow">
        <div className="truncate">{f.name}</div>
        <div className="xs faint">
          {f.serving} · P {f.protein} · C {f.carbs} · F {f.fat}
        </div>
      </div>
      <span className="small tabular muted">{f.calories}</span>
    </button>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add food"
      footer={
        picked ? (
          <Button variant="primary" block onClick={() => addFood(picked, servings)}>
            Add {Math.round(picked.calories * servings)} kcal
          </Button>
        ) : mode === 'quick' ? (
          <Button variant="primary" block onClick={addQuick}>
            Add
          </Button>
        ) : (
          <Button block onClick={onClose}>
            Done
          </Button>
        )
      }
    >
      <div className="stack">
        <Chips value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.key, label: <><m.icon size={16} aria-hidden /> {m.label}</> }))} />
        {picked ? (
          <Card>
            <div className="bold">{picked.name}</div>
            <div className="small faint">Per {picked.serving}</div>
            <div className="row-between mt-2">
              <span className="muted">Servings</span>
              <Stepper value={servings} onChange={setServings} step={0.25} min={0.25} max={20} />
            </div>
            <div className="grid-4 mt-2 small center">
              <div>
                <div className="bold">{Math.round(picked.calories * servings)}</div>
                <div className="faint xs">kcal</div>
              </div>
              <div>
                <div className="bold">{fmtNum(picked.protein * servings)}</div>
                <div className="faint xs">protein</div>
              </div>
              <div>
                <div className="bold">{fmtNum(picked.carbs * servings)}</div>
                <div className="faint xs">carbs</div>
              </div>
              <div>
                <div className="bold">{fmtNum(picked.fat * servings)}</div>
                <div className="faint xs">fat</div>
              </div>
            </div>
            <Button variant="ghost" block className="mt-2" onClick={() => setPicked(undefined)}>
              Choose a different food
            </Button>
          </Card>
        ) : (
          <>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'search', label: 'Food database' }, { value: 'quick', label: 'Quick add' }]} />
            {mode === 'search' ? (
              <>
                <SearchInput value={q} onChange={setQ} placeholder="Search foods" />
                {list.recent.length > 0 && (
                  <>
                    <div className="label">Recent</div>
                    <div className="card flush">{list.recent.map(row)}</div>
                  </>
                )}
                <div className="card flush">{list.rest.slice(0, 60).map(row)}</div>
                {!list.rest.length && !list.recent.length && <Empty icon={<Salad />} title="No foods found">Use Quick add to enter macros manually.</Empty>}
              </>
            ) : (
              <div className="stack">
                <Field label="Name">
                  <TextInput value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder="e.g. Homemade chicken curry" />
                </Field>
                <div className="grid-2">
                  <Field label="Calories">
                    <NumberInput value={quick.calories} onChange={(v) => setQuick({ ...quick, calories: v })} suffix="kcal" />
                  </Field>
                  <Field label="Protein">
                    <NumberInput value={quick.protein} onChange={(v) => setQuick({ ...quick, protein: v })} suffix="g" />
                  </Field>
                  <Field label="Carbs">
                    <NumberInput value={quick.carbs} onChange={(v) => setQuick({ ...quick, carbs: v })} suffix="g" />
                  </Field>
                  <Field label="Fat">
                    <NumberInput value={quick.fat} onChange={(v) => setQuick({ ...quick, fat: v })} suffix="g" />
                  </Field>
                </div>
                <div className="row-between">
                  <span className="small muted">Save to food database</span>
                  <Toggle on={saveFood} onChange={setSaveFood} label="Save to food database" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function EntrySheet({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const [servings, setServings] = useState(entry.servings);
  const [meal, setMeal] = useState(entry.meal);
  return (
    <Sheet
      open
      onClose={onClose}
      title={entry.name}
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => {
              actions().remove('foodEntries', entry.id);
              onClose();
            }}
          >
            <Trash2 size={18} />
          </Button>
          <Button
            variant="primary"
            block
            onClick={() => {
              actions().patch('foodEntries', entry.id, { servings, meal });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="stack">
        <Chips value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.key, label: <><m.icon size={16} aria-hidden /> {m.label}</> }))} />
        <div className="row-between">
          <span className="muted">Servings</span>
          <Stepper value={servings} onChange={setServings} step={0.25} min={0.25} max={20} />
        </div>
        <div className="small muted center">
          {Math.round(entry.calories * servings)} kcal · P {fmtNum(entry.protein * servings)} g · C {fmtNum(entry.carbs * servings)} g · F {fmtNum(entry.fat * servings)} g
        </div>
      </div>
    </Sheet>
  );
}

function TargetsSheet({ client, onClose }: { client: Client; onClose: () => void }) {
  const units = useStore((s) => s.data.settings.units);
  const latestKg = useStore((s) => s.data.measurements.filter((m) => m.clientId === client.id && m.weightKg).sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg);
  const [weight, setWeight] = useState<number | undefined>(latestKg ? round(toDisplayWeight(latestKg, units), 1) : undefined);
  const [height, setHeight] = useState<number | undefined>(client.heightCm ? round(client.heightCm) : undefined);
  const [years, setYears] = useState<number | undefined>(age(client.dob) ?? 30);
  const [activity, setActivity] = useState<ActivityLevel>(client.activityLevel);
  const [goal, setGoal] = useState<NutritionGoal>(client.nutrition?.goal ?? 'maintain');
  const [t, setT] = useState<NutritionTargets | undefined>(client.nutrition);

  const kg = weight ? fromDisplayWeight(weight, units) : undefined;
  const canCalc = kg && height && years;
  const base = canCalc ? bmr(kg, height, years, client.sex) : undefined;

  useEffect(() => {
    if (!client.nutrition && canCalc) setT(suggestTargets({ weightKg: kg, heightCm: height, age: years, sex: client.sex, activity, goal }));
  }, []);

  const calc = () => {
    if (!canCalc) return toast('Enter weight, height and age');
    setT(suggestTargets({ weightKg: kg, heightCm: height, age: years, sex: client.sex, activity, goal }));
  };

  const save = () => {
    if (!t) return;
    actions().patch('clients', client.id, { nutrition: { ...t, goal }, activityLevel: activity, heightCm: height ?? client.heightCm });
    toast('Nutrition targets saved');
    onClose();
  };

  const kcalFromMacros = t ? t.protein * 4 + t.carbs * 4 + t.fat * 9 : 0;

  return (
    <Sheet open onClose={onClose} title="Nutrition targets" footer={<Button variant="primary" block onClick={save} disabled={!t}>Save targets</Button>}>
      <div className="stack">
        <div className="card-sub">Calculator — Mifflin–St Jeor BMR × activity factor, adjusted for goal.</div>
        <div className="grid-3">
          <Field label="Weight">
            <NumberInput value={weight} onChange={setWeight} suffix={weightUnit(units)} />
          </Field>
          <Field label="Height">
            <NumberInput value={height} onChange={setHeight} suffix="cm" />
          </Field>
          <Field label="Age">
            <NumberInput value={years} onChange={setYears} decimal={false} />
          </Field>
        </div>
        <Field label="Activity">
          <Select value={activity} onChange={setActivity} options={(Object.keys(ACTIVITY) as ActivityLevel[]).map((k) => ({ value: k, label: `${ACTIVITY[k].label} (×${ACTIVITY[k].factor})` }))} />
        </Field>
        <Field label="Goal">
          <Segmented value={goal} onChange={setGoal} options={(Object.keys(GOALS) as NutritionGoal[]).map((k) => ({ value: k, label: GOALS[k].label }))} />
        </Field>
        <Button block onClick={calc}>
          Calculate
        </Button>
        {base && (
          <div className="grid-2">
            <Stat label="BMR" value={Math.round(base).toLocaleString()} unit="kcal" />
            <Stat label="Maintenance (TDEE)" value={Math.round(base * ACTIVITY[activity].factor).toLocaleString()} unit="kcal" />
          </div>
        )}
        {t && (
          <>
            <div className="divider" />
            <div className="label">Daily targets (edit to fine-tune)</div>
            <div className="grid-2">
              <Field label="Calories">
                <NumberInput value={t.calories} onChange={(v) => setT({ ...t, calories: v ?? 0 })} suffix="kcal" />
              </Field>
              <Field label="Protein">
                <NumberInput value={t.protein} onChange={(v) => setT({ ...t, protein: v ?? 0 })} suffix="g" />
              </Field>
              <Field label="Carbs">
                <NumberInput value={t.carbs} onChange={(v) => setT({ ...t, carbs: v ?? 0 })} suffix="g" />
              </Field>
              <Field label="Fat">
                <NumberInput value={t.fat} onChange={(v) => setT({ ...t, fat: v ?? 0 })} suffix="g" />
              </Field>
              <Field label="Water">
                <NumberInput value={t.waterMl} onChange={(v) => setT({ ...t, waterMl: v ?? 0 })} suffix="ml" />
              </Field>
            </div>
            <div className={`xs ${Math.abs(kcalFromMacros - t.calories) > 50 ? '' : 'faint'}`}>
              Macros add up to {Math.round(kcalFromMacros).toLocaleString()} kcal{Math.abs(kcalFromMacros - t.calories) > 50 ? ' — doesn’t match the calorie target' : ''}. Protein {kg ? fmtNum(t.protein / kg) : '–'} g/kg.
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
