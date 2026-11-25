// Pure helpers for the dashboard, notifications and reports (no React in here)
export type Rec = Record<string, any>;
export type Notice = { id: string; level: 'danger' | 'warn' | 'info'; title: string; text: string; page: string };
export type DueItem = { key: string; type: string; due: string; days: number; label: string };

export const todayISO = () => new Date().toISOString().slice(0, 10);
const day = (s: any) => String(s || '').slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const inRange = (date: any, from?: string, to?: string) => { const d = day(date); return (!from || d >= from) && (!to || d <= to); };

export function lastMonths(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}
export const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export function monthlyFinance(fin: Rec[], months: string[]) {
  return months.map(month => {
    const rows = fin.filter(x => day(x.date).startsWith(month));
    const sum = (t: string) => rows.filter(x => x.type === t).reduce((s, x) => s + Number(x.amount || 0), 0);
    return { month, income: sum('income'), expense: sum('expense') };
  });
}
export function categoryTotals(fin: Rec[], type: 'income' | 'expense', from?: string, to?: string): [string, number][] {
  const m: Record<string, number> = {};
  fin.filter(x => x.type === type && inRange(x.date, from, to)).forEach(x => { const c = x.category || 'Other'; m[c] = (m[c] || 0) + Number(x.amount || 0); });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
export function enterpriseSummary(fin: Rec[], from?: string, to?: string) {
  const m: Record<string, { income: number; expense: number }> = {};
  fin.filter(x => inRange(x.date, from, to)).forEach(x => {
    const e = x.enterprise || 'General';
    m[e] = m[e] || { income: 0, expense: 0 };
    m[e][x.type === 'income' ? 'income' : 'expense'] += Number(x.amount || 0);
  });
  return Object.entries(m).map(([enterprise, v]) => ({ enterprise, income: v.income, expense: v.expense, net: v.income - v.expense })).sort((a, b) => b.net - a.net);
}

// Latest follow-up date per animal (or group) and treatment type, so old reminders that were
// superseded by a newer record do not keep showing up.
export function dueItems(health: Rec[], animals: Rec[], today = todayISO()): DueItem[] {
  const latest = new Map<string, Rec>();
  health.forEach(h => {
    const who = h.animalId === 'GROUP' ? 'GROUP:' + [...(h.animalIds || [])].sort().join(',') : String(h.animalId || '');
    const key = who + '|' + String(h.type || '').toLowerCase();
    const cur = latest.get(key);
    if (!cur || day(h.date) >= day(cur.date)) latest.set(key, h);
  });
  const out: DueItem[] = [];
  latest.forEach((h, key) => {
    if (!h.nextDue) return;
    const due = day(h.nextDue);
    const label = h.animalId === 'ALL' ? 'All animals'
      : h.animalId === 'GROUP' ? (h.animalCount || (h.animalIds || []).length) + ' selected animals'
      : animals.find(a => a.id === h.animalId)?.tag || 'Unknown animal';
    out.push({ key, type: h.type || 'Health', due, days: daysBetween(today, due), label });
  });
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

export function expectedBirths(animals: Rec[], today = todayISO(), withinDays = 30) {
  return animals
    .filter(a => a.status === 'Active' && a.expectedDueDate)
    .map(a => ({ animal: a, due: day(a.expectedDueDate), days: daysBetween(today, day(a.expectedDueDate)) }))
    .filter(x => x.days <= withinDays && !(x.animal.lastKiddingDate && day(x.animal.lastKiddingDate) >= x.due))
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function lastWeighed(weights: Rec[], animalId: string): string {
  return weights.filter(w => w.animalId === animalId).map(w => day(w.date)).sort().pop() || '';
}

export function buildNotices(i: { animals: Rec[]; health: Rec[]; poultry: Rec[]; weights: Rec[]; finance: Rec[]; crops?: Rec[]; today?: string }): Notice[] {
  const today = i.today || todayISO();
  const out: Notice[] = [];
  const dues = dueItems(i.health, i.animals, today);
  dues.filter(d => d.days < 0).slice(0, 8).forEach(d => out.push({ id: 'od-' + d.key, level: 'danger', title: d.type + ' overdue', text: d.label + ' was due ' + Math.abs(d.days) + (Math.abs(d.days) === 1 ? ' day ago' : ' days ago') + ' (' + d.due + ')', page: 'Health' }));
  dues.filter(d => d.days >= 0 && d.days <= 7).slice(0, 8).forEach(d => out.push({ id: 'up-' + d.key, level: 'warn', title: d.type + (d.days === 0 ? ' due today' : ' due in ' + d.days + (d.days === 1 ? ' day' : ' days')), text: d.label + ' (' + d.due + ')', page: 'Health' }));
  expectedBirths(i.animals, today, 14).forEach(b => out.push({
    id: 'birth-' + b.animal.id, level: b.days < 0 ? 'danger' : 'warn',
    title: b.days < 0 ? 'Birth overdue' : b.days === 0 ? 'Birth expected today' : 'Birth expected in ' + b.days + (b.days === 1 ? ' day' : ' days'),
    text: b.animal.tag + (b.animal.name ? ' (' + b.animal.name + ')' : '') + ' was expected ' + b.due, page: 'Livestock',
  }));
  i.poultry.forEach(b => {
    const start = Number(b.initialBirds || 0), now = Number(b.currentBirds || start);
    if (start >= 10 && now < start) { const loss = Math.round(((start - now) / start) * 100); if (loss >= 10) out.push({ id: 'mort-' + b.id, level: 'warn', title: 'High bird losses', text: b.batch + ' has lost ' + loss + '% of its birds (' + (start - now) + ' of ' + start + ')', page: 'Poultry' }); }
  });
  cropsDue(i.crops || [], today, 14).forEach(c => out.push({
    id: 'crop-' + c.crop.id, level: c.days < 0 ? 'danger' : 'warn',
    title: c.days < 0 ? 'Harvest overdue' : c.days === 0 ? 'Harvest due today' : 'Harvest due in ' + c.days + (c.days === 1 ? ' day' : ' days'),
    text: c.crop.name + (c.crop.field ? ' (' + c.crop.field + ')' : '') + ' was expected ' + c.due, page: 'Crops',
  }));
  const active = i.animals.filter(a => a.status === 'Active');
  const stale = active.filter(a => { const w = lastWeighed(i.weights, a.id); return !w || daysBetween(w, today) > 60; });
  if (active.length && stale.length) out.push({ id: 'weigh', level: 'info', title: 'Weighing overdue', text: stale.length + (stale.length === 1 ? ' animal has' : ' animals have') + ' not been weighed in 60 days', page: 'Livestock' });
  const month = today.slice(0, 7), mf = i.finance.filter(x => day(x.date).startsWith(month));
  const inc = mf.filter(x => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
  const exp = mf.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
  if (exp > 0 && exp > inc) out.push({ id: 'loss', level: 'info', title: 'Spending is above income this month', text: 'Income ' + Math.round(inc).toLocaleString() + ' against spending ' + Math.round(exp).toLocaleString(), page: 'Finances' });
  const rank = { danger: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export function animalType(a: Rec): string {
  const sex = a.sex || '';
  if (!['', 'Male', 'Female'].includes(sex)) return sex;
  const f = sex === 'Female', m = sex === 'Male';
  if (a.species === 'Goat') return f ? 'Doe' : m ? 'Buck' : 'Goat';
  if (a.species === 'Sheep') return f ? 'Ewe' : m ? 'Ram' : 'Sheep';
  if (a.species === 'Cattle') return f ? 'Cow' : m ? 'Bull' : 'Cattle';
  return a.species || 'Animal';
}

// ---------- Crops ----------
export type CropRow = { crop: Rec; cost: number; income: number; profit: number; harvest: Record<string, number>; activities: number };
export function cropSummary(crops: Rec[], acts: Rec[]): CropRow[] {
  return crops.map(crop => {
    const mine = acts.filter(a => a.cropId === crop.id);
    const harvest: Record<string, number> = {};
    mine.filter(a => a.type === 'Harvesting' && Number(a.quantity) > 0).forEach(a => { const u = a.unit || 'kg'; harvest[u] = (harvest[u] || 0) + Number(a.quantity); });
    const cost = mine.reduce((s, a) => s + Number(a.cost || 0), 0);
    const income = mine.reduce((s, a) => s + Number(a.saleIncome || 0), 0);
    return { crop, cost, income, profit: income - cost, harvest, activities: mine.length };
  });
}
export function cropsDue(crops: Rec[], today = todayISO(), withinDays = 14) {
  return crops
    .filter(c => (c.status === 'Growing' || c.status === 'Planned') && c.expectedHarvest)
    .map(c => ({ crop: c, due: day(c.expectedHarvest), days: daysBetween(today, day(c.expectedHarvest)) }))
    .filter(x => x.days <= withinDays)
    .sort((a, b) => a.due.localeCompare(b.due));
}
export const harvestText = (h: Record<string, number>) => Object.entries(h).map(([u, q]) => Math.round(q * 10) / 10 + ' ' + u).join(' + ');
