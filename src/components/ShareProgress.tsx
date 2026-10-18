import { useEffect, useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useStore } from '../lib/store';
import type { AppData, Client, Units } from '../lib/types';
import { completed, exerciseHistory, prTimeline, sessionVolume, topExercises, weekStreak } from '../lib/analytics/strength';
import { achievements } from '../lib/analytics/engagement';
import { addDays, compact, firstName, fmtDay, fmtNum, toDisplayWeight, today, weightUnit } from '../lib/util';
import { shareImage } from '../lib/share';
import { Button, Segmented, Sheet, toast } from './ui';

interface CardStats {
  name: string;
  period: string;
  sessions: number;
  volume: string;
  prs: number;
  streak: number;
  weightDelta?: string;
  topLift?: { name: string; from: string; to: string; pct: number };
  badges: string[];
  business: string;
}

function gather(client: Client, data: AppData, days: number, units: Units): CardStats {
  const t = today();
  const from = addDays(t, -(days - 1));
  const sessions = completed(data.sessions, client.id).filter((s) => s.date >= from);
  const prs = prTimeline(data.sessions, client.id).filter((p) => p.date >= from && p.kind === 'e1rm');
  const vol = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const ms = data.measurements.filter((m) => m.clientId === client.id && m.weightKg != null).sort((a, b) => a.date.localeCompare(b.date));
  const inWin = ms.filter((m) => m.date >= from);
  const before = [...ms].reverse().find((m) => m.date < from) ?? inWin[0];
  const after = inWin[inWin.length - 1];
  let weightDelta: string | undefined;
  if (before && after && before !== after) {
    const d = toDisplayWeight(after.weightKg! - before.weightKg!, units);
    weightDelta = `${d > 0 ? '+' : ''}${fmtNum(d)} ${weightUnit(units)}`;
  }
  let topLift: CardStats['topLift'];
  const exNames = new Map(data.exercises.map((e) => [e.id, e.name]));
  // Headline lift: the biggest relative gain among the client's main (most-performed) lifts.
  const exById = new Map(data.exercises.map((e) => [e.id, e]));
  const main = new Set(topExercises(data.sessions, client.id, exById, 4));
  for (const id of new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId).filter((x) => main.has(x))))) {
    const h = exerciseHistory(data.sessions, id, client.id);
    const first = [...h].reverse().find((x) => x.date < from) ?? h.find((x) => x.date >= from);
    const best = h.filter((x) => x.date >= from).reduce((a, b) => (!a || b.bestE1rm > a.bestE1rm ? b : a), undefined as (typeof h)[number] | undefined);
    if (!first || !best || first === best || first.bestE1rm <= 0) continue;
    const pct = (best.bestE1rm - first.bestE1rm) / first.bestE1rm;
    if (!topLift || pct > topLift.pct)
      topLift = { name: exNames.get(id) ?? '', from: fmtNum(toDisplayWeight(first.bestE1rm, units), 0), to: fmtNum(toDisplayWeight(best.bestE1rm, units), 0), pct };
  }
  const badges = achievements(client.id, data)
    .filter((b) => b.earned)
    .slice(-4)
    .map((b) => b.title);
  return {
    name: firstName(client.name),
    period: `${fmtDay(from)} – ${fmtDay(t, { year: true })}`,
    sessions: sessions.length,
    volume: `${compact(toDisplayWeight(vol, units))} ${weightUnit(units)}`,
    prs: prs.length,
    streak: weekStreak(data.sessions, client.id),
    weightDelta,
    topLift: topLift && topLift.pct > 0 ? topLift : undefined,
    badges,
    business: data.settings.businessName || 'Atlas',
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Render an Instagram-portrait (1080×1350) progress card. */
function drawCard(s: CardStats, accent: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const font = (w: number, size: number) => `${w} ${size}px "Inter Variable", Inter, system-ui, sans-serif`;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1e1e1e');
  g.addColorStop(1, '#121212');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 120, 10, W * 0.85, 120, 520);
  glow.addColorStop(0, 'rgba(187,134,252,0.18)');
  glow.addColorStop(1, 'rgba(187,134,252,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const P = 84;
  // Atlas mark (32-unit grid scaled to 72px): circle on a square.
  const u = 72 / 32;
  ctx.fillStyle = '#03dac6';
  ctx.fillRect(P + 9 * u, P + 15 * u, 14 * u, 14 * u);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(P + 16 * u, P + 9 * u, 6 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a0a0a0';
  ctx.font = font(600, 30);
  ctx.fillText(s.business.toUpperCase(), P + 96, P + 48);

  ctx.fillStyle = '#e1e1e1';
  ctx.font = font(700, 96);
  ctx.fillText(`${s.name}’s`, P, 330);
  ctx.fillStyle = accent;
  ctx.fillText('progress', P, 430);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = font(500, 34);
  ctx.fillText(s.period, P, 490);

  const tiles: [string, string][] = [
    [String(s.sessions), 'sessions'],
    [s.volume, 'lifted'],
    [String(s.prs), s.prs === 1 ? 'new PR' : 'new PRs'],
    [s.weightDelta ?? `${s.streak} wk`, s.weightDelta ? 'bodyweight' : 'streak'],
  ];
  const tw = (W - P * 2 - 30) / 2;
  const th = 190;
  tiles.forEach(([v, l], i) => {
    const x = P + (i % 2) * (tw + 30);
    const y = 560 + Math.floor(i / 2) * (th + 30);
    ctx.fillStyle = '#2c2c2c';
    roundRect(ctx, x, y, tw, th, 34);
    ctx.fill();
    ctx.fillStyle = '#e1e1e1';
    ctx.font = font(500, 78);
    ctx.fillText(v, x + 40, y + 108);
    ctx.fillStyle = '#a0a0a0';
    ctx.font = font(600, 32);
    ctx.fillText(l, x + 40, y + 156);
  });

  let y = 560 + 2 * (th + 30) + 40;
  if (s.topLift) {
    ctx.fillStyle = '#342941';
    roundRect(ctx, P, y, W - P * 2, 150, 34);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = font(700, 30);
    ctx.fillText('BIGGEST GAIN', P + 40, y + 52);
    ctx.fillStyle = '#e1e1e1';
    ctx.font = font(750, 44);
    const txt = `${s.topLift.name}  ${s.topLift.from} → ${s.topLift.to}`;
    ctx.fillText(txt.length > 34 ? `${s.topLift.name}` : txt, P + 40, y + 108);
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.font = font(800, 54);
    ctx.fillText(`+${Math.round(s.topLift.pct * 100)}%`, W - P - 40, y + 108);
    ctx.textAlign = 'left';
    y += 190;
  }

  // Earned badges as a single row of tonal chips (whatever fits).
  ctx.font = font(600, 28);
  let bx = P;
  const by = y;
  for (const b of s.badges) {
    const bw = ctx.measureText(b).width + 48;
    if (bx + bw > W - P) break;
    ctx.fillStyle = '#3700b3';
    roundRect(ctx, bx, by, bw, 56, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b, bx + 24, by + 38);
    bx += bw + 16;
  }
  ctx.fillStyle = '#8a8a8a';
  ctx.font = font(500, 28);
  ctx.fillText('Keep showing up.', P, H - 44);
  return c;
}

export function ShareProgressSheet({ open, client, onClose }: { open: boolean; client: Client; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const [days, setDays] = useState<'30' | '90' | 'all'>('30');
  const [url, setUrl] = useState<string>();
  const span = days === 'all' ? Math.max(30, Math.ceil((Date.now() - Date.parse(client.startDate)) / 86_400_000) + 1) : Number(days);
  const stats = useMemo(() => (open ? gather(client, data, span, data.settings.units) : undefined), [open, client, data, span]);

  useEffect(() => {
    if (!stats) return;
    const canvas = drawCard(stats, '#bb86fc');
    setUrl(canvas.toDataURL('image/png'));
  }, [stats]);

  const share = async () => {
    if (!stats) return;
    const canvas = drawCard(stats, '#bb86fc');
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return;
    const res = await shareImage(blob, `${stats.name.toLowerCase()}-progress.png`, `${stats.name}’s progress`);
    if (res === 'downloaded') toast(__SINGLE_FILE__ ? 'Long-press the preview image to save or share it' : 'Image saved');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Share progress card"
      footer={
        <Button variant="primary" block onClick={share}>
          {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 size={18} /> : <Download size={18} />} Share image
        </Button>
      }
    >
      <div className="stack">
        <Segmented value={days} onChange={setDays} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }]} />
        {url && <img src={url} alt="Progress card preview" style={{ width: '100%', maxWidth: 420, margin: '0 auto', borderRadius: 16 }} />}
        <p className="xs faint center">Send it to your client, or post it (with permission) to celebrate their wins.</p>
      </div>
    </Sheet>
  );
}
