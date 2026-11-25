import { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, Sprout } from 'lucide-react';
import { api } from './lib/backend';
import { ACTIVITY_TYPES, CROPS, UNITS, UNIT_DEFAULT, financeCategoryFor, suggestHarvest } from './cropdata';
import { cropSummary, harvestText, type Rec } from './analytics';

const money = (n: number) => 'KSh ' + Math.round(n || 0).toLocaleString().replace(/[\u00a0\u202f]/g, ' ');
const today = () => new Date().toISOString().slice(0, 10);
const dt = (s: string) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const STATUS = ['Planned', 'Growing', 'Harvested', 'Failed'];
const CHIP: Record<string, string> = { Planned: 'bg-sky-50 text-sky-700', Growing: 'bg-emerald-50 text-emerald-700', Harvested: 'bg-stone-100 text-stone-700', Failed: 'bg-rose-50 text-rose-700' };
const BLANK_C = { name: '', variety: '', field: '', area: '', plantDate: '', expectedHarvest: '', status: 'Growing', notes: '' };
const blankA = (cropId: string) => ({ cropId, date: today(), type: 'Seeds', item: '', quantity: '', unit: 'kg', cost: '', saleIncome: '', notes: '' });
const inp = 'mt-1 w-full border rounded-xl px-3 py-2 bg-white font-normal';

