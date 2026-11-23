import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { GroupedBars } from './charts';
import { adg } from './breeding';
import { animalType, buildNotices, categoryTotals, dueItems, enterpriseSummary, expectedBirths, inRange, lastMonths, lastWeighed, monthLabel, monthlyFinance, todayISO, type Rec } from './analytics';

const money = (n: number) => 'KSh ' + Math.round(n || 0).toLocaleString().replace(/[\u00a0\u202f]/g, ' ');
const kg = (n: number) => Math.round(n * 10) / 10 + ' kg';
const sum = (rows: Rec[], f: string) => rows.reduce((s, x) => s + Number(x[f] || 0), 0);
const dt = (s: string) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const TABS = ['Overview', 'Livestock', 'Breeding & health', 'Poultry', 'Finance', 'Export'] as const;
const LEVEL: Record<string, string> = { danger: 'bg-rose-50 text-rose-700', warn: 'bg-amber-50 text-amber-800', info: 'bg-sky-50 text-sky-800' };

function rowsToObjects(rows: Rec[]) {
  return rows.map(r => { const o: Rec = {}; Object.keys(r).filter(k => k !== 'userId' && k !== 'id').forEach(k => { o[k] = Array.isArray(r[k]) ? r[k].join(', ') : r[k]; }); return o; });
}
function downloadCSV(name: string, rows: Rec[]) {
  if (!rows.length) return alert('No records to export.');
  const objs = rowsToObjects(rows), cols = Array.from(new Set(objs.flatMap(r => Object.keys(r))));
  const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = '\uFEFF' + [cols.join(','), ...objs.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name.toLowerCase().replace(/\s+/g, '-') + '-' + todayISO() + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

const Panel = (p: { title: string; sub?: string; children: any }) => (
  <div className="bg-white border rounded-2xl p-4 sm:p-5 break-inside-avoid">
    <div className="font-bold">{p.title}</div>
    {p.sub && <div className="text-xs text-slate-500 mb-3">{p.sub}</div>}
    <div className={p.sub ? '' : 'mt-3'}>{p.children}</div>
  </div>
);
const Stat = (p: { label: string; value: string; note?: string }) => (
  <div className="bg-white border rounded-2xl p-4 min-w-0"><div className="text-xs uppercase tracking-wide text-slate-500">{p.label}</div><div className="text-lg sm:text-2xl font-black mt-1 break-words leading-tight">{p.value}</div>{p.note && <div className="text-xs text-slate-500 mt-1">{p.note}</div>}</div>
);
const Table = (p: { heads: string[]; rows: (string | number)[][]; empty?: string }) => (
  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{p.heads.map(h => <th key={h} className="text-left py-2 pr-4 text-xs uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
    <tbody>{p.rows.length ? p.rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="py-2 pr-4 whitespace-nowrap">{c}</td>)}</tr>) : <tr><td colSpan={p.heads.length} className="py-4 text-slate-500">{p.empty || 'Nothing to show yet.'}</td></tr>}</tbody></table></div>
);
const Bars = (p: { rows: [string, number][]; fmt?: (n: number) => string; color?: string }) => {
  const max = Math.max(1, ...p.rows.map(r => r[1]));
  return p.rows.length ? <div className="space-y-2">{p.rows.map(([k, v]) => (
    <div key={k} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0 text-slate-600 truncate">{k}</span><div className="flex-1 bg-stone-100 rounded-full h-3"><div className={'h-3 rounded-full ' + (p.color || 'bg-emerald-500')} style={{ width: (v / max) * 100 + '%' }} /></div><span className="w-24 text-right font-semibold">{(p.fmt || String)(v)}</span></div>
  ))}</div> : <p className="text-sm text-slate-500">Nothing recorded in this period.</p>;
};

export default function Reports({ data, initialTab }: { data: Record<string, Rec[]>; initialTab?: (typeof TABS)[number] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab || 'Overview');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const d = data, today = todayISO();
  const R = (rows: Rec[]) => rows.filter(x => inRange(x.date, from, to));
  const animals = d.animals || [], active = animals.filter(a => a.status === 'Active');
  const fin = R(d.finance || []), prod = R(d.production || []), feed = R(d.feed || []), pfeed = R(d.poultryFeed || []), buys = R(d.birdBuys || []);
  const income = sum(fin.filter(x => x.type === 'income'), 'amount'), expense = sum(fin.filter(x => x.type === 'expense'), 'amount');
  const milk = sum(prod.filter(x => x.type === 'Milk'), 'quantity'), eggs = sum(prod.filter(x => x.type === 'Eggs'), 'quantity');
  const months = lastMonths(12), monthly = monthlyFinance(d.finance || [], months);
  const notices = useMemo(() => buildNotices({ animals, health: d.health || [], poultry: d.poultry || [], weights: d.weights || [], finance: d.finance || [] }), [d]);
  const dues = dueItems(d.health || [], animals).filter(x => x.days <= 30);
  const births = expectedBirths(animals, today, 90);
  const wOf = (id: string) => (d.weights || []).filter(w => w.animalId === id);
  const gains = active.map(a => ({ a, g: adg(wOf(a.id) as any) })).filter((x): x is { a: Rec; g: number } => x.g !== null).sort((x, y) => y.g - x.g);
  const herdAdg = gains.length ? Math.round(sum(gains.map(x => ({ g: x.g })), 'g') / gains.length) : null;
  const unweighed = active.filter(a => { const w = lastWeighed(d.weights || [], a.id); return !w || (Date.parse(today) - Date.parse(w)) / 86400000 > 60; });
  const liveKg = active.reduce((s, a) => { const w = wOf(a.id).sort((x, y) => String(x.date).localeCompare(String(y.date))).pop(); return s + Number(w?.weight || 0); }, 0);
  const dead = animals.filter(a => a.status === 'Dead').length;

  async function excel() {
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const sets: [string, Rec[]][] = [['Livestock', d.animals], ['Poultry', d.poultry], ['Weights', d.weights], ['Health', d.health], ['Events', d.events], ['Finances', d.finance], ['Production', d.production], ['Feed', d.feed], ['Bird purchases', d.birdBuys], ['Poultry feed eaten', d.poultryFeed]];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(enterpriseSummary(d.finance || []).map(e => ({ Enterprise: e.enterprise, Income: e.income, Expenses: e.expense, Profit: e.net }))), 'Profit and loss');
      sets.forEach(([name, rows]) => { const o = rowsToObjects(rows || []); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(o.length ? o : [{ Note: 'No records yet' }]), name.slice(0, 31)); });
      XLSX.writeFile(wb, 'mkulima-farm-data-' + today + '.xlsx');
    } catch { alert('Could not create the Excel file. Please try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end gap-3 bg-white border rounded-2xl p-4">
        <label className="text-sm font-semibold">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block border rounded-xl px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block border rounded-xl px-3 py-2 font-normal" /></label>
        {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm underline text-slate-600 pb-2">Clear dates</button>}
        <button onClick={() => window.print()} className="ml-auto flex gap-2 items-center bg-slate-950 text-white px-4 py-2.5 rounded-xl font-bold"><Printer size={16} />Print / save as PDF</button>
      </div>
      <div className="no-print flex flex-wrap gap-2">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 rounded-full border font-semibold ' + (tab === t ? 'bg-slate-950 text-white border-slate-950' : 'bg-white')}>{t}</button>)}
      </div>
      <div className="hidden print:block"><h2 className="text-2xl font-black">Mkulima Farm Manager: {tab} report</h2><p className="text-sm text-slate-600">{from || to ? 'Period: ' + (from ? dt(from) : 'start') + ' to ' + (to ? dt(to) : 'today') : 'All records'} · Printed {dt(today)}</p></div>

      {tab === 'Overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Income" value={money(income)} /><Stat label="Expenses" value={money(expense)} />
            <Stat label="Profit" value={money(income - expense)} note={income ? Math.round(((income - expense) / income) * 100) + '% margin' : undefined} />
            <Stat label="Active animals" value={String(active.length)} />
            <Stat label="Milk" value={milk + ' L'} /><Stat label="Eggs" value={String(eggs)} />
            <Stat label="Feed bought" value={kg(sum(feed, 'quantity'))} note={money(sum(feed, 'cost'))} /><Stat label="Poultry feed eaten" value={kg(sum(pfeed, 'kg'))} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Income vs expenses" sub="Last 12 months"><GroupedBars aName="Income" bName="Expenses" data={monthly.map(m => ({ label: monthLabel(m.month), a: m.income, b: m.expense }))} /></Panel>
            <Panel title="Needs attention" sub="Reminders and alerts right now">
              {notices.length ? <div className="space-y-2">{notices.slice(0, 8).map(n => <div key={n.id} className={'rounded-xl px-3 py-2 text-sm ' + LEVEL[n.level]}><b>{n.title}</b> · {n.text}</div>)}</div> : <p className="text-sm text-slate-500">Nothing needs attention. Well done.</p>}
            </Panel>
            <Panel title="Where the money goes" sub="Expenses by category"><Bars rows={categoryTotals(d.finance || [], 'expense', from, to).slice(0, 8)} fmt={money} color="bg-rose-400" /></Panel>
            <Panel title="Where the money comes from" sub="Income by category"><Bars rows={categoryTotals(d.finance || [], 'income', from, to).slice(0, 8)} fmt={money} color="bg-emerald-500" /></Panel>
          </div>
        </>
      )}

      {tab === 'Livestock' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Active animals" value={String(active.length)} /><Stat label="Sold" value={String(animals.filter(a => a.status === 'Sold').length)} />
            <Stat label="Herd daily gain" value={herdAdg !== null ? herdAdg + ' g/day' : '—'} note={gains.length + ' animals with 2+ weighings'} /><Stat label="Total live weight" value={liveKg ? kg(liveKg) : '—'} note="Latest weights, active animals" />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Inventory" sub="Active animals by species and type">
              <Table heads={['Species', 'Type', 'Count']} rows={Object.entries(active.reduce((m: Record<string, number>, a) => { const k = (a.species || 'Other') + '|' + animalType(a); m[k] = (m[k] || 0) + 1; return m; }, {})).sort().map(([k, n]) => [...k.split('|'), n])} empty="No active animals yet." />
            </Panel>
            <Panel title="Status and origin">
              <Table heads={['Group', 'Count']} rows={[...Object.entries(animals.reduce((m: Record<string, number>, a) => { m[a.status || 'Active'] = (m[a.status || 'Active'] || 0) + 1; return m; }, {})), ['Born on the farm (active)', active.filter(a => a.origin !== 'Purchased').length], ['Purchased (active)', active.filter(a => a.origin === 'Purchased').length], ['Listed for sale', animals.filter(a => a.forSale).length]] as [string, number][]} />
            </Panel>
            <Panel title="Growth performance" sub="Average daily gain from first to latest weighing">
              <Table heads={['Animal', 'Type', 'First', 'Latest', 'Gain/day']} rows={gains.slice(0, 15).map(({ a, g }) => { const w = wOf(a.id).sort((x, y) => String(x.date).localeCompare(String(y.date))); return [a.tag, animalType(a), w[0].weight + ' kg', w[w.length - 1].weight + ' kg', g + ' g']; })} empty="Record at least two weights for an animal to see its growth." />
            </Panel>
            <Panel title="Not weighed in 60 days" sub={unweighed.length + ' animals'}>
              <Table heads={['Animal', 'Type', 'Last weighed']} rows={unweighed.slice(0, 15).map(a => [a.tag, animalType(a), dt(lastWeighed(d.weights || [], a.id))])} empty="Every animal has been weighed recently." />
            </Panel>
          </div>
        </>
      )}

      {tab === 'Breeding & health' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Pregnant" value={String(active.filter(a => a.reproStatus === 'Pregnant' || (a.expectedDueDate && a.expectedDueDate >= today)).length)} /><Stat label="Lactating" value={String(active.filter(a => a.reproStatus === 'Lactating').length)} />
            <Stat label="Dry" value={String(active.filter(a => a.reproStatus === 'Dry').length)} /><Stat label="Mortality" value={animals.length ? Math.round((dead / animals.length) * 1000) / 10 + '%' : '0%'} note={dead + ' recorded deaths'} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Expected births" sub="Next 90 days, plus any overdue">
              <Table heads={['Animal', 'Type', 'Due', 'In']} rows={births.map(b => [b.animal.tag, animalType(b.animal), dt(b.due), b.days < 0 ? Math.abs(b.days) + ' days overdue' : b.days + ' days'])} empty="No births expected." />
            </Panel>
            <Panel title="Health actions due" sub="Overdue and due in the next 30 days">
              <Table heads={['For', 'Type', 'Due', 'Status']} rows={dues.map(x => [x.label, x.type, dt(x.due), x.days < 0 ? Math.abs(x.days) + ' days overdue' : x.days === 0 ? 'Today' : 'In ' + x.days + ' days'])} empty="No vaccinations or dewormings are due soon." />
            </Panel>
            <Panel title="Health work done" sub={from || to ? 'In the selected period' : 'All time'}>
              <Table heads={['Type', 'Records']} rows={Object.entries(R(d.health || []).reduce((m: Record<string, number>, h) => { m[h.type || 'Other'] = (m[h.type || 'Other'] || 0) + 1; return m; }, {}))} empty="No health records in this period." />
            </Panel>
            <Panel title="Breeding events" sub={from || to ? 'In the selected period' : 'All time'}>
              <Table heads={['Date', 'Animal', 'Event', 'Outcome']} rows={R(d.events || []).slice(-10).reverse().map(e => [dt(e.date), (animals.find(a => a.id === e.animalId) || {}).tag || '—', e.type || '—', e.outcome || '—'])} empty="No events recorded." />
            </Panel>
          </div>
        </>
      )}

      {tab === 'Poultry' && (() => {
        const batches = d.poultry || [];
        const startBirds = sum(batches, 'initialBirds'), nowBirds = batches.reduce((s, b) => s + Number(b.currentBirds || b.initialBirds || 0), 0);
        const eaten = sum(pfeed, 'kg'), dozens = eggs / 12;
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Birds now" value={String(nowBirds)} note={'Started with ' + startBirds} /><Stat label="Bird losses" value={startBirds ? Math.round(((startBirds - nowBirds) / startBirds) * 1000) / 10 + '%' : '0%'} />
              <Stat label="Spent on birds" value={money(sum(buys, 'amount'))} note={sum(buys, 'birds') + ' birds bought'} /><Stat label="Eggs" value={String(eggs)} note={dozens ? Math.round(dozens) + ' dozen' : undefined} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Panel title="Batches"><Table heads={['Batch', 'Started', 'Now', 'Loss', 'Age', 'Feed eaten']} rows={batches.map(b => { const s = Number(b.initialBirds || 0), n = Number(b.currentBirds || s), wk = b.hatchDate ? Math.floor((Date.parse(today) - Date.parse(String(b.hatchDate).slice(0, 10))) / 604800000) : null; return [b.batch, s, n, s ? Math.round(((s - n) / s) * 100) + '%' : '—', wk !== null && wk >= 0 ? wk + ' wk' : '—', kg(sum(pfeed.filter(f => f.batch === b.batch), 'kg'))]; })} empty="No poultry batches yet." /></Panel>
              <Panel title="Feed and production" sub="Estimates from what you have recorded">
                <Table heads={['Measure', 'Value']} rows={[['Feed eaten (period)', kg(eaten)], ['Feed per bird', nowBirds ? Math.round((eaten / nowBirds) * 100) / 100 + ' kg' : '—'], ['Eggs collected', String(eggs)], ['Feed per dozen eggs (estimate)', dozens && eaten ? Math.round((eaten / dozens) * 100) / 100 + ' kg' : '—']]} />
                <p className="text-xs text-slate-500 mt-2">Feed per dozen eggs treats all recorded poultry feed as layer feed. It is only a rough guide.</p>
              </Panel>
            </div>
          </>
        );
      })()}

      {tab === 'Finance' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Profit" value={money(income - expense)} /><Stat label="Expenses per active animal" value={active.length ? money(expense / active.length) : '—'} />
            <Stat label="Expenses per kg live weight" value={liveKg ? money(expense / liveKg) : '—'} note="Whole farm, latest weights" /><Stat label="Feed spend" value={money(categoryTotals(d.finance || [], 'expense', from, to).find(c => c[0] === 'Feed')?.[1] || 0)} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Profit and loss by enterprise" sub="Set the enterprise on each transaction in Finances">
              <Table heads={['Enterprise', 'Income', 'Expenses', 'Profit']} rows={enterpriseSummary(d.finance || [], from, to).map(e => [e.enterprise, money(e.income), money(e.expense), money(e.net)])} empty="No transactions in this period." />
            </Panel>
            <Panel title="Monthly profit" sub="Last 12 months">
              <Table heads={['Month', 'Income', 'Expenses', 'Profit']} rows={monthly.map(m => [monthLabel(m.month), money(m.income), money(m.expense), money(m.income - m.expense)])} />
            </Panel>
            <Panel title="Expenses by category"><Bars rows={categoryTotals(d.finance || [], 'expense', from, to)} fmt={money} color="bg-rose-400" /></Panel>
            <Panel title="Income by category"><Bars rows={categoryTotals(d.finance || [], 'income', from, to)} fmt={money} /></Panel>
          </div>
        </>
      )}

      {tab === 'Export' && (
        <div className="no-print space-y-4">
          <Panel title="Excel workbook" sub="Every record type on its own sheet, plus a profit and loss summary">
            <button disabled={busy} onClick={excel} className="flex gap-2 items-center bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"><Download size={16} />{busy ? 'Preparing…' : 'Download Excel (.xlsx)'}</button>
          </Panel>
          <Panel title="CSV files" sub="One file per record type, opens in Excel or Google Sheets">
            <div className="flex flex-wrap gap-2">{([['Livestock', d.animals], ['Poultry', d.poultry], ['Weights', d.weights], ['Health', d.health], ['Events', d.events], ['Finances', d.finance], ['Production', d.production], ['Feed', d.feed], ['Bird purchases', d.birdBuys], ['Poultry feed eaten', d.poultryFeed]] as [string, Rec[]][]).map(([k, rows]) => (
              <button key={k} onClick={() => downloadCSV(k, rows || [])} className="border rounded-xl px-3 py-2 text-sm font-semibold flex gap-2 items-center"><Download size={14} />{k}</button>
            ))}</div>
          </Panel>
          <Panel title="PDF report" sub="Choose a report tab above, then print and pick “Save as PDF”">
            <button onClick={() => window.print()} className="flex gap-2 items-center bg-slate-950 text-white px-4 py-2.5 rounded-xl font-bold"><Printer size={16} />Print / save as PDF</button>
          </Panel>
        </div>
      )}
    </div>
  );
}
