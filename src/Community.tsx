import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Phone, Mail, MapPin, Trash2, Check, X, Stethoscope, Search, LocateFixed } from 'lucide-react';
import { community } from './lib/backend';

const CATS = ['General', 'Livestock health', 'Feeding', 'Breeding', 'Poultry', 'Dairy', 'Crops', 'Marketing'];
const PROFS = ['Vet', 'Agronomist', 'Animal health technician', 'Feed & nutrition advisor', 'Breeding / AI service', 'Other'];
const BLANK_Q = { title: '', body: '', category: 'General', location: '' };
const BLANK_E = { name: '', profession: 'Vet', location: '', phone: '', email: '', bio: '', latitude: null as number | null, longitude: null as number | null };
const inp = 'mt-1 w-full border rounded-xl px-3 py-2 bg-white font-normal';
const intl = (p: string) => { const d = String(p || '').replace(/\D/g, ''); if (d.startsWith('254')) return d; if (d.startsWith('0')) return '254' + d.slice(1); return d.length === 9 ? '254' + d : d; };
const initials = (n: string) => String(n || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
const ago = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
};
const km = (a: number, b: number, c: number, d: number) => {
  const r = (x: number) => (x * Math.PI) / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export default function Community({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) {
  const [tab, setTab] = useState<'questions' | 'experts'>('questions');
  const [qs, setQs] = useState<any[]>([]);
  const [ans, setAns] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [qf, setQf] = useState<any>(BLANK_Q);
  const [open, setOpen] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [catF, setCatF] = useState('All');
  const [showE, setShowE] = useState(false);
  const [ef, setEf] = useState<any>(BLANK_E);
  const [editId, setEditId] = useState('');
  const [search, setSearch] = useState('');
  const [profF, setProfF] = useState('All');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingView, setPendingView] = useState(false);

  async function load() {
    try {
      const [a, b, c] = await Promise.all([community.questions(), community.answers(), community.experts()]);
      setQs(a); setAns(b); setExperts(c);
    } catch (e: any) { setErr(e?.message || 'Could not load the community.'); }
  }
  useEffect(() => {
    load();
    const off = community.subscribe(() => load());
    const t = setInterval(load, 30000); // safety net if live updates are unavailable
    return () => { off(); clearInterval(t); };
  }, []);

  const byQ = useMemo(() => { const m: Record<string, any[]> = {}; ans.forEach(x => (m[x.question_id] = m[x.question_id] || []).push(x)); return m; }, [ans]);
  const shownQ = qs.filter(q => catF === 'All' || q.category === catF);
  const approved = experts.filter(x => x.status === 'approved');
  const mine = experts.find(x => x.user_id === userId);
  const pending = experts.filter(x => x.status === 'pending');
  const list = (pendingView && isAdmin ? pending : approved)
    .filter(x => (profF === 'All' || x.profession === profF) && (x.name + ' ' + x.profession + ' ' + x.location + ' ' + (x.bio || '')).toLowerCase().includes(search.toLowerCase()))
    .map(x => ({ ...x, dist: me && x.latitude != null && x.longitude != null ? km(me.lat, me.lng, x.latitude, x.longitude) : null }))
    .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));

  async function run(fn: () => Promise<any>, ok?: string) {
    setErr(''); setBusy(true);
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e: any) { setErr(e?.message || 'Something went wrong.'); } finally { setBusy(false); }
  }
  function locate(cb: (lat: number, lng: number) => void) {
    if (!navigator.geolocation) { setErr('Your browser cannot share its location.'); return; }
    navigator.geolocation.getCurrentPosition(p => cb(p.coords.latitude, p.coords.longitude), () => setErr('Location permission was denied.'), { timeout: 10000 });
  }
  function openExpert(x?: any) {
    setErr(''); setEditId(x?.id || '');
    setEf(x ? { name: x.name, profession: x.profession, location: x.location, phone: x.phone, email: x.email || '', bio: x.bio || '', latitude: x.latitude, longitude: x.longitude } : BLANK_E);
    setShowE(true);
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-black">Community</h2>
        <p className="text-slate-500">Ask questions, share answers and find vets and advisors near you</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {([['questions', 'Questions (' + qs.length + ')'], ['experts', 'Experts (' + approved.length + ')']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={'px-4 py-2 rounded-full border font-semibold ' + (tab === k ? 'bg-slate-950 text-white border-slate-950' : 'bg-white')}>{l}</button>
        ))}
        <span className="ml-auto self-center text-xs text-emerald-700 font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Live</span>
      </div>
      {msg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex justify-between gap-3"><span>{msg}</span><button onClick={() => setMsg('')}><X size={16} /></button></div>}
      {err && !showE && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{err}</div>}

      {tab === 'questions' && (
        <div className="space-y-4">
          <form onSubmit={e => { e.preventDefault(); run(async () => { await community.ask(qf); setQf(BLANK_Q); }, 'Your question is live. Others can answer it now.'); }} className="bg-white border rounded-2xl p-4 sm:p-5 space-y-3">
            <b className="text-lg">Ask the community</b>
            <input className={inp} required value={qf.title} onChange={e => setQf({ ...qf, title: e.target.value })} placeholder="Your question, e.g. My goat is not eating, what should I do?" />
            <textarea className={inp} rows={3} value={qf.body} onChange={e => setQf({ ...qf, body: e.target.value })} placeholder="Add details: age, symptoms, how long, what you have tried" />
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
              <select className={inp} value={qf.category} onChange={e => setQf({ ...qf, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
              <input className={inp} value={qf.location} onChange={e => setQf({ ...qf, location: e.target.value })} placeholder="Your area (optional)" />
              <button disabled={busy} className="mt-1 bg-emerald-600 text-white rounded-xl px-5 py-2 font-bold disabled:opacity-60">Post question</button>
            </div>
            <p className="text-xs text-slate-500">For emergencies, call a vet straight away from the Experts tab. Advice here is general guidance, not a diagnosis.</p>
          </form>
          <div className="flex flex-wrap gap-2">
            {['All', ...CATS].map(c => <button key={c} onClick={() => setCatF(c)} className={'px-3 py-1.5 rounded-xl border text-sm font-semibold ' + (catF === c ? 'bg-emerald-500 border-emerald-500' : 'bg-white')}>{c}</button>)}
          </div>
          {shownQ.length === 0 && <div className="bg-white border rounded-2xl p-10 text-center text-slate-500">No questions yet. Be the first to ask.</div>}
          {shownQ.map(q => {
            const a = byQ[q.id] || [];
            return (
              <div key={q.id} className="bg-white border rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <b className="text-lg leading-tight">{q.title}</b>
                  <span className="text-xs h-fit px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">{q.category}</span>
                </div>
                {q.body && <p className="text-slate-700 mt-2 whitespace-pre-wrap">{q.body}</p>}
                <div className="text-xs text-slate-500 mt-2">Asked by <b className="text-slate-700">{q.author_name}</b>{q.location ? ' · ' + q.location : ''} · {ago(q.created_at)}</div>
                <div className="flex gap-3 mt-3 text-sm">
                  <button className="font-semibold text-emerald-700" onClick={() => setOpen(open === q.id ? '' : q.id)}>{open === q.id ? 'Hide' : a.length ? 'View ' + a.length + (a.length === 1 ? ' answer' : ' answers') : 'Answer this'}</button>
                  {(q.user_id === userId || isAdmin) && <button className="text-rose-600 flex items-center gap-1" onClick={() => { if (confirm('Delete this question and its answers?')) run(() => community.remove('questions', q.id)); }}><Trash2 size={14} />Delete</button>}
                </div>
                {open === q.id && (
                  <div className="mt-3 border-t pt-3 space-y-3">
                    {a.map(x => (
                      <div key={x.id} className="bg-stone-50 rounded-xl p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <b className="text-slate-800 text-sm">{x.author_name}</b>
                          {x.is_admin && <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-semibold">Admin</span>}
                          {x.is_expert && <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">Expert</span>}
                          <span>{ago(x.created_at)}</span>
                          {(x.user_id === userId || isAdmin) && <button className="ml-auto text-rose-600" aria-label="Delete answer" onClick={() => { if (confirm('Delete this answer?')) run(() => community.remove('answers', x.id)); }}><Trash2 size={14} /></button>}
                        </div>
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">{x.body}</p>
                      </div>
                    ))}
                    <form onSubmit={e => { e.preventDefault(); run(async () => { await community.answer(q.id, reply[q.id] || ''); setReply({ ...reply, [q.id]: '' }); }); }} className="flex gap-2">
                      <input className={inp + ' mt-0'} value={reply[q.id] || ''} onChange={e => setReply({ ...reply, [q.id]: e.target.value })} placeholder="Write your answer" />
                      <button disabled={busy} className="bg-emerald-600 text-white rounded-xl px-4 font-bold disabled:opacity-60">Reply</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'experts' && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl p-5">
              <div className="flex items-center gap-2 font-bold"><Stethoscope size={18} />Get listed</div>
              <p className="text-sm text-slate-600 mt-2">Vets, agronomists and other advisors can apply to be listed. Once an admin approves your profile, farmers near you can find and contact you.</p>
              {mine && <div className={'mt-3 rounded-xl p-3 text-sm ' + (mine.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : mine.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>Your listing: <b>{mine.status === 'pending' ? 'waiting for approval' : mine.status}</b></div>}
              <button onClick={() => openExpert(mine)} className="mt-3 w-full bg-slate-950 text-white rounded-xl py-2.5 font-bold">{mine ? 'Edit my listing' : 'Apply to be listed'}</button>
              {mine && <button onClick={() => { if (confirm('Remove your listing?')) run(() => community.removeExpert(mine.id), 'Your listing was removed.'); }} className="mt-2 w-full text-sm text-rose-600 font-semibold">Remove my listing</button>}
            </div>
            <div className="bg-white border rounded-2xl p-5 text-sm text-slate-600"><b className="text-slate-900">Farmer safety</b><p className="mt-2">Contact specialists directly, but still check identity, qualifications and availability before acting on time-sensitive health advice.</p></div>
          </div>
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><b className="text-lg">Experts directory</b><div className="text-sm text-slate-500">{list.length} {pendingView ? 'awaiting approval' : 'specialists available'}</div></div>
                <div className="flex gap-2">
                  <button onClick={() => locate((lat, lng) => { setMe({ lat, lng }); setMsg('Sorted by distance from your location.'); })} className="flex gap-1 items-center border rounded-xl px-3 py-2 text-sm font-semibold"><LocateFixed size={15} />Nearest to me</button>
                  {isAdmin && <button onClick={() => setPendingView(!pendingView)} className={'border rounded-xl px-3 py-2 text-sm font-semibold ' + (pendingView ? 'bg-emerald-500 border-emerald-500' : '')}>Approvals ({pending.length})</button>}
                </div>
              </div>
              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <label className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input className="w-full border rounded-xl pl-9 pr-3 py-2" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, location…" /></label>
                <select className="border rounded-xl px-3 py-2 bg-white" value={profF} onChange={e => setProfF(e.target.value)}><option>All</option>{PROFS.map(p => <option key={p}>{p}</option>)}</select>
              </div>
            </div>
            <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-4">
              {list.length === 0 && <div className="sm:col-span-2 text-center text-slate-500 py-8">No specialists listed here yet.</div>}
              {list.map(x => (
                <div key={x.id} className="border rounded-2xl p-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 font-bold grid place-items-center shrink-0">{initials(x.name)}</div>
                    <div className="min-w-0">
                      <div className="font-bold leading-tight">{x.name}</div>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 font-semibold">{x.profession}</span>
                      <div className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin size={13} />{x.location}{x.dist != null ? ' · ' + (x.dist < 10 ? x.dist.toFixed(1) : Math.round(x.dist)) + ' km away' : ''}</div>
                    </div>
                  </div>
                  {x.bio && <p className="text-sm text-slate-600 mt-3">{x.bio}</p>}
                  {x.status === 'approved' ? (
                    <div className="flex flex-wrap gap-3 mt-3 text-sm font-semibold">
                      <a className="flex gap-1 items-center" href={'tel:+' + intl(x.phone)}><Phone size={15} />Call</a>
                      <a className="flex gap-1 items-center text-emerald-700" target="_blank" rel="noreferrer" href={'https://wa.me/' + intl(x.phone) + '?text=' + encodeURIComponent('Hello ' + x.name + ', I found you on Mkulima and need advice.')}><MessageCircle size={15} />WhatsApp</a>
                      {x.email && <a className="flex gap-1 items-center" href={'mailto:' + x.email}><Mail size={15} />Email</a>}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-600">{x.phone}{x.email ? ' · ' + x.email : ''}</div>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 mt-3">
                      {x.status !== 'approved' && <button onClick={() => run(() => community.setExpertStatus(x.id, 'approved'))} className="flex gap-1 items-center bg-emerald-500 rounded-xl px-3 py-1.5 text-sm font-bold"><Check size={14} />Approve</button>}
                      {x.status !== 'rejected' && <button onClick={() => run(() => community.setExpertStatus(x.id, 'rejected'))} className="border border-rose-300 text-rose-700 rounded-xl px-3 py-1.5 text-sm font-bold">{x.status === 'approved' ? 'Unlist' : 'Reject'}</button>}
                      <button onClick={() => { if (confirm('Delete this profile?')) run(() => community.removeExpert(x.id)); }} className="text-rose-600 p-1.5" aria-label="Delete"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showE && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-auto p-5">
            <div className="flex justify-between mb-3"><b className="text-xl">{editId ? 'Edit your listing' : 'Apply to be listed'}</b><button onClick={() => setShowE(false)} aria-label="Close"><X /></button></div>
            {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>}
            <form onSubmit={e => { e.preventDefault(); run(async () => { await community.saveExpert(ef, editId || undefined); setShowE(false); }, 'Submitted. An admin will review your profile before it appears in the directory.'); }} className="grid sm:grid-cols-2 gap-3 text-sm font-semibold">
              <label className="sm:col-span-2">Full name<input className={inp} required value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} placeholder="e.g. Dr Jane Wanjiku" /></label>
              <label>Profession<select className={inp} value={ef.profession} onChange={e => setEf({ ...ef, profession: e.target.value })}>{PROFS.map(p => <option key={p}>{p}</option>)}</select></label>
              <label>Town / county<input className={inp} required value={ef.location} onChange={e => setEf({ ...ef, location: e.target.value })} placeholder="e.g. Nakuru, Kenya" /></label>
              <label>Phone / WhatsApp<input className={inp} required value={ef.phone} onChange={e => setEf({ ...ef, phone: e.target.value })} placeholder="07XX XXX XXX" /></label>
              <label>Email (optional)<input className={inp} type="email" value={ef.email} onChange={e => setEf({ ...ef, email: e.target.value })} /></label>
              <label className="sm:col-span-2">About your services<textarea className={inp} rows={3} value={ef.bio} onChange={e => setEf({ ...ef, bio: e.target.value })} placeholder="Qualifications, animals you treat, areas you cover, call-out times" /></label>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => locate((lat, lng) => { setEf({ ...ef, latitude: lat, longitude: lng }); setErr(''); })} className="flex gap-1 items-center border rounded-xl px-3 py-2 font-semibold"><LocateFixed size={15} />Use my current location</button>
                <span className="font-normal text-slate-500">{ef.latitude != null ? 'Location saved. Farmers can sort by distance to you.' : 'Optional. Lets farmers sort by who is nearest.'}</span>
              </div>
              <button disabled={busy} className="sm:col-span-2 rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{busy ? 'Submitting…' : 'Submit for approval'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