export default function Crops({ crops, acts, onChange }: { crops: Rec[]; acts: Rec[]; onChange: () => Promise<any> | void }) {
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState('');
  const [showC, setShowC] = useState(false);
  const [cf, setCf] = useState<any>(BLANK_C);
  const [editC, setEditC] = useState('');
  const [showA, setShowA] = useState(false);
  const [af, setAf] = useState<any>(blankA(''));
  const [editA, setEditA] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const rows = cropSummary(crops, acts);
  const shown = rows.filter(r => filter === 'All' || r.crop.status === filter);
  const active = crops.filter(c => c.status === 'Growing' || c.status === 'Planned');
  const area = active.reduce((s, c) => s + Number(c.area || 0), 0);
  const spent = rows.reduce((s, r) => s + r.cost, 0);
  const soon = active.filter(c => c.expectedHarvest && (Date.parse(String(c.expectedHarvest).slice(0, 10)) - Date.parse(today())) / 86400000 <= 30).length;
  const crop = (id: string) => crops.find(c => c.id === id);

  async function run(fn: () => Promise<any>, ok?: string) {
    setBusy(true); setErr('');
    try { await fn(); await onChange(); if (ok) setMsg(ok); } catch (e: any) { setErr(e?.message || 'Something went wrong. Please try again.'); } finally { setBusy(false); }
  }
  const openCrop = (c?: Rec) => { setErr(''); setEditC(c?.id || ''); setCf(c ? { name: c.name, variety: c.variety || '', field: c.field || '', area: c.area || '', plantDate: c.plantDate || '', expectedHarvest: c.expectedHarvest || '', status: c.status || 'Growing', notes: c.notes || '' } : BLANK_C); setShowC(true); };
  const openAct = (cropId: string, a?: Rec) => { setErr(''); setEditA(a?.id || ''); setAf(a ? { cropId: a.cropId, date: String(a.date).slice(0, 10), type: a.type, item: a.item || '', quantity: a.quantity || '', unit: a.unit || 'kg', cost: a.cost || '', saleIncome: a.saleIncome || '', notes: a.notes || '' } : blankA(cropId)); setShowA(true); };

  async function saveCrop(e: any) {
    e.preventDefault();
    await run(async () => {
      if (!cf.name.trim()) throw new Error('Enter the name of the crop.');
      if (editC) await api.put('/api/crops/' + editC, cf); else await api.post('/api/crops', cf);
      setShowC(false);
    }, editC ? 'Crop updated.' : 'Crop added. Now record what you spend and do on it.');
  }
  async function saveAct(e: any) {
    e.preventDefault();
    await run(async () => {
      const c = crop(af.cropId);
      if (!c) throw new Error('Choose the crop first.');
      const cost = Number(af.cost) || 0, income = Number(af.saleIncome) || 0;
      if (editA) { await api.put('/api/cropactivities/' + editA, af); }
      else {
        await api.post('/api/cropactivities', af);
        const what = c.name + ': ' + af.type + (af.item ? ' - ' + af.item : '');
        if (cost > 0) await api.post('/api/finance', { date: af.date, type: 'expense', category: financeCategoryFor(af.type), enterprise: 'Crops', description: what, amount: cost });
        if (af.type === 'Harvesting' && income > 0) await api.post('/api/finance', { date: af.date, type: 'income', category: 'Crops', enterprise: 'Crops', description: c.name + ' harvest sales', amount: income });
      }
      setShowA(false); setOpen(af.cropId);
    }, editA ? 'Activity updated.' : 'Activity saved' + (Number(af.cost) > 0 ? ' and added to Finances.' : '.'));
  }
  async function delCrop(c: Rec) {
    const mine = acts.filter(a => a.cropId === c.id);
    if (!confirm('Delete ' + c.name + (mine.length ? ' and its ' + mine.length + ' activity records' : '') + '? Finance entries stay as they are.')) return;
    await run(async () => { for (const a of mine) await api.delete('/api/cropactivities/' + a.id); await api.delete('/api/crops/' + c.id); }, 'Crop deleted.');
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h2 className="text-2xl font-black">Crops</h2><p className="text-slate-500">Record your fields, what you put into them and what you harvest</p></div>
        <div className="flex gap-2">
          {crops.length > 0 && <button onClick={() => openAct(crops[0].id)} className="flex gap-2 items-center bg-white border rounded-xl px-4 py-2.5 font-semibold"><Plus size={16} />Record activity</button>}
          <button onClick={() => openCrop()} className="flex gap-2 items-center bg-slate-950 text-white rounded-xl px-4 py-2.5 font-bold"><Plus size={16} />Add crop</button>
        </div>
      </div>
      {msg && <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex justify-between gap-3"><span>{msg}</span><button onClick={() => setMsg('')} aria-label="Dismiss">×</button></div>}
      {err && !showC && !showA && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{err}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {([['Active crops', String(active.length)], ['Area under crops', Math.round(area * 100) / 100 + ' acres'], ['Harvests in 30 days', String(soon)], ['Total spent', money(spent)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-white border rounded-2xl p-4 min-w-0"><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div><div className="text-lg sm:text-2xl font-black mt-1 break-words leading-tight">{v}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['All', ...STATUS].map(s => <button key={s} onClick={() => setFilter(s)} className={'px-3 py-1.5 rounded-xl border text-sm font-semibold ' + (filter === s ? 'bg-emerald-500 border-emerald-500' : 'bg-white')}>{s}{s === 'All' ? ' (' + crops.length + ')' : ' (' + crops.filter(c => c.status === s).length + ')'}</button>)}
      </div>
      {shown.length === 0 && (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">
          <Sprout className="mx-auto mb-3 text-emerald-600" size={32} />
          {crops.length === 0 ? 'No crops yet. Click Add crop to record your first field, for example maize on 2 acres.' : 'No crops with this status.'}
        </div>
      )}
      <div className="space-y-3">
        {shown.map(({ crop: c, cost, income, profit, harvest, activities }) => {
          const mine = acts.filter(a => a.cropId === c.id).sort((x, y) => String(y.date).localeCompare(String(x.date)));
          const days = c.expectedHarvest ? Math.round((Date.parse(String(c.expectedHarvest).slice(0, 10)) - Date.parse(today())) / 86400000) : null;
          return (
            <div key={c.id} className="bg-white border rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-lg leading-tight">{c.name}{c.variety ? <span className="font-normal text-slate-500"> · {c.variety}</span> : ''}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{[c.field, c.area ? c.area + ' acres' : '', c.plantDate ? 'planted ' + dt(c.plantDate) : ''].filter(Boolean).join(' · ') || 'No field details yet'}</div>
                </div>
                <span className={'text-xs px-2.5 py-1 rounded-full font-semibold ' + (CHIP[c.status] || CHIP.Growing)}>{c.status}</span>
              </div>
              {c.expectedHarvest && c.status !== 'Harvested' && c.status !== 'Failed' && <div className={'text-sm mt-2 ' + (days !== null && days < 0 ? 'text-rose-600 font-semibold' : 'text-slate-600')}>Expected harvest {dt(c.expectedHarvest)}{days !== null ? (days < 0 ? ' (' + Math.abs(days) + ' days overdue)' : days === 0 ? ' (today)' : ' (in ' + days + ' days)') : ''}</div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                {([['Spent', money(cost)], ['Harvested', harvestText(harvest) || '—'], ['Sales', income ? money(income) : '—'], ['Profit', activities && (cost || income) ? money(profit) : '—']] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-stone-50 px-3 py-2 min-w-0"><div className="text-[11px] text-slate-500">{l}</div><div className={'font-bold break-words ' + (l === 'Profit' && profit < 0 ? 'text-rose-600' : '')}>{v}</div></div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={() => openAct(c.id)} className="flex gap-1 items-center bg-emerald-500 rounded-xl px-3 py-1.5 text-sm font-bold"><Plus size={14} />Add activity</button>
                <button onClick={() => openCrop(c)} className="flex gap-1 items-center border rounded-xl px-3 py-1.5 text-sm font-semibold"><Edit3 size={14} />Edit</button>
                <button onClick={() => delCrop(c)} className="flex gap-1 items-center border rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-600"><Trash2 size={14} />Delete</button>
                <button onClick={() => setOpen(open === c.id ? '' : c.id)} className="ml-auto flex gap-1 items-center text-sm font-semibold text-emerald-700">Activities ({mine.length})<ChevronDown size={16} className={open === c.id ? 'rotate-180' : ''} /></button>
              </div>
              {open === c.id && (
                <div className="mt-3 border-t pt-3 overflow-x-auto">
                  {mine.length === 0 ? <p className="text-sm text-slate-500">Nothing recorded yet. Add seeds, fertiliser, weeding, spraying, labour and harvests here.</p> : (
                    <table className="w-full text-sm">
                      <thead><tr>{['Date', 'Activity', 'Item', 'Amount', 'Cost', ''].map(h => <th key={h} className="text-left py-2 pr-3 text-xs uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
                      <tbody>{mine.map(a => (
                        <tr key={a.id} className="border-t">
                          <td className="py-2 pr-3 whitespace-nowrap">{dt(a.date)}</td><td className="py-2 pr-3 whitespace-nowrap font-semibold">{a.type}</td><td className="py-2 pr-3">{a.item || '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{a.quantity ? a.quantity + ' ' + (a.unit || '') : '—'}</td><td className="py-2 pr-3 whitespace-nowrap">{Number(a.cost) ? money(Number(a.cost)) : '—'}</td>
                          <td className="py-2 whitespace-nowrap"><button className="p-2 text-slate-600" aria-label="Edit activity" onClick={() => openAct(c.id, a)}><Edit3 size={15} /></button><button className="p-2 text-red-600" aria-label="Delete activity" onClick={() => { if (confirm('Delete this activity?')) run(() => api.delete('/api/cropactivities/' + a.id)); }}><Trash2 size={15} /></button></td>
                        </tr>))}</tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showC && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-auto p-5">
            <div className="flex justify-between mb-3"><b className="text-xl">{editC ? 'Edit crop' : 'Add a crop'}</b><button onClick={() => setShowC(false)} aria-label="Close">×</button></div>
            {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>}
            <form onSubmit={saveCrop} className="grid sm:grid-cols-2 gap-3 text-sm font-semibold">
              <label className="sm:col-span-2">Crop<input list="crop-names" className={inp} required value={cf.name} onChange={e => { const name = e.target.value; setCf({ ...cf, name, expectedHarvest: cf.expectedHarvest || suggestHarvest(name, cf.plantDate) }); }} placeholder="e.g. Maize" /><datalist id="crop-names">{CROPS.map(c => <option key={c} value={c} />)}</datalist></label>
              <label>Variety (optional)<input className={inp} value={cf.variety} onChange={e => setCf({ ...cf, variety: e.target.value })} placeholder="e.g. H614" /></label>
              <label>Field or plot<input className={inp} value={cf.field} onChange={e => setCf({ ...cf, field: e.target.value })} placeholder="e.g. North plot" /></label>
              <label>Area (acres)<input className={inp} type="number" step="any" min="0" value={cf.area} onChange={e => setCf({ ...cf, area: e.target.value })} /></label>
              <label>Status<select className={inp} value={cf.status} onChange={e => setCf({ ...cf, status: e.target.value })}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></label>
              <label>Planting date<input className={inp} type="date" value={cf.plantDate} onChange={e => { const plantDate = e.target.value; setCf({ ...cf, plantDate, expectedHarvest: suggestHarvest(cf.name, plantDate) || cf.expectedHarvest }); }} /></label>
              <label>Expected harvest<input className={inp} type="date" value={cf.expectedHarvest} onChange={e => setCf({ ...cf, expectedHarvest: e.target.value })} /></label>
              <p className="sm:col-span-2 text-xs font-normal text-slate-500">The harvest date is suggested from the crop and planting date. Change it to match your own variety and rains.</p>
              <label className="sm:col-span-2">Notes<textarea className={inp} rows={2} value={cf.notes} onChange={e => setCf({ ...cf, notes: e.target.value })} /></label>
              <button disabled={busy} className="sm:col-span-2 rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{busy ? 'Saving…' : 'Save crop'}</button>
            </form>
          </div>
        </div>
      )}

      {showA && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-auto p-5">
            <div className="flex justify-between mb-3"><b className="text-xl">{editA ? 'Edit activity' : 'Record an activity'}</b><button onClick={() => setShowA(false)} aria-label="Close">×</button></div>
            {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>}
            <form onSubmit={saveAct} className="grid sm:grid-cols-2 gap-3 text-sm font-semibold">
              <label>Crop<select className={inp} required value={af.cropId} onChange={e => setAf({ ...af, cropId: e.target.value })}>{crops.map(c => <option key={c.id} value={c.id}>{c.name}{c.field ? ' · ' + c.field : ''}</option>)}</select></label>
              <label>Date<input className={inp} type="date" required value={af.date} onChange={e => setAf({ ...af, date: e.target.value })} /></label>
              <label>Activity<select className={inp} value={af.type} onChange={e => setAf({ ...af, type: e.target.value, unit: UNIT_DEFAULT[e.target.value] || af.unit })}>{ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
              <label>Item or details<input className={inp} value={af.item} onChange={e => setAf({ ...af, item: e.target.value })} placeholder={af.type === 'Fertiliser' ? 'e.g. DAP' : af.type === 'Seeds' ? 'e.g. H614 maize seed' : af.type === 'Harvesting' ? 'e.g. first picking' : ''} /></label>
              <label>{af.type === 'Harvesting' ? 'Amount harvested' : 'Amount used'}<input className={inp} type="number" step="any" min="0" value={af.quantity} onChange={e => setAf({ ...af, quantity: e.target.value })} /></label>
              <label>Unit<select className={inp} value={af.unit} onChange={e => setAf({ ...af, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></label>
              <label>Cost (KSh)<input className={inp} type="number" step="any" min="0" value={af.cost} onChange={e => setAf({ ...af, cost: e.target.value })} placeholder="What you paid" /></label>
              {af.type === 'Harvesting' ? <label>Sales income (KSh)<input className={inp} type="number" step="any" min="0" value={af.saleIncome} onChange={e => setAf({ ...af, saleIncome: e.target.value })} placeholder="If you sold it" /></label> : <span />}
              <label className="sm:col-span-2">Notes<textarea className={inp} rows={2} value={af.notes} onChange={e => setAf({ ...af, notes: e.target.value })} /></label>
              {!editA && <p className="sm:col-span-2 text-xs font-normal text-slate-500">New costs are also added to Finances as expenses{af.type === 'Harvesting' ? ', and sales as income' : ''}, under the Crops enterprise. Editing later does not change those Finance entries.</p>}
              <button disabled={busy} className="sm:col-span-2 rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{busy ? 'Saving…' : 'Save activity'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
