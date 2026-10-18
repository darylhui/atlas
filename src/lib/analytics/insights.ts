import type { AppData, Client, DayKey } from '../types';
import { addDays, daysBetween, parseDay, today } from '../util';
import { activePackage, sessionsRemaining } from '../store';
import { goalProgress } from './engagement';
import { latestCheckIn, loadStatus, readinessFor, readinessZone, type Zone } from './recovery';
import { daysSinceLastSession } from './strength';

export interface Alert {
  id: string;
  clientId: string;
  severity: Zone;
  kind: 'readiness' | 'load' | 'inactive' | 'package' | 'payment' | 'checkin' | 'birthday' | 'goal';
  title: string;
  detail: string;
}

const RANK: Record<Zone, number> = { critical: 0, serious: 1, warning: 2, good: 3 };

function nextBirthday(dob: DayKey, from: DayKey): DayKey {
  const b = parseDay(dob);
  const f = parseDay(from);
  const d = new Date(f.getFullYear(), b.getMonth(), b.getDate());
  if (d < f) d.setFullYear(f.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function clientAlerts(c: Client, data: AppData): Alert[] {
  const out: Alert[] = [];
  const t = today();
  const add = (a: Omit<Alert, 'id' | 'clientId'>) => out.push({ ...a, id: `${c.id}-${a.kind}`, clientId: c.id });

  const ci = latestCheckIn(data.checkIns, c.id);
  if (ci && daysBetween(ci.date, t) <= 1) {
    const score = readinessFor(data.checkIns, ci);
    const z = readinessZone(score);
    if (z.zone === 'critical' || z.zone === 'serious')
      add({ kind: 'readiness', severity: z.zone, title: `Readiness ${score} — ${z.label.toLowerCase()}`, detail: z.advice });
  }
  if (!ci || daysBetween(ci.date, t) >= 5) {
    add({ kind: 'checkin', severity: 'warning', title: ci ? `No check-in for ${daysBetween(ci.date, t)} days` : 'No check-ins yet', detail: 'Send a reminder to complete the daily readiness check-in.' });
  }

  const load = loadStatus(data.sessions, c.id);
  if (load.ratio != null && load.ratio > 1.3 && load.chronic > 0) {
    add({
      kind: 'load',
      severity: load.ratio > 1.5 ? 'critical' : 'warning',
      title: `Workload ratio ${load.ratio.toFixed(2)}`,
      detail: load.zone?.advice ?? '',
    });
  }

  const idle = daysSinceLastSession(data.sessions, c.id);
  if (c.status === 'active' && idle != null && idle >= 10) {
    add({ kind: 'inactive', severity: idle >= 21 ? 'serious' : 'warning', title: `No session in ${idle} days`, detail: 'Reach out to re-engage and book their next session.' });
  }

  const left = sessionsRemaining(data.packages, c.id);
  const hasPackages = data.packages.some((p) => p.clientId === c.id);
  if (hasPackages && left != null && left <= 2) {
    add({
      kind: 'package',
      severity: left === 0 ? 'serious' : 'warning',
      title: left === 0 ? 'Package finished' : `${left} session${left === 1 ? '' : 's'} left in package`,
      detail: 'Good time to discuss renewal.',
    });
  } else if (hasPackages && left == null) {
    add({ kind: 'package', severity: 'serious', title: 'No active package', detail: 'All packages are used or expired.' });
  }
  const unpaid = data.packages.filter((p) => p.clientId === c.id && !p.paid);
  if (unpaid.length) add({ kind: 'payment', severity: 'warning', title: 'Payment outstanding', detail: unpaid.map((p) => p.name).join(', ') });

  if (c.dob) {
    const nb = nextBirthday(c.dob, t);
    const inDays = daysBetween(t, nb);
    if (inDays <= 7) add({ kind: 'birthday', severity: 'good', title: inDays === 0 ? 'Birthday today' : `Birthday in ${inDays} day${inDays === 1 ? '' : 's'}`, detail: 'Send a message or a small gift.' });
  }

  for (const g of data.goals.filter((g) => g.clientId === c.id && g.deadline && !g.achievedAt)) {
    const p = goalProgress(g, data);
    const left = daysBetween(t, g.deadline!);
    if (!p.achieved && left >= 0 && left <= 21 && p.pct < 0.8) {
      add({ kind: 'goal', severity: 'warning', title: `Goal due in ${left} days`, detail: `${g.title} — ${Math.round(p.pct * 100)}% there. Review the plan or the deadline.` });
      break;
    }
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export function allAlerts(data: AppData): Alert[] {
  return data.clients
    .filter((c) => c.status === 'active')
    .flatMap((c) => clientAlerts(c, data))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export function revenueBetween(data: AppData, from: DayKey, to: DayKey): number {
  return data.packages.filter((p) => p.purchasedAt >= from && p.purchasedAt <= to && p.paid).reduce((a, p) => a + p.price, 0);
}

export function monthStart(key: DayKey = today()): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export { activePackage, addDays };
