import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, MapPin, Tag, MessageCircle, Phone, Trash2, Edit3, X, Check, Ban } from 'lucide-react';
import { market } from './lib/backend';

const CATS = ['Animals', 'Produce', 'Feeds', 'Equipment', 'Other'];
const UNITS = ['per head', 'per piece', 'per kg', 'per bag', 'total'];
const money = (n: number) => 'KES ' + Number(n || 0).toLocaleString();
const intl = (p: string) => {
  const d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('254')) return d;
  if (d.startsWith('0')) return '254' + d.slice(1);
  return d.length === 9 ? '254' + d : d;
};
const BADGE: Record<string, string> = { pending: 'bg-amber-100 text-amber-800', live: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-800', sold: 'bg-stone-200 text-stone-700' };
const LABEL: Record<string, string> = { pending: 'Pending review', live: 'Live', rejected: 'Rejected', sold: 'Sold' };
const BLANK = { title: '', category: 'Animals', description: '', location: '', price: '', unit: 'per head', quantity: '1', contactPhone: '', paymentRef: '' };
const inp = 'mt-1 w-full border rounded-xl px-3 py-2 bg-white font-normal';

export default function Marketplace({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [review, setReview] = useState<any[]>([]);
  const [tab, setTab] = useState<'browse' | 'mine' | 'review'>('browse');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('new');
  const [rf, setRf] = useState('pending');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<any>(BLANK);
  const [keep, setKeep] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);

  async function load() {
    try {
      setItems(await market.list());
      if (isAdmin) setReview(await market.adminList());
    } catch (e: any) { setErr(e?.message || 'Could not load the marketplace.'); }
  }
  useEffect(() => { load(); }, [isAdmin]);

  const live = items.filter(x => x.status === 'live');
  const mine = items.filter(x => x.userId === userId);
  const shown = live
    .filter(x => (cat === 'All' || x.category === cat) && (x.title + ' ' + x.location + ' ' + x.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : String(b.createdAt).localeCompare(String(a.createdAt)));
  const queue = review.filter(x => rf === 'all' || x.status === rf);
  const pendingCount = review.filter(x => x.status === 'pending').length;

  function openForm(x?: any) {
    setErr(''); setFiles([]);
    if (x) {
      setEditId(x.id); setKeep(x.photos);
      setForm({ title: x.title, category: x.category, description: x.description, location: x.location, price: String(x.price), unit: x.unit, quantity: String(x.quantity), contactPhone: x.contactPhone, paymentRef: x.status === 'rejected' ? '' : x.paymentRef });
    } else { setEditId(''); setKeep([]); setForm(BLANK); }
    setShow(true);
  }
  function addFiles(list: FileList | null) {
    const next = [...files, ...Array.from(list || [])];
    if (keep.length + next.length > 5) { setErr('You can add up to 5 photos.'); return; }
    setErr(''); setFiles(next);
  }
  async function submit(e: any) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await market.save(form, files, keep, editId || undefined);
      setShow(false);
      setMsg('Submitted. An admin will check your payment and approve the listing before it goes live.');
      setTab('mine');
      await load();
    } catch (x: any) { setErr(x?.message || 'Could not submit the listing.'); }
    finally { setBusy(false); }
  }
  async function act(fn: () => Promise<any>) { setErr(''); try { await fn(); await load(); } catch (x: any) { setErr(x?.message || 'Action failed.'); } }

  const Photos = ({ x, big }: { x: any; big?: boolean }) => x.photos?.length
    ? <img src={x.photos[0]} alt={x.title} className={(big ? 'h-64' : 'h-48') + ' w-full object-cover'} />
    : <div className={(big ? 'h-64' : 'h-48') + ' w-full bg-stone-100 flex items-center justify-center text-slate-400 text-sm'}>No photo</div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-black">Marketplace</h2>
          <p className="text-slate-500">{live.length} active {live.length === 1 ? 'listing' : 'listings'} from verified farmers</p>
        </div>
        <button onClick={() => openForm()} className="flex gap-2 items-center bg-emerald-500 px-4 py-2.5 rounded-xl font-bold"><Plus size={18} />Post listing</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {([['browse', 'Browse'], ['mine', 'My listings (' + mine.length + ')']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={'px-4 py-2 rounded-full border font-semibold ' + (tab === k ? 'bg-slate-950 text-white border-slate-950' : 'bg-white')}>{l}</button>
        ))}
        {isAdmin && <button onClick={() => setTab('review')} className={'px-4 py-2 rounded-full border font-semibold ' + (tab === 'review' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white')}>Review queue{pendingCount ? ' (' + pendingCount + ')' : ''}</button>}
      </div>
      {msg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex justify-between gap-3"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16} /></button></div>}
      {err && !show && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{err}</div>}

      {tab === 'browse' && (
        <>
          <div className="bg-white border rounded-2xl p-4 mb-5 grid md:grid-cols-[1fr_auto_auto] gap-3">
            <label className="relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search product or location" className="w-full border rounded-xl pl-9 pr-3 py-2.5" /></label>
            <select value={cat} onChange={e => setCat(e.target.value)} className="border rounded-xl px-3 py-2.5 bg-white"><option>All</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="border rounded-xl px-3 py-2.5 bg-white"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select>
          </div>
          {shown.length === 0 && <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">No listings match yet.</div>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {shown.map(x => (
              <div key={x.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">
                <button onClick={() => setDetail(x)} className="text-left"><Photos x={x} /></button>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between gap-2"><b className="text-lg leading-tight">{x.title}</b><span className="text-xs h-fit px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">{x.category}</span></div>
                  {x.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{x.description}</p>}
                  <p className="text-sm text-slate-500 mt-2 flex gap-1 items-center"><MapPin size={14} />{x.location}</p>
                  <div className="flex justify-between items-end mt-3"><div><div className="text-xl font-black">{money(x.price)}</div><div className="text-sm text-slate-500">{x.unit}</div></div><div className="text-sm text-slate-500 flex gap-1 items-center"><Tag size={14} />{x.quantity} available</div></div>
                  <div className="border-t mt-3 pt-3 flex justify-between items-center text-sm">
                    <span className="text-slate-500">By <b className="text-slate-800">{x.sellerName}</b></span>
                    <span className="flex gap-3">
                      <a className="flex gap-1 items-center font-semibold text-emerald-700" target="_blank" rel="noreferrer" href={'https://wa.me/' + intl(x.contactPhone) + '?text=' + encodeURIComponent('Hello, I am interested in your listing "' + x.title + '" on Mkulima.')}><MessageCircle size={15} />Enquire</a>
                      <a className="flex gap-1 items-center font-semibold" href={'tel:+' + intl(x.contactPhone)}><Phone size={15} />Call</a>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <div className="space-y-4">
          {mine.length === 0 && <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">You have no listings yet. Click Post listing to advertise something.</div>}
          {mine.map(x => (
            <div key={x.id} className="bg-white border rounded-2xl overflow-hidden grid sm:grid-cols-[220px_1fr]">
              <Photos x={x} />
              <div className="p-4">
                <div className="flex flex-wrap justify-between gap-2"><b className="text-lg">{x.title}</b><span className={'text-xs h-fit px-2 py-1 rounded-full font-semibold ' + BADGE[x.status]}>{LABEL[x.status]}</span></div>
                <div className="text-sm text-slate-500 mt-1">{money(x.price)} {x.unit} · {x.quantity} available · {x.location}</div>
                <div className="text-xs text-slate-500 mt-1">M-Pesa code {x.paymentRef} · fee {money(x.feeAmount)}</div>
                {x.status === 'rejected' && <div className="mt-2 text-sm text-rose-700 bg-rose-50 rounded-xl p-2">Not approved: {x.rejectReason}. Fix the issue, edit and resubmit.</div>}
                {x.status === 'pending' && <div className="mt-2 text-sm text-amber-800 bg-amber-50 rounded-xl p-2">Waiting for an admin to verify your payment and approve it.</div>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {x.status !== 'sold' && <button onClick={() => openForm(x)} className="flex gap-1 items-center border rounded-xl px-3 py-1.5 text-sm font-semibold"><Edit3 size={14} />{x.status === 'live' ? 'Edit (needs re-approval)' : 'Edit'}</button>}
                  {x.status === 'live' && <button onClick={() => act(() => market.markSold(x.id))} className="flex gap-1 items-center border rounded-xl px-3 py-1.5 text-sm font-semibold"><Check size={14} />Mark as sold</button>}
                  <button onClick={() => { if (confirm('Delete this listing?')) act(() => market.remove(x.id, x.photos)); }} className="flex gap-1 items-center border rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-600"><Trash2 size={14} />Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'review' && isAdmin && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['pending', 'live', 'rejected', 'sold', 'all'].map(s => (
              <button key={s} onClick={() => setRf(s)} className={'px-3 py-1.5 rounded-xl border text-sm font-semibold capitalize ' + (rf === s ? 'bg-emerald-500 border-emerald-500' : 'bg-white')}>{s}</button>
            ))}
          </div>
          <div className="space-y-4">
            {queue.length === 0 && <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">Nothing here.</div>}
            {queue.map(x => (
              <div key={x.id} className="bg-white border rounded-2xl p-4">
                <div className="flex flex-wrap justify-between gap-2"><b className="text-lg">{x.title}</b><span className={'text-xs h-fit px-2 py-1 rounded-full font-semibold ' + BADGE[x.status]}>{LABEL[x.status]}</span></div>
                <div className="text-sm text-slate-600 mt-1">{money(x.price)} {x.unit} · {x.quantity} available · {x.category} · {x.location}</div>
                <div className="text-sm mt-1">Seller: <b>{x.sellerName}</b> · {x.sellerEmail} · {x.contactPhone}</div>
                <div className="text-sm mt-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Payment to verify: M-Pesa code <b>{x.paymentRef}</b> for {money(x.feeAmount)}. Match it against your M-Pesa statement before approving.</div>
                {x.description && <p className="text-sm text-slate-600 mt-2">{x.description}</p>}
                <div className="flex gap-2 overflow-x-auto mt-3">{x.photos.map((u: string) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-28 w-28 object-cover rounded-xl border shrink-0" /></a>)}</div>
                <div className="flex gap-2 mt-3">
                  {x.status !== 'live' && x.status !== 'sold' && <button onClick={() => act(() => market.adminAct(x.id, 'approve'))} className="flex gap-1 items-center bg-emerald-500 rounded-xl px-4 py-2 font-bold text-sm"><Check size={15} />Approve</button>}
                  {x.status !== 'rejected' && <button onClick={() => { const r = prompt('Reason for rejecting (the seller will see this):'); if (r) act(() => market.adminAct(x.id, 'reject', r)); }} className="flex gap-1 items-center border border-rose-300 text-rose-700 rounded-xl px-4 py-2 font-bold text-sm"><Ban size={15} />{x.status === 'live' ? 'Take down' : 'Reject'}</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between p-4"><b className="text-xl">{detail.title}</b><button onClick={() => setDetail(null)}><X /></button></div>
            <div className="px-4 grid grid-cols-2 gap-2">{detail.photos.map((u: string) => <img key={u} src={u} alt="" className="w-full h-44 object-cover rounded-xl" />)}</div>
            <div className="p-4 space-y-1 text-sm">
              <div className="text-2xl font-black">{money(detail.price)} <span className="text-base font-normal text-slate-500">{detail.unit}</span></div>
              <div className="text-slate-500">{detail.quantity} available · {detail.location}</div>
              {detail.description && <p className="pt-2 text-slate-700">{detail.description}</p>}
              <div className="pt-3 flex gap-4"><a className="font-semibold text-emerald-700" target="_blank" rel="noreferrer" href={'https://wa.me/' + intl(detail.contactPhone) + '?text=' + encodeURIComponent('Hello, I am interested in your listing "' + detail.title + '" on Mkulima.')}>WhatsApp {detail.sellerName}</a><a className="font-semibold" href={'tel:+' + intl(detail.contactPhone)}>Call</a></div>
            </div>
          </div>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-auto p-5">
            <div className="flex justify-between mb-4"><b className="text-xl">{editId ? 'Edit listing' : 'Post a listing'}</b><button onClick={() => setShow(false)} aria-label="Close"><X /></button></div>
            {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>}
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 text-sm font-semibold">
              <label className="md:col-span-2">Title<input className={inp} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Boer bucks, 8 months" /></label>
              <label>Category<select className={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Location<input className={inp} required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Town, county" /></label>
              <label>Price (KES)<input className={inp} required type="number" min="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
              <label>Price unit<select className={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Quantity available<input className={inp} required type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
              <label>Your phone / WhatsApp<input className={inp} required value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="07XX XXX XXX" /></label>
              <label className="md:col-span-2">Description<textarea className={inp} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Age, breed, health, vaccinations, anything buyers should know" /></label>
              <div className="md:col-span-2">
                Photos (up to 5, at least 1)
                <input className={inp} type="file" accept="image/*" multiple onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                <div className="flex flex-wrap gap-2 mt-2">
                  {keep.map(u => <div key={u} className="relative"><img src={u} alt="" className="h-20 w-20 object-cover rounded-xl border" /><button type="button" aria-label="Remove photo" onClick={() => setKeep(keep.filter(k => k !== u))} className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5"><X size={14} /></button></div>)}
                  {previews.map((u, i) => <div key={u} className="relative"><img src={u} alt="" className="h-20 w-20 object-cover rounded-xl border" /><button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5"><X size={14} /></button></div>)}
                </div>
              </div>
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-normal">
                <b className="text-base">Listing fee: {money(market.fee)}</b>
                <p className="mt-1 text-slate-700">{market.instructions}</p>
                <p className="mt-1 text-slate-600">The fee helps us keep out fake and fraudulent adverts. An admin checks your payment and your listing, then approves it. If it is rejected, you can fix it and resubmit.</p>
                <label className="block mt-3 font-semibold">M-Pesa transaction code<input className={inp + ' uppercase'} required value={form.paymentRef} onChange={e => setForm({ ...form, paymentRef: e.target.value })} placeholder="e.g. SJK3L9M2QX" maxLength={12} /></label>
              </div>
              <button disabled={busy} className="md:col-span-2 rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{busy ? 'Uploading…' : editId ? 'Resubmit for approval' : 'Submit for approval'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
