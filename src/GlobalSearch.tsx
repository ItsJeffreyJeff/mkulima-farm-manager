import { useState } from 'react';
import { Search, X } from 'lucide-react';

type Rec = Record<string, any>;
const money = (n: any) => 'KSh ' + Math.round(Number(n || 0)).toLocaleString();

export default function GlobalSearch({ data, onGo }: { data: Record<string, Rec[]>; onGo: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const hit = (...v: any[]) => v.map(x => x ?? '').join(' ').toLowerCase().includes(term);
  const tag = (id: string) => (data.animals || []).find(a => a.id === id)?.tag || '';
  const groups: [string, string, [string, string][]][] = term.length < 2 ? [] : [
    ['Livestock', 'Livestock', (data.animals || []).filter(a => hit(a.tag, a.name, a.breed, a.species, a.sex, a.status, a.notes)).map(a => [a.tag + (a.name ? ' · ' + a.name : ''), [a.species, a.sex, a.breed, a.status].filter(Boolean).join(' · ')] as [string, string])],
    ['Poultry', 'Poultry', (data.poultry || []).filter(b => hit(b.batch, b.breed, b.source, b.notes)).map(b => [b.batch, [b.breed, b.currentBirds || b.initialBirds ? (b.currentBirds || b.initialBirds) + ' birds' : ''].filter(Boolean).join(' · ')] as [string, string])],
    ['Health', 'Health', (data.health || []).filter(h => hit(h.type, h.vaccine, h.provider, h.notes, tag(h.animalId))).map(h => [(h.type || 'Health') + (h.vaccine ? ' · ' + h.vaccine : ''), [tag(h.animalId) || (h.animalId === 'ALL' ? 'All animals' : ''), String(h.date || '').slice(0, 10)].filter(Boolean).join(' · ')] as [string, string])],
    ['Finances', 'Finances', (data.finance || []).filter(f => hit(f.description, f.category, f.enterprise, f.amount)).map(f => [f.description || f.category, String(f.date || '').slice(0, 10) + ' · ' + f.category + ' · ' + (f.type === 'income' ? '+' : '-') + money(f.amount)] as [string, string])],
    ['Production', 'Production', (data.production || []).filter(p => hit(p.type, p.batch, p.notes, tag(p.animalId))).map(p => [p.type + ' · ' + p.quantity, String(p.date || '').slice(0, 10) + (p.notes ? ' · ' + p.notes : '')] as [string, string])],
    ['Feed', 'Feed', (data.feed || []).filter(f => hit(f.feedType, f.group, f.notes)).map(f => [f.feedType + ' · ' + f.quantity + ' kg', String(f.date || '').slice(0, 10) + ' · ' + (f.group || '')] as [string, string])],
    ['Events', 'Events', (data.events || []).filter(e => hit(e.type, e.details, e.outcome, tag(e.animalId))).map(e => [e.type + (tag(e.animalId) ? ' · ' + tag(e.animalId) : ''), String(e.date || '').slice(0, 10) + (e.outcome ? ' · ' + e.outcome : '')] as [string, string])],
  ];
  const total = groups.reduce((s, g) => s + g[2].length, 0);
  const close = () => { setOpen(false); setQ(''); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-white border p-2.5 rounded-xl" aria-label="Search" title="Search everything"><Search size={18} /></button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-3 sm:pt-20 flex items-start justify-center" onClick={close}>
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center gap-3 border-b sticky top-0 bg-white">
              <Search size={18} className="text-slate-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search animals, health, finances, feed…" className="flex-1 outline-none text-lg" />
              <button onClick={close} aria-label="Close"><X /></button>
            </div>
            <div className="p-4 space-y-4">
              {term.length < 2 && <p className="text-slate-500 text-sm">Type at least 2 letters. Search covers livestock, poultry, health, finances, production, feed and events.</p>}
              {term.length >= 2 && total === 0 && <p className="text-slate-500 text-sm">Nothing found for “{q}”.</p>}
              {groups.filter(g => g[2].length).map(([label, page, rows]) => (
                <div key={label}>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label} ({rows.length})</div>
                  {rows.slice(0, 5).map(([t, s], i) => (
                    <button key={i} onClick={() => { onGo(page); close(); }} className="w-full text-left rounded-xl px-3 py-2 hover:bg-stone-50"><div className="font-semibold">{t}</div><div className="text-xs text-slate-500">{s}</div></button>
                  ))}
                  {rows.length > 5 && <button onClick={() => { onGo(page); close(); }} className="text-sm text-emerald-700 font-semibold px-3">See all {rows.length} in {label}</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
