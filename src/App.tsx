import { Fragment, useEffect, useState } from 'react';
import { api, auth } from './lib/backend';
import Marketplace from './Marketplace';
import Community from './Community';
import {
  Home,
  PawPrint,
  Scale,
  ShieldCheck,
  Activity,
  CircleDollarSign,
  Info,
  Plus,
  Menu,
  X,
  Trash2,
  Edit3,
  Download,
  LogOut,
  Users,
  Milk,
  Store,
  UserPlus,
  Database,
  Wheat,
  FileBarChart,
  MoreVertical,
  MessagesSquare,
  Bird,
  Egg,
  ShoppingBag,
} from 'lucide-react';

type Animal = {
  id: string;
  tag: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  dob: string;
  source: string;
  status: string;
  notes: string;
  matingDate?: string;
  expectedDueDate?: string;
  origin?: string;
  purchasePrice?: string;
};
type RecordItem = { id: string; [key: string]: any };
type PoultryBatch = { id: string; batch: string; birdType: string; breed: string; hatchDate: string; initialBirds: string; currentBirds: string; purpose: string; source: string; notes: string };
const blankPoultry: PoultryBatch = { id: '', batch: '', birdType: 'Chicken', breed: '', hatchDate: '', initialBirds: '', currentBirds: '', purpose: 'Meat', source: '', notes: '' };

const blankAnimal: Animal = {
  id: '',
  tag: '',
  name: '',
  species: 'Goat',
  breed: '',
  sex: 'Doe',
  dob: '',
  source: '',
  status: 'Active',
  notes: '',
  matingDate: '',
  expectedDueDate: '',
  origin: 'Farm Born',
  purchasePrice: '',
};

function money(n: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);
}
function dateText(s: string) {
  return s
    ? new Date(s + 'T00:00:00').toLocaleDateString('en-KE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}

export default function App() {
  const [page, setPage] = useState('Dashboard'),
    [authUser, setAuthUser] = useState<any>(null),
    [authChecked, setAuthChecked] = useState(false),
    [authBusy, setAuthBusy] = useState(false),
    [authEmail, setAuthEmail] = useState(() => { try { return localStorage.getItem('mkulima_email') || ''; } catch { return ''; } }),
    [rememberEmail, setRememberEmail] = useState(true),
    [authMode, setAuthMode] = useState<'signin' | 'forgot'>('signin'),
    [authInfo, setAuthInfo] = useState(''),
    [recovering, setRecovering] = useState(auth.isRecovery),
    [newPass, setNewPass] = useState(''),
    [authPass, setAuthPass] = useState(''),
    [adminOverview, setAdminOverview] = useState<any>(null),
    [adminUsers, setAdminUsers] = useState<any[]>([]),
    [adminActivity, setAdminActivity] = useState<any[]>([]),
    [animals, setAnimals] = useState<Animal[]>([]),
    [weights, setWeights] = useState<RecordItem[]>([]),
    [health, setHealth] = useState<RecordItem[]>([]),
    [events, setEvents] = useState<RecordItem[]>([]),
    [finance, setFinance] = useState<RecordItem[]>([]),
    [poultry, setPoultry] = useState<PoultryBatch[]>([]),
    [production, setProduction] = useState<RecordItem[]>([]),
    [feed, setFeed] = useState<RecordItem[]>([]),
    [modal, setModal] = useState(''),
    [animal, setAnimal] = useState<Animal>(blankAnimal),
    [form, setForm] = useState<any>({}),
    [error, setError] = useState(auth.linkError),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState('');
  async function load() {
    try {
      const [a, p, w, h, e, f, pr, fd] = await Promise.all([
        api.get('/api/animals'),
        api.get('/api/poultry'),
        api.get('/api/weights'),
        api.get('/api/health'),
        api.get('/api/events'),
        api.get('/api/finance'),
        api.get('/api/production'),
        api.get('/api/feed'),
      ]);
      setAnimals(a.data.items || []);
      setPoultry(p.data.items || []);
      setWeights(w.data.items || []);
      setHealth(h.data.items || []);
      setEvents(e.data.items || []);
      setFinance(f.data.items || []);
      setProduction(pr.data.items || []);
      setFeed(fd.data.items || []);
    } catch (e) {
      setError('Could not load farm records.');
    }
  }
  useEffect(() => {
    let live = true;
    auth.getUser().then(async user => {
      if (!live) return;
      if (user) {
        try {
          const profile = await api.get('/api/me');
          if (!live) return;
          setAuthUser({ ...user, ...profile.data.user });
          await load();
        } catch {
          setError('Your session could not be verified. Please sign in again.');
          await auth.signOut();
        }
      }
      if (live) setAuthChecked(true);
    }).catch(() => { if (live) setAuthChecked(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (page === 'Admin' && authUser?.role === 'admin') {
      Promise.all([api.get('/api/admin/overview'), api.get('/api/admin/users'), api.get('/api/admin/activity')])
        .then(([overview, users, activity]) => {
          setAdminOverview(overview.data);
          setAdminUsers(users.data.items || []);
          setAdminActivity(activity.data.items || []);
        }).catch((e: any) => setError('Could not load administrator activity.' + (String(e?.message || '').startsWith('Admin:') ? ' ' + e.message : '')));
    }
  }, [page, authUser]);
  useEffect(() => auth.onPasswordRecovery(() => setRecovering(true)), []);
  async function sendReset() {
    setAuthBusy(true); setError(''); setAuthInfo('');
    try {
      await auth.resetPassword(authEmail.trim());
      setAuthInfo('If that email has an account, a reset link is on its way. Check your inbox and spam folder.');
    } catch (e: any) {
      setError(e?.message || 'Could not send the reset email. Try again in a minute.');
    } finally { setAuthBusy(false); }
  }
  async function savePassword(e: any) {
    e.preventDefault(); setError('');
    if (newPass.length < 6) { setError('Use at least 6 characters.'); return; }
    setAuthBusy(true);
    try {
      await auth.updatePassword(newPass);
      history.replaceState(null, '', window.location.pathname);
      const user = await auth.getUser();
      const profile = await api.get('/api/me');
      setAuthUser({ ...user, ...profile.data.user });
      await load();
      setNewPass(''); setRecovering(false);
    } catch (e: any) {
      setError(e?.message || 'Could not update the password. The link may have expired, so request a new one.');
    } finally { setAuthBusy(false); setAuthChecked(true); }
  }
  async function signIn(mode: 'signin' | 'signup') {
    setAuthBusy(true); setError('');
    try {
      await auth.signIn({ email: authEmail.trim(), password: authPass, mode });
      try { if (rememberEmail) localStorage.setItem('mkulima_email', authEmail.trim()); else localStorage.removeItem('mkulima_email'); } catch { /* ignore */ }
      const user = await auth.getUser();
      const profile = await api.get('/api/me');
      setAuthUser({ ...user, ...profile.data.user });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Sign-in could not be completed. Please try again.');
    } finally { setAuthBusy(false); setAuthChecked(true); }
  }
  async function signOut() {
    await auth.signOut(); setAuthUser(null); setAnimals([]); setPoultry([]); setWeights([]); setHealth([]); setEvents([]); setFinance([]); setProduction([]); setFeed([]); setPage('Dashboard');
  }
  async function saveAnimal(e: any) {
    e.preventDefault();
    if (!animal.tag || !animal.breed) {
      setError('Tag and breed are required.');
      return;
    }
    if (animal.origin === 'Farm Born' && !animal.dob) {
      setError('Date of birth is required for animals born at the farm.');
      return;
    }
    if (animal.origin === 'Purchased' && (!animal.purchasePrice || Number(animal.purchasePrice) <= 0)) {
      setError('Enter the purchase amount for a purchased animal.');
      return;
    }
    try {
      if (animal.id) {
        await api.put('/api/animals/' + animal.id, animal);
      } else {
        await api.post('/api/animals', animal);
        if (animal.origin === 'Purchased' && Number(animal.purchasePrice) > 0) {
          await api.post('/api/finance', {
            date: new Date().toISOString().slice(0, 10),
            type: 'expense',
            category: 'Animals',
            description: 'Purchase of ' + (animal.name || animal.tag) + ' (' + animal.species + ')',
            amount: Number(animal.purchasePrice),
            animalTag: animal.tag,
          });
        }
      }
      setModal('');
      setAnimal(blankAnimal);
      await load();
    } catch (e) {
      setError('Could not save animal.');
    }
  }
  async function save(path: string, e: any) {
    e.preventDefault();
    try {
      if (form.id) await api.put(path + '/' + form.id, form);
      else {
        await api.post(path, form);
        if (path === '/api/feed' && Number(form.cost) > 0)
          await api.post('/api/finance', { date: form.date, type: 'expense', category: 'Feed', description: 'Feed: ' + form.feedType + ' (' + form.quantity + ' kg)', amount: Number(form.cost) });
      }
      setModal('');
      setForm({});
      await load();
    } catch (e) {
      setError('Could not save record.');
    }
  }
  async function del(path: string, id: string) {
    if (!confirm('Delete this record?')) return;
    try { await api.delete(path + id); await load(); } catch { setError('Could not delete record.'); }
  }
  async function remove(id: string) {
    if (!confirm('Delete this animal record?')) return;
    await api.delete('/api/animals/' + id);
    await load();
  }
  const month = new Date().toISOString().slice(0, 7);
  const active = animals.filter(a => a.status === 'Active').length,
    dead = animals.filter(a => a.status === 'Dead').length;
  const income = finance
      .filter(x => x.type === 'income')
      .reduce((s, x) => s + Number(x.amount || 0), 0),
    expense = finance
      .filter(x => x.type === 'expense')
      .reduce((s, x) => s + Number(x.amount || 0), 0);
  const due = health.filter(
    x =>
      x.nextDue &&
      x.nextDue <=
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  ).length;
  const nav = [
    ['Dashboard', Home],
    ['Livestock', PawPrint],
    ['Poultry', Activity],
    ['Health', ShieldCheck],
    ['Events', Activity],
    ['Finances', CircleDollarSign],
    ['Production', Milk],
    ['Feed', Wheat],
    ['Marketplace', Store],
    ['Community', MessagesSquare],
    ['Reports', FileBarChart],
    ['About', Info],
    ...(authUser?.role === 'admin' ? [['Admin', Users] as any] : []),
  ];
  const filtered = animals.filter(a =>
    (a.tag + ' ' + a.name + ' ' + a.breed + ' ' + a.species)
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  function csv() {
    const rows = [
      ['Tag', 'Name', 'Species', 'Breed', 'Sex', 'DOB', 'Status'],
      ...animals.map(a => [
        a.tag,
        a.name,
        a.species,
        a.breed,
        a.sex,
        a.dob,
        a.status,
      ]),
    ];
    const text = rows
      .map(r =>
        r
          .map(v => String(v || '').replaceAll('"', '""'))
          .map(v => '"' + v + '"')
          .join(',')
      )
      .join('\n');
    const u = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = u;
    a.download = 'farm-animals.csv';
    a.click();
    URL.revokeObjectURL(u);
  }
  if (recovering) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-sm p-5 sm:p-8 text-center">
        <img src="/resources/mkulima-logo.png" alt="Mkulima Farm Manager" className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto mb-4" />
        <h1 className="text-2xl font-black text-emerald-900">Set a new password</h1>
        <p className="text-slate-500 mt-2 mb-6">Choose a new password for your account.</p>
        {error && <div className="text-left bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4">{error}</div>}
        <form onSubmit={savePassword} className="text-left space-y-3">
          <input type="password" name="password" required minLength={6} placeholder="New password (6+ characters)" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full border rounded-xl px-3 py-3" autoComplete="new-password" />
          <button disabled={authBusy} className="w-full rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{authBusy ? 'Saving…' : 'Save new password'}</button>
        </form>
      </div>
    </div>
  );
  if (!authChecked) return <div className="min-h-screen grid place-items-center bg-stone-50"><div className="text-center text-slate-500">Checking your session…</div></div>;
  if (!authUser) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-sm p-5 sm:p-8 text-center">
        <img src="/resources/mkulima-logo.png" alt="Mkulima Farm Manager" className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto mb-4" />
        <h1 className="text-2xl font-black text-emerald-900">Mkulima Farm Manager</h1>
        <p className="text-slate-500 mt-2 mb-6">Sign in or create an account to manage your farm records securely.</p>
        {error && <div className="text-left bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4">{error}</div>}
        {authInfo && <div className="text-left bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 mb-4">{authInfo}</div>}
        {authMode === 'signin' ? (
          <form onSubmit={e => { e.preventDefault(); signIn('signin'); }} className="text-left space-y-3">
            <input type="email" name="email" required placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full border rounded-xl px-3 py-3" autoComplete="username" />
            <input type="password" name="password" required minLength={6} placeholder="Password (6+ characters)" value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full border rounded-xl px-3 py-3" autoComplete="current-password" />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={rememberEmail} onChange={e => setRememberEmail(e.target.checked)} />Remember my email</label>
              <button type="button" className="text-emerald-700 font-semibold" onClick={() => { setAuthMode('forgot'); setError(''); setAuthInfo(''); }}>Forgot password?</button>
            </div>
            <button disabled={authBusy} className="w-full rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{authBusy ? 'Please wait…' : 'Sign in'}</button>
            <button type="button" disabled={authBusy} onClick={() => signIn('signup')} className="w-full rounded-xl border border-emerald-700 text-emerald-800 font-bold py-3 disabled:opacity-60">Create account</button>
          </form>
        ) : (
          <form onSubmit={e => { e.preventDefault(); sendReset(); }} className="text-left space-y-3">
            <p className="text-sm text-slate-600">Enter your email and we will send you a link to choose a new password.</p>
            <input type="email" name="email" required placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full border rounded-xl px-3 py-3" autoComplete="username" />
            <button disabled={authBusy} className="w-full rounded-xl bg-emerald-700 text-white font-bold py-3 disabled:opacity-60">{authBusy ? 'Sending…' : 'Send reset link'}</button>
            <button type="button" className="w-full text-emerald-700 font-semibold py-2" onClick={() => { setAuthMode('signin'); setError(''); setAuthInfo(''); }}>Back to sign in</button>
          </form>
        )}
        <p className="text-xs text-slate-500 mt-4">Your farm records are private to your account.</p>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <aside
        className={
          (mobile ? 'translate-x-0 ' : '-translate-x-full ') +
          'fixed md:translate-x-0 z-40 w-64 max-w-[80vw] inset-y-0 bg-slate-950 text-white p-5 transition-transform overflow-y-auto'
        }
      >
        <div className="flex justify-between mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/resources/mkulima-logo.png" alt="Mkulima Farm Manager" className="w-16 h-16 rounded-xl object-contain bg-white shrink-0" />
            <div className="min-w-0"><b className="text-lg leading-tight text-emerald-400">Mkulima</b><div className="text-xs text-slate-400">Farm Manager</div></div>
          </div>
          <button className="md:hidden" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        {nav.map(([n, I]) => (
          <button
            key={n}
            onClick={() => {
              setPage(n);
              setMobile(false);
            }}
            className={
              'w-full flex gap-3 items-center px-3 py-3 rounded-xl mb-1 ' +
              (page === n
                ? 'bg-emerald-400 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800')
            }
          >
            <I size={18} />
            {n}
          </button>
        ))}
      </aside>
      {mobile && <div className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobile(false)} />}
      <main className="md:ml-64">
        <header style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }} className="sticky top-0 z-30 bg-stone-50/95 backdrop-blur border-b px-3 pb-3 sm:px-4 sm:pb-4 flex items-center gap-2 sm:gap-3">
          <button className="md:hidden p-1" aria-label="Open menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <img src="/resources/mkulima-logo.png" alt="Mkulima farm animals logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg bg-white border border-stone-200 p-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-700 font-semibold">Mkulima Farm Manager</div>
            <h1 className="font-black text-xl truncate">{page}</h1>
          </div>
          <div className="hidden lg:block text-right mr-2"><div className="text-xs text-slate-500">Signed in as</div><div className="text-sm font-semibold max-w-52 truncate">{authUser.name || authUser.email}</div></div>
          <button onClick={signOut} className="flex gap-2 bg-white border px-3 py-2.5 rounded-xl" title="Sign out"><LogOut size={17} /><span className="hidden sm:inline">Sign out</span></button>
          <button
            onClick={csv}
            className="hidden sm:flex gap-2 bg-white border px-3 py-2 rounded-xl"
          >
            <Download size={17} />
            Export
          </button>
          {page !== 'Poultry' && <button
            onClick={() => {
              setAnimal(blankAnimal);
              setModal('animal');
            }}
            className="flex gap-2 bg-emerald-500 px-3 sm:px-4 py-2.5 rounded-xl font-bold shrink-0" aria-label="Add"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Animal</span>
          </button>}
          {page === 'Poultry' && <button
            onClick={() => { setForm({ ...blankPoultry }); setModal('poultry'); }}
            className="flex gap-2 bg-emerald-500 px-3 sm:px-4 py-2.5 rounded-xl font-bold shrink-0" aria-label="Add"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Poultry batch</span>
          </button>}
        </header>
        <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl mb-5">
              {error}
              <button className="ml-3 font-bold" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
          {page === 'Production' && (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <Card label="Milk this month" value={sumQty(production, 'Milk', month) + ' L'} />
                <Card label="Eggs this month" value={String(sumQty(production, 'Eggs', month))} />
                <Card label="Records" value={String(production.length)} />
              </div>
              <Table
                title="Milk & egg production"
                button="Record production"
                click={() => { setForm({ date: new Date().toISOString().slice(0, 10), type: 'Milk' }); setModal('production'); }}
                onEdit={(i: number) => { setForm(production[i]); setModal('production'); }}
                onDelete={(i: number) => del('/api/production/', production[i].id)}
                heads={['Date', 'Type', 'Source', 'Quantity', 'Notes']}
                rows={production.map(x => [
                  dateText(x.date),
                  x.type,
                  x.type === 'Milk' ? animals.find(a => a.id === x.animalId)?.tag || '—' : x.batch || '—',
                  x.quantity + (x.type === 'Milk' ? ' L' : ' eggs'),
                  x.notes || '—',
                ])}
              />
            </>
          )}
          {page === 'Feed' && (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <Card label="Feed this month" value={sumQty(feed, '', month) + ' kg'} />
                <Card label="Feed cost this month" value={money(feed.filter(x => String(x.date).startsWith(month)).reduce((s, x) => s + Number(x.cost || 0), 0))} />
                <Card label="Records" value={String(feed.length)} />
              </div>
              <Table
                title="Feed records"
                button="Record feed"
                click={() => { setForm({ date: new Date().toISOString().slice(0, 10), group: 'Livestock' }); setModal('feed'); }}
                onEdit={(i: number) => { setForm(feed[i]); setModal('feed'); }}
                onDelete={(i: number) => del('/api/feed/', feed[i].id)}
                heads={['Date', 'Feed', 'For', 'Quantity', 'Cost', 'Notes']}
                rows={feed.map(x => [
                  dateText(x.date),
                  x.feedType,
                  x.group || '—',
                  x.quantity + ' kg',
                  x.cost ? money(Number(x.cost)) : '—',
                  x.notes || '—',
                ])}
              />
            </>
          )}
          {page === 'Reports' && (
            <Reports data={{ Livestock: animals, Poultry: poultry, Weights: weights, Health: health, Events: events, Finances: finance, Production: production, Feed: feed }} />
          )}
          {page === 'Marketplace' && <Marketplace isAdmin={authUser?.role === 'admin'} userId={authUser?.userId} />}
          {page === 'Community' && <Community isAdmin={authUser?.role === 'admin'} userId={authUser?.userId} />}
          {page === 'About' && <About />}
          {page === 'Admin' && authUser.role === 'admin' && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-black">Platform administration</h2><p className="text-slate-500">Monitor account growth and recent activity across Mkulima. Farm record contents remain private to each farmer.</p></div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Users" value={String(adminOverview?.users ?? '—')} />
                <StatCard icon={UserPlus} label="New this month" value={String(adminOverview?.signupsByMonth?.slice(-1)[0]?.count ?? '—')} />
                <StatCard icon={Activity} label="Active today" value={String(adminOverview?.activeToday ?? '—')} />
                <StatCard icon={Database} label="Farm records (total)" value={String(adminOverview?.totalRecords ?? '—')} />
              </div>
              <div className="bg-white border rounded-2xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-bold text-lg">Registered accounts</h3><p className="text-sm text-slate-500">Most recently active accounts (up to 100).</p></div><div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-stone-50"><tr>{['Name','Email','Role','Joined','Last active'].map(h => <th key={h} className="text-left p-3 text-slate-500">{h}</th>)}</tr></thead><tbody>{adminUsers.map((u,i) => <tr key={u.email + i} className="border-t"><td className="p-3">{u.name || '—'}</td><td className="p-3">{u.email || '—'}</td><td className="p-3"><span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-1">{u.role}</span></td><td className="p-3">{u.firstSeen ? new Date(u.firstSeen).toLocaleString() : '—'}</td><td className="p-3">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '—'}</td></tr>)}</tbody></table>{!adminUsers.length && <div className="p-6 text-slate-500">No registered accounts recorded yet.</div>}</div></div>
              <AdminMonthly o={adminOverview} />
              <AdminCharts o={adminOverview} />
              <div className="grid xl:grid-cols-3 gap-4">{Object.entries(adminOverview?.recordCounts || {}).map(([name,count]) => <div key={name} className="bg-white border rounded-xl p-4"><div className="text-xs uppercase text-slate-500">{name}</div><div className="text-2xl font-black mt-1">{String(count)}</div></div>)}</div>
              <div className="bg-white border rounded-2xl overflow-hidden"><div className="p-5 border-b"><h3 className="font-bold text-lg">Recent activity</h3><p className="text-sm text-slate-500">Sign-ins and record changes across the platform.</p></div><div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-stone-50"><tr>{['Time','User','Action','Section','Details'].map(h => <th key={h} className="text-left p-3 text-slate-500">{h}</th>)}</tr></thead><tbody>{adminActivity.map((a,i) => <tr key={a.timestamp + i} className="border-t"><td className="p-3 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</td><td className="p-3">{a.name || a.email || '—'}</td><td className="p-3">{a.action}</td><td className="p-3">{a.section}</td><td className="p-3">{a.details || '—'}</td></tr>)}</tbody></table>{!adminActivity.length && <div className="p-6 text-slate-500">Activity will appear as users sign in and manage records.</div>}</div></div>
            </div>
          )}
          {page === 'Dashboard' && (
            <Dashboard
              active={active}
              dead={dead}
              due={due}
              expense={expense}
              income={income}
              animals={animals}
              poultry={poultry}
              production={production}
              finance={finance}
              health={health}
              name={(() => { const n = String(authUser?.name || String(authUser?.email || '').split('@')[0] || ''); return n.charAt(0).toUpperCase() + n.slice(1); })()}
              onRename={async (n: string) => { await auth.updateName(n); setAuthUser({ ...authUser, name: n }); }}
              setPage={setPage}
            />
          )}
          {page === 'Livestock' && (
            <Animals
              title="Livestock"
              animals={filtered.filter(a => !['Chicken', 'Other Poultry'].includes(a.species))}
              search={search}
              setSearch={setSearch}
              edit={a => {
                setAnimal(a);
                setModal('animal');
              }}
              remove={remove}
              health={health}
              add={(o?: string) => { setAnimal(o ? { ...blankAnimal, origin: o } : blankAnimal); setModal('animal'); }}
              bulkHealth={() => { setForm({ date: new Date().toISOString().slice(0, 10), animalId: 'ALL', type: 'Vaccination', animalCount: animals.filter(x => x.status === 'Active').length }); setModal('health'); }}
              weights={weights}
              editWeight={(w: any) => { setForm(w); setModal('weight'); }}
              deleteWeight={(id: string) => del('/api/weights/', id)}
              weight={id => {
                setForm({
                  animalId: id,
                  date: new Date().toISOString().slice(0, 10),
                });
                setModal('weight');
              }}
            />
          )}
          {page === 'Poultry' && (
            <PoultryRegister
              batches={poultry.filter(x => (x.batch + ' ' + x.birdType + ' ' + x.breed).toLowerCase().includes(search.toLowerCase()))}
              search={search}
              setSearch={setSearch}
              add={() => { setForm({ ...blankPoultry }); setModal('poultry'); }}
              edit={x => { setForm({ ...x }); setModal('poultry'); }}
              remove={async id => { if (!confirm('Delete this poultry batch?')) return; await api.delete('/api/poultry/' + id); await load(); }}
            />
          )}
          {false && (
            <Animals
              title="Poultry register"
              animals={filtered.filter(a => ['Chicken', 'Other Poultry'].includes(a.species))}
              search={search}
              setSearch={setSearch}
              edit={a => { setAnimal(a); setModal('animal'); }}
              remove={remove}
              health={health}
              add={() => { setAnimal(blankAnimal); setModal('animal'); }}
              bulkHealth={() => { setForm({ date: new Date().toISOString().slice(0, 10), animalId: 'ALL', type: 'Vaccination', animalCount: animals.filter(x => x.status === 'Active').length }); setModal('health'); }}
              weights={weights}
              editWeight={(w: any) => { setForm(w); setModal('weight'); }}
              deleteWeight={(id: string) => del('/api/weights/', id)}
              weight={id => { setForm({ animalId: id, date: new Date().toISOString().slice(0, 10) }); setModal('weight'); }}
            />
          )}
          {page === 'Weights' && (
            <Table
              title="Weight history"
              button="Record weight"
              click={() => {
                setForm({ date: new Date().toISOString().slice(0, 10) });
                setModal('weight');
              }}
              onEdit={(i: number) => { setForm(weights[i]); setModal('weight'); }}
              onDelete={(i: number) => del('/api/weights/', weights[i].id)}
              heads={['Date', 'Animal', 'Weight', 'Notes']}
              rows={weights.map(x => [
                dateText(x.date),
                animals.find(a => a.id === x.animalId)?.tag || '—',
                (x.weight || '') + ' kg',
                x.notes || '—',
              ])}
            />
          )}
          {page === 'Health' && (
            <Table
              title="Health & vaccination"
              button="Add health record"
              onEdit={(i: number) => { setForm(health[i]); setModal('health'); }}
              onDelete={(i: number) => del('/api/health/', health[i].id)}
              click={() => {
                setForm({
                  date: new Date().toISOString().slice(0, 10),
                  type: 'Vaccination',
                });
                setModal('health');
              }}
              heads={[
                'Date',
                'Animal',
                'Type',
                'Vaccine / treatment',
                'Next due',
                'Provider',
              ]}
              rows={health.map(x => [
                dateText(x.date),
                x.animalId === 'ALL' ? 'All animals' + (x.animalCount ? ' (' + x.animalCount + ')' : '') : animals.find(a => a.id === x.animalId)?.tag || '—',
                x.type,
                x.vaccine || '—',
                dateText(x.nextDue),
                x.provider || '—',
              ])}
            />
          )}
          {page === 'Events' && (
            <Table
              title="Breeding & farm events"
              button="Add event"
              click={() => {
                setForm({
                  date: new Date().toISOString().slice(0, 10),
                  type: 'Breeding',
                });
                setModal('event');
              }}
              onEdit={(i: number) => { setForm(events[i]); setModal('event'); }}
              onDelete={(i: number) => del('/api/events/', events[i].id)}
              heads={['Date', 'Animal', 'Event', 'Details', 'Outcome']}
              rows={events.map(x => [
                dateText(x.date),
                animals.find(a => a.id === x.animalId)?.tag || '—',
                x.type,
                x.details || '—',
                x.outcome || '—',
              ])}
            />
          )}
          {page === 'Finances' && (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <Card label="Income" value={money(income)} />
                <Card label="Expenses" value={money(expense)} />
                <Card label="Net" value={money(income - expense)} />
              </div>
              <Table
                title="Farm financial ledger"
                button="Add transaction"
                click={() => {
                  setForm({
                    date: new Date().toISOString().slice(0, 10),
                    type: 'expense',
                    category: 'Feed',
                  });
                  setModal('finance');
                }}
                onEdit={(i: number) => { setForm(finance[i]); setModal('finance'); }}
                onDelete={(i: number) => del('/api/finance/', finance[i].id)}
                heads={['Date', 'Type', 'Category', 'Description', 'Amount']}
                rows={finance.map(x => [
                  dateText(x.date),
                  x.type,
                  x.category,
                  x.description,
                  x.type === 'income'
                    ? '+ ' + money(x.amount)
                    : '- ' + money(x.amount),
                ])}
              />
            </>
          )}
        </div>
      </main>
      {modal && (
        <Modal
          title={
            modal === 'animal'
              ? animal.id
                ? 'Edit animal'
                : 'Register animal'
              : modal === 'poultry'
                ? form.id ? 'Edit poultry batch' : 'Add poultry batch'
              : modal === 'production'
                ? (form.id ? 'Edit production record' : 'Record production')
              : modal === 'feed'
                ? (form.id ? 'Edit feed record' : 'Record feed')
              : modal === 'weight'
                ? (form.id ? 'Edit weight' : 'Record weight')
                : modal === 'health'
                  ? (form.id ? 'Edit health record' : 'Health / vaccination record')
                  : modal === 'event'
                    ? (form.id ? 'Edit event' : 'Breeding / farm event')
                    : (form.id ? 'Edit financial record' : 'Financial record')
          }
          close={() => setModal('')}
        >
          {modal === 'animal' && (
            <form onSubmit={saveAnimal} className="grid md:grid-cols-2 gap-4">
              <Field
                l="Tag / ID"
                v={animal.tag}
                c={v => setAnimal({ ...animal, tag: v })}
                req
              />
              <Field
                l="Name"
                v={animal.name}
                c={v => setAnimal({ ...animal, name: v })}
              />
              <Select
                l="Origin"
                v={animal.origin}
                opts={['Farm Born', 'Purchased']}
                c={v => setAnimal({ ...animal, origin: v })}
              />
              <Select
                l="Species"
                v={animal.species}
                opts={['Goat','Sheep','Cattle','Chicken','Other Poultry']}
                c={v => setAnimal({ ...animal, species: v })}
              />
              <Field
                l="Breed"
                v={animal.breed}
                c={v => setAnimal({ ...animal, breed: v })}
                req
              />
              <Select
                l="Sex"
                v={animal.sex}
                opts={[
                  'Doe',
                  'Buck',
                  'Ewe',
                  'Ram',
                  'Cow',
                  'Bull',
                  'Hen',
                  'Rooster',
                  'Female',
                  'Male',
                ]}
                c={v => setAnimal({ ...animal, sex: v })}
              />
              <Field
                l="Date of birth"
                type="date"
                v={animal.dob}
                c={v => setAnimal({ ...animal, dob: v })}
                req={animal.origin === 'Farm Born'}
              />
              {animal.origin === 'Purchased' && (
                <Field
                  l="Purchase amount (KSh)"
                  type="number"
                  v={animal.purchasePrice}
                  c={v => setAnimal({ ...animal, purchasePrice: v })}
                  req
                />
              )}
              <Field
                l="Source"
                v={animal.source}
                c={v => setAnimal({ ...animal, source: v })}
              />
              {['Doe','Ewe','Cow','Hen','Female'].includes(animal.sex) && (
                <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="font-bold text-amber-900 mb-3">Female breeding record</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field
                      l="Date of mating"
                      type="date"
                      v={animal.matingDate}
                      c={v => setAnimal({ ...animal, matingDate: v })}
                    />
                    <Field
                      l="Expected due date"
                      type="date"
                      v={animal.expectedDueDate}
                      c={v => setAnimal({ ...animal, expectedDueDate: v })}
                    />
                  </div>
                  <p className="text-xs text-amber-800 mt-3">Enter the expected due date based on the mating date and species/breed gestation period.</p>
                </div>
              )}
              <Select
                l="Status"
                v={animal.status}
                opts={['Active', 'Sold', 'Dead', 'Transferred', 'Retired']}
                c={v => setAnimal({ ...animal, status: v })}
              />
              <Field
                l="Notes"
                v={animal.notes}
                c={v => setAnimal({ ...animal, notes: v })}
              />
              <Submit />
            </form>
          )}
          {modal === 'poultry' && (
            <form onSubmit={async e => {
              e.preventDefault();
              if (!form.batch || !form.breed || !form.hatchDate || Number(form.initialBirds) <= 0) { setError('Enter the batch, breed, hatching date and number of birds.'); return; }
              try {
                if (form.id) await api.put('/api/poultry/' + form.id, form); else await api.post('/api/poultry', form);
                setModal(''); setForm({}); await load();
              } catch (e) { setError('Could not save poultry batch.'); }
            }} className="grid md:grid-cols-2 gap-4">
              <Field l="Batch name / number" v={form.batch} c={v => setForm({ ...form, batch: v })} req />
              <Select l="Bird type" v={form.birdType} opts={['Chicken', 'Turkey', 'Duck', 'Other']} c={v => setForm({ ...form, birdType: v })} />
              <Field l="Breed / strain" v={form.breed} c={v => setForm({ ...form, breed: v })} req />
              <Field l="Hatching date" type="date" v={form.hatchDate} c={v => setForm({ ...form, hatchDate: v })} req />
              <Field l="Initial number of birds" type="number" v={form.initialBirds} c={v => setForm({ ...form, initialBirds: v })} req />
              <Field l="Current number of birds" type="number" v={form.currentBirds} c={v => setForm({ ...form, currentBirds: v || form.initialBirds })} />
              <Select l="Purpose" v={form.purpose} opts={['Meat', 'Eggs', 'Breeding', 'Dual purpose']} c={v => setForm({ ...form, purpose: v })} />
              <Field l="Source / supplier" v={form.source} c={v => setForm({ ...form, source: v })} />
              <Field l="Notes" v={form.notes} c={v => setForm({ ...form, notes: v })} />
              <Submit />
            </form>
          )}
          {modal === 'weight' && (
            <form
              onSubmit={e => save('/api/weights', e)}
              className="grid md:grid-cols-2 gap-4"
            >
              <AnimalSelect
                animals={animals}
                v={form.animalId}
                c={v => setForm({ ...form, animalId: v })}
              />
              <Field
                l="Date"
                type="date"
                v={form.date}
                c={v => setForm({ ...form, date: v })}
              />
              <Field
                l="Weight (kg)"
                type="number"
                v={form.weight}
                c={v => setForm({ ...form, weight: v })}
                req
              />
              <Field
                l="Notes"
                v={form.notes}
                c={v => setForm({ ...form, notes: v })}
              />
              <Submit />
            </form>
          )}
          {modal === 'health' && (
            <form
              onSubmit={e => save('/api/health', e)}
              className="grid md:grid-cols-2 gap-4"
            >
              <AnimalSelect
                allowAll
                animals={animals}
                v={form.animalId}
                c={v => setForm({ ...form, animalId: v, animalCount: v === 'ALL' ? animals.filter(a => a.status === 'Active').length : undefined })}
              />
              <Field
                l="Date"
                type="date"
                v={form.date}
                c={v => setForm({ ...form, date: v })}
              />
              <Select
                l="Type"
                v={form.type}
                opts={[
                  'Vaccination',
                  'Deworming',
                  'Treatment',
                  'Vet check',
                  'Other',
                ]}
                c={v => setForm({ ...form, type: v })}
              />
              <Field
                l="Vaccine / treatment"
                v={form.vaccine}
                c={v => setForm({ ...form, vaccine: v })}
              />
              <Field
                l={form.type === 'Vaccination' ? 'Next vaccination date' : 'Next due date'}
                type="date"
                v={form.nextDue}
                c={v => setForm({ ...form, nextDue: v })}
              />
              {['Vaccination', 'Deworming'].includes(form.type) && (
                <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <label className="flex items-start gap-3 text-sm font-semibold text-emerald-950">
                    <input type="checkbox" checked={form.emailReminders !== false} onChange={e => setForm({ ...form, emailReminders: e.target.checked })} className="mt-1" />
                    <span>Send automatic email reminders
                      <span className="block font-normal text-emerald-800 mt-1">Get an email 3 days before the {form.type === 'Deworming' ? 'deworming' : 'vaccination'} date and again on the due date.</span>
                    </span>
                  </label>
                  <div className="mt-3">
                    <Field l="Reminder email" type="email" v={form.reminderEmail || authUser.email || ''} c={v => setForm({ ...form, reminderEmail: v })} />
                    <p className="text-xs text-emerald-800 mt-1">Defaults to your signed-in email. You can enter a different address.</p>
                  </div>
                </div>
              )}
              <Field
                l="Provider / vet"
                v={form.provider}
                c={v => setForm({ ...form, provider: v })}
              />
              <Field
                l="Notes"
                v={form.notes}
                c={v => setForm({ ...form, notes: v })}
              />
              <Submit />
            </form>
          )}
          {modal === 'event' && (
            <form
              onSubmit={e => save('/api/events', e)}
              className="grid md:grid-cols-2 gap-4"
            >
              <AnimalSelect
                animals={animals}
                v={form.animalId}
                c={v => setForm({ ...form, animalId: v })}
              />
              <Field
                l="Date"
                type="date"
                v={form.date}
                c={v => setForm({ ...form, date: v })}
              />
              <Select
                l="Event"
                v={form.type}
                opts={[
                  'Breeding',
                  'Pregnancy',
                  'Birth',
                  'Mortality',
                  'Sale',
                  'Purchase',
                  'Transfer',
                  'Other',
                ]}
                c={v => setForm({ ...form, type: v })}
              />
              <Field
                l="Details"
                v={form.details}
                c={v => setForm({ ...form, details: v })}
              />
              <Field
                l="Outcome"
                v={form.outcome}
                c={v => setForm({ ...form, outcome: v })}
              />
              <Submit />
            </form>
          )}
          {modal === 'finance' && (
            <form
              onSubmit={e => save('/api/finance', e)}
              className="grid md:grid-cols-2 gap-4"
            >
              <Field
                l="Date"
                type="date"
                v={form.date}
                c={v => setForm({ ...form, date: v })}
              />
              <Select
                l="Type"
                v={form.type}
                opts={['expense', 'income']}
                c={v => setForm({ ...form, type: v })}
              />
              <Select
                l="Category"
                v={form.category}
                opts={[
                  'Feed',
                  'Animals',
                  'Veterinary',
                  'Vaccines',
                  'Equipment',
                  'Transport',
                  'Labour',
                  'Sales',
                  'Other',
                ]}
                c={v => setForm({ ...form, category: v })}
              />
              <Field
                l="Amount (KSh)"
                type="number"
                v={form.amount}
                c={v => setForm({ ...form, amount: v })}
                req
              />
              <Field
                l="Description"
                v={form.description}
                c={v => setForm({ ...form, description: v })}
                req
              />
              <Submit />
            </form>
          )}
          {modal === 'production' && (
            <form onSubmit={e => save('/api/production', e)} className="grid md:grid-cols-2 gap-4">
              <Select l="Type" v={form.type} opts={['Milk', 'Eggs']} c={v => setForm({ ...form, type: v })} />
              <Field l="Date" type="date" v={form.date} c={v => setForm({ ...form, date: v })} />
              {form.type === 'Eggs' ? (
                <Field l="Poultry batch" v={form.batch} c={v => setForm({ ...form, batch: v })} />
              ) : (
                <AnimalSelect animals={animals} v={form.animalId} c={v => setForm({ ...form, animalId: v })} />
              )}
              <Field l={form.type === 'Eggs' ? 'Number of eggs' : 'Litres of milk'} type="number" v={form.quantity} c={v => setForm({ ...form, quantity: v })} req />
              <Field l="Notes" v={form.notes} c={v => setForm({ ...form, notes: v })} />
              <Submit />
            </form>
          )}
          {modal === 'feed' && (
            <form onSubmit={e => save('/api/feed', e)} className="grid md:grid-cols-2 gap-4">
              <Field l="Date" type="date" v={form.date} c={v => setForm({ ...form, date: v })} />
              <Field l="Feed type (e.g. Napier, dairy meal)" v={form.feedType} c={v => setForm({ ...form, feedType: v })} req />
              <Select l="Fed to" v={form.group} opts={['Livestock', 'Poultry', 'All']} c={v => setForm({ ...form, group: v })} />
              <Field l="Quantity (kg)" type="number" v={form.quantity} c={v => setForm({ ...form, quantity: v })} req />
              <Field l="Cost (KSh, optional)" type="number" v={form.cost} c={v => setForm({ ...form, cost: v })} />
              <Field l="Notes" v={form.notes} c={v => setForm({ ...form, notes: v })} />
              <Submit />
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function About() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-950 text-white p-5 sm:p-8 md:p-10">
        <div className="text-emerald-400 font-bold">ABOUT MKULIMA FARM MANAGER</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-2">Simple, organized farm record keeping.</h2>
        <p className="text-slate-300 mt-4 max-w-3xl leading-7">Mkulima Farm Manager is a digital farm management system designed to help farmers keep accurate records, monitor their animals, manage breeding and health activities, and understand the financial performance of their farm.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <InfoCard title="🐐 Livestock management" text="Register goats, sheep, cattle and other livestock with tags, names, breeds, sex, origin, status and available birth information. Track animals born on the farm separately from animals purchased from outside." />
        <InfoCard title="🐔 Poultry management" text="Manage poultry by batch rather than individual birds. Record batch name/number, bird type, breed or strain, hatching date, bird numbers, purpose, source and notes." />
        <InfoCard title="❤️ Breeding & reproduction" text="Record mating dates and expected due dates for female animals, together with breeding, pregnancy, birth and other important farm events." />
        <InfoCard title="💉 Health & vaccination" text="Maintain vaccination, deworming, treatment and veterinary records, including the next due date so important health activities are not forgotten." />
        <InfoCard title="⚖️ Growth & weights" text="Record animal weights over time to monitor growth, performance and changes in body condition." />
        <InfoCard title="💰 Farm finances" text="Track farm income and expenses. When you register a purchased animal, its purchase price is automatically recorded as an animal-purchase expense." />
        <InfoCard title="🔔 Critical reminders" text="The system helps send critical reminders by email, such as the next vaccination or deworming date, so important health work is never forgotten. You get a reminder 3 days before and again on the due date." />
        <InfoCard title="💬 Community & experts" text="Ask questions and get live answers from other farmers and admins. Vets and advisors can register their location and contacts so farmers near them can reach out quickly." />
        <InfoCard title="🛒 Marketplace" text="Post animals, produce and equipment for sale with photos. Listings go live after you pay a small listing fee and an admin approves them, which keeps fake adverts out." />
        <InfoCard title="🥛 Milk & egg production" text="Record daily milk by animal and eggs by poultry batch, and see monthly totals at a glance." />
        <InfoCard title="🌾 Feed tracking" text="Log feed type, quantity and cost. When you enter a cost, it is automatically added to your expenses as a feed expense." />
        <InfoCard title="📊 Reports & exports" text="Review income, expenses, production and feed for any date range, print a summary, or export any record set to CSV for Excel." />
      </div>
      <div className="bg-white border rounded-2xl p-6">
        <h3 className="text-xl font-black">Why use the system?</h3>
        <ul className="mt-4 space-y-3 text-slate-600 list-disc pl-5">
          <li>Keep farm records in one organized place.</li>
          <li>Make better breeding, health and purchasing decisions using your records.</li>
          <li>Monitor animal growth and farm expenses over time.</li>
          <li>Reduce reliance on notebooks and scattered spreadsheets.</li>
          <li>Build a reliable history for every animal on the farm.</li>
        </ul>
      </div>
      <div className="text-sm text-slate-500 text-center pb-4">Mkulima Farm Manager • Built for practical farm record keeping</div>
    </div>
  );
}
function InfoCard(p: { title: string; text: string }) {
  return <div className="bg-white border rounded-2xl p-6"><h3 className="font-black text-lg">{p.title}</h3><p className="text-slate-600 mt-2 leading-6">{p.text}</p></div>;
}
function Dashboard(p: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const birds = (p.poultry || []).reduce((s: number, x: any) => s + Number(x.currentBirds || x.initialBirds || 0), 0);
  const inMonth = (p.finance || []).filter((x: any) => String(x.date).startsWith(month));
  const incomeM = inMonth.filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const spendM = inMonth.filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const expecting = p.animals.filter((x: Animal) => x.status === 'Active' && x.expectedDueDate && x.expectedDueDate >= today && x.expectedDueDate <= soon).length;
  const overdue = (p.health || []).filter((x: any) => x.nextDue && String(x.nextDue).slice(0, 10) < today).length;
  const sold = p.animals.filter((x: Animal) => x.status === 'Sold').length;
  const mortality = p.animals.length ? Math.round((p.dead / p.animals.length) * 1000) / 10 : 0;
  const stats: [any, string, string, string, string, string][] = [
    [PawPrint, 'bg-emerald-800', String(p.active), 'Animals', 'Individual records', 'Livestock'],
    [Bird, 'bg-emerald-500', String(birds), 'Poultry', 'Birds across batches', 'Poultry'],
    [Milk, 'bg-sky-500', sumQty(p.production || [], 'Milk', month) + ' L', 'Milk this month', 'Litres recorded', 'Production'],
    [Egg, 'bg-yellow-500', String(sumQty(p.production || [], 'Eggs', month)), 'Eggs this month', 'Eggs collected', 'Production'],
    [CircleDollarSign, 'bg-amber-600', money(incomeM), 'Income this month', 'Sales and other income', 'Finances'],
    [ShoppingBag, 'bg-rose-400', money(spendM), 'Spend this month', 'Net ' + money(incomeM - spendM), 'Finances'],
  ];
  const snap: [any, string, string, string][] = [
    [PawPrint, String(expecting), 'Expecting', expecting ? 'Births due within 30 days' : 'No near-term births flagged'],
    [ShieldCheck, String(p.due), 'Health due', 'Next due dates within 30 days'],
    [Store, String(sold), 'Sold', 'Animals marked as sold'],
    [Activity, mortality + '%', 'Mortality', p.dead + ' recorded ' + (p.dead === 1 ? 'death' : 'deaths')],
  ];
  const actions: [any, string, string, string][] = [
    [PawPrint, 'Livestock register', 'Add records, track weights and run bulk health actions.', 'Livestock'],
    [ShieldCheck, 'Health records', 'Vaccination, deworming and treatment schedules.', 'Health'],
    [CircleDollarSign, 'Record finances', 'Capture sales, expenses and feed purchases.', 'Finances'],
    [Store, 'Marketplace', 'Advertise animals and produce for sale.', 'Marketplace'],
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-slate-500 text-sm">{greet}</div>
        {editing ? (
          <form
            onSubmit={async e => {
              e.preventDefault();
              const n = draft.trim();
              if (!n) return;
              setBusy(true); setErr('');
              try { await p.onRename(n); setEditing(false); } catch { setErr('Could not save the name. Try again.'); } finally { setBusy(false); }
            }}
            className="flex flex-wrap gap-2 mt-1"
          >
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={60} placeholder="e.g. Jeffrey's Farm" className="border rounded-xl px-3 py-2 text-lg font-bold bg-white" />
            <button disabled={busy} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setEditing(false); setErr(''); }} className="border rounded-xl px-4 py-2 font-semibold bg-white">Cancel</button>
          </form>
        ) : (
          <h2 className="text-2xl sm:text-3xl font-black mt-0.5 flex items-center gap-2">
            {p.name || 'My farm'}
            <button onClick={() => { setDraft(p.name || ''); setEditing(true); }} aria-label="Edit farm name" title="Edit farm name" className="text-slate-400 hover:text-slate-700"><Edit3 size={18} /></button>
          </h2>
        )}
        {err && <p className="text-sm text-rose-600 mt-1">{err}</p>}
        <p className="text-slate-500 text-sm mt-1">Your farm at a glance.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {stats.map(([Icon, bg, value, label, sub, page]) => (
          <button key={label} onClick={() => p.setPage(page)} className="text-left bg-white border rounded-2xl p-4 hover:shadow-md transition-shadow">
            <span className={'w-10 h-10 rounded-xl grid place-items-center text-white ' + bg}><Icon size={20} /></span>
            <div className="text-2xl font-black mt-3 leading-none">{value}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1.5">{label}</div>
            <div className="border-t mt-3 pt-2 text-xs text-slate-600">{sub}</div>
          </button>
        ))}
      </div>
      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-3">
        <div className="bg-white border rounded-2xl p-4">
          <h3 className="text-lg font-black">Operational snapshot</h3>
          <p className="text-slate-500 mb-4">Health and breeding signals across your farm</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {snap.map(([Icon, value, label, sub]) => (
              <div key={label} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><Icon size={16} /></span>
                  <span className="text-xl font-black">{value}</span>
                </div>
                <div className="font-bold text-sm mt-2">{label}</div>
                <div className="text-xs text-slate-500 mt-1">{sub}</div>
              </div>
            ))}
          </div>
          <div className={'mt-3 rounded-xl px-3 py-2 text-sm ' + (overdue ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-slate-700')}>
            {overdue ? overdue + ' health ' + (overdue === 1 ? 'action is' : 'actions are') + ' overdue. Open Health to review.' : 'No urgent livestock alerts right now.'}
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <h3 className="text-lg font-black">Quick actions</h3>
          <p className="text-slate-500 mb-4">Jump to the sections you use most</p>
          <div className="space-y-2">
            {actions.map(([Icon, title, text, page]) => (
              <button key={title} onClick={() => p.setPage(page)} className="w-full text-left border rounded-xl p-3 flex gap-3 items-start hover:bg-stone-50">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"><Icon size={18} /></span>
                <span><b>{title} <span className="text-slate-400">&#8599;</span></b><span className="block text-xs text-slate-500 mt-0.5">{text}</span></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const TYPE_STYLE: Record<string, string> = {
  Buck: 'bg-blue-50 text-blue-700', Doe: 'bg-rose-50 text-rose-700', Ewe: 'bg-fuchsia-50 text-fuchsia-700',
  Ram: 'bg-indigo-50 text-indigo-700', Cow: 'bg-amber-50 text-amber-700', Bull: 'bg-orange-50 text-orange-700',
};
const SPECIES_ICON: Record<string, string> = { Goat: '🐐', Sheep: '🐑', Cattle: '🐄', Chicken: '🐔', 'Other Poultry': '🦆' };
const iconOf = (s?: string) => SPECIES_ICON[s || ''] || '🐾';
function animalType(a: Animal) {
  const sex = a.sex || '';
  if (!['', 'Male', 'Female'].includes(sex)) return sex;
  const f = sex === 'Female', m = sex === 'Male';
  if (a.species === 'Goat') return f ? 'Doe' : m ? 'Buck' : 'Goat';
  if (a.species === 'Sheep') return f ? 'Ewe' : m ? 'Ram' : 'Sheep';
  if (a.species === 'Cattle') return f ? 'Cow' : m ? 'Bull' : 'Cattle';
  return a.species || 'Animal';
}
function Animals(p: any) {
  const [tab, setTab] = useState<'Active' | 'Sold' | 'Other'>('Active');
  const [typeF, setTypeF] = useState('All');
  const [speciesF, setSpeciesF] = useState('All');
  const [originF, setOriginF] = useState('All');
  const [open, setOpen] = useState('');
  const [menu, setMenu] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const all: Animal[] = p.animals;
  const inTab = (x: Animal, t: string) => t === 'Active' ? x.status === 'Active' : t === 'Sold' ? x.status === 'Sold' : !['Active', 'Sold'].includes(x.status);
  const count = (t: string) => all.filter(x => inTab(x, t)).length;
  const plural = (w: string) => /(sheep|cattle|poultry)$/i.test(w) ? w : w.endsWith('s') ? w : w + 's';
  const bySpecies: Record<string, Record<string, number>> = {};
  all.filter(x => x.status === 'Active').forEach(x => {
    const s = x.species || 'Other', t = animalType(x);
    bySpecies[s] = bySpecies[s] || {};
    bySpecies[s][t] = (bySpecies[s][t] || 0) + 1;
  });
  const types = Array.from(new Set(all.map(animalType))).sort();
  const originOf = (x: Animal) => (x.origin === 'Purchased' || (!x.origin && x.source === 'Purchased') ? 'Purchased' : 'Farm Born');
  const base = all.filter(x => inTab(x, tab) && (speciesF === 'All' || (x.species || 'Other') === speciesF) && (typeF === 'All' || animalType(x) === typeF));
  const originCount = (o: string) => base.filter(x => o === 'All' || originOf(x) === o).length;
  const rows = base.filter(x => originF === 'All' || originOf(x) === originF);
  const wOf = (id: string) => (p.weights || []).filter((w: any) => w.animalId === id).sort((x: any, y: any) => String(y.date).localeCompare(String(x.date)));
  const nextVacc = (x: Animal) => {
    const ds = (p.health || [])
      .filter((h: any) => String(h.type).toLowerCase() === 'vaccination' && h.nextDue && (h.animalId === x.id || h.animalId === 'ALL'))
      .map((h: any) => String(h.nextDue).slice(0, 10)).sort();
    return ds.length ? (ds.find((d: string) => d >= today) || ds[ds.length - 1]) : '';
  };
  const health = (x: Animal): [string, string] => {
    if (x.status !== 'Active') return [x.status, 'bg-stone-100 text-stone-600'];
    const d = nextVacc(x);
    if (!d) return ['normal', 'bg-emerald-50 text-emerald-700'];
    const days = Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
    if (days < 0) return ['overdue', 'bg-rose-50 text-rose-700'];
    if (days <= 14) return ['due soon', 'bg-amber-50 text-amber-700'];
    return ['normal', 'bg-emerald-50 text-emerald-700'];
  };
  const TABS: [typeof tab, string][] = [['Active', 'Active'], ['Sold', 'Sold'], ['Other', 'Dead & other']];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-3xl font-black">{p.title || 'Livestock'}</h2>
          <p className="text-slate-500">{count('Active')} active {count('Active') === 1 ? 'animal' : 'animals'}</p>
        </div>
        <div className="flex gap-2">
          {p.bulkHealth && <button onClick={p.bulkHealth} className="flex gap-2 items-center bg-white border rounded-xl px-4 py-2.5 font-semibold"><ShieldCheck size={17} />Bulk health</button>}
          {p.add && <button onClick={() => p.add(originF !== 'All' ? originF : undefined)} className="flex gap-2 items-center bg-slate-950 text-white rounded-xl px-4 py-2.5 font-bold"><Plus size={17} />Add animal</button>}
        </div>
      </div>
      {Object.keys(bySpecies).length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
          {Object.entries(bySpecies).map(([sp, tm]) => {
            const total = Object.values(tm).reduce((s, n) => s + n, 0);
            const on = speciesF === sp;
            return (
              <div key={sp} className={'bg-white border rounded-2xl p-4 sm:p-5 ' + (on ? 'ring-2 ring-emerald-500' : '')}>
                <button className="w-full text-left flex items-center gap-3" onClick={() => { setTab('Active'); setTypeF('All'); setSpeciesF(on ? 'All' : sp); }}>
                  <span className="w-12 h-12 rounded-xl bg-emerald-50 grid place-items-center shrink-0 text-3xl leading-none" aria-hidden="true">{iconOf(sp)}</span>
                  <span>
                    <span className="block text-xs font-bold tracking-wide text-slate-500 uppercase">{plural(sp)}</span>
                    <span className="block text-3xl font-black leading-none mt-1">{total}</span>
                  </span>
                </button>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(tm).sort((x, y) => y[1] - x[1]).map(([t, n]) => (
                    <button key={t} onClick={() => { setTab('Active'); setSpeciesF(sp); setTypeF(typeF === t && speciesF === sp ? 'All' : t); }} className={'px-3 py-1 rounded-full text-sm font-semibold ' + (TYPE_STYLE[t] || 'bg-stone-100 text-stone-700')}>{n} {n === 1 ? t : plural(t)}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={'px-4 py-2 rounded-full border font-semibold ' + (tab === k ? 'bg-slate-950 text-white border-slate-950' : 'bg-white')}>{l} ({count(k)})</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm text-slate-500 mr-1">Origin</span>
        {([['All', 'All'], ['Farm Born', 'Born on the farm'], ['Purchased', 'Purchased']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOriginF(k)} className={'px-3 py-1.5 rounded-xl border text-sm font-semibold ' + (originF === k ? 'bg-emerald-500 border-emerald-500' : 'bg-white')}>{l} ({originCount(k)})</button>
        ))}
      </div>
      <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-4">
        <input value={p.search} onChange={e => p.setSearch(e.target.value)} placeholder="Search by tag, name, breed…" className="border rounded-xl px-4 py-3 bg-white" />
        <select value={typeF} onChange={e => setTypeF(e.target.value)} className="border rounded-xl px-4 py-3 bg-white"><option value="All">All types</option>{types.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                {['Tag ID', 'Type', 'Breed', 'DOB', 'Weight', 'Next vacc.', 'Health', ''].map(h => <th key={h} className="text-left p-4 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-500">No animals here yet.</td></tr>}
              {rows.map(a => {
                const t = animalType(a), [hl, hc] = health(a), nv = nextVacc(a), w = wOf(a.id);
                return (
                  <Fragment key={a.id}>
                    <tr className="border-t cursor-pointer hover:bg-stone-50" onClick={() => setOpen(open === a.id ? '' : a.id)}>
                      <td className="p-4 whitespace-nowrap"><span className="font-mono font-bold bg-stone-100 rounded-lg px-2.5 py-1.5">{a.tag}</span>{a.name && <span className="block text-xs text-slate-500 mt-1">{a.name}</span>}{originOf(a) === 'Purchased' && <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Purchased</span>}</td>
                      <td className="p-4"><span className={'px-3 py-1 rounded-full font-semibold ' + (TYPE_STYLE[t] || 'bg-stone-100 text-stone-700')}>{iconOf(a.species)} {t}</span></td>
                      <td className="p-4">{a.breed || '—'}</td>
                      <td className="p-4 whitespace-nowrap">{a.dob ? dateText(a.dob) : '--'}</td>
                      <td className="p-4 whitespace-nowrap">{w[0] ? w[0].weight + ' kg' : '--'}</td>
                      <td className="p-4 whitespace-nowrap">{nv ? dateText(nv) : '--'}</td>
                      <td className="p-4"><span className={'px-3 py-1 rounded-full font-semibold ' + hc}>{hl}</span></td>
                      <td className="p-4 relative" onClick={e => e.stopPropagation()}>
                        <button aria-label="Actions" className="p-2 rounded-lg hover:bg-stone-100" onClick={() => setMenu(menu === a.id ? '' : a.id)}><MoreVertical size={18} /></button>
                        {menu === a.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenu('')} />
                            <div className="absolute right-4 top-12 z-20 w-48 bg-white border rounded-xl shadow-lg py-1 text-left">
                              <button className="w-full text-left px-4 py-2 hover:bg-stone-50" onClick={() => { setOpen(a.id); setMenu(''); }}>View details</button>
                              <button className="w-full text-left px-4 py-2 hover:bg-stone-50" onClick={() => { setMenu(''); p.weight(a.id); }}>Record weight</button>
                              <button className="w-full text-left px-4 py-2 hover:bg-stone-50" onClick={() => { setMenu(''); p.edit(a); }}>Edit</button>
                              <button className="w-full text-left px-4 py-2 hover:bg-stone-50 text-rose-600" onClick={() => { setMenu(''); p.remove(a.id); }}>Delete</button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                    {open === a.id && (
                      <tr className="bg-stone-50">
                        <td colSpan={8} className="p-4">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                            {([['Species', a.species], ['Sex', a.sex], ['Origin', a.origin || a.source], ['Status', a.status], ['Mating date', a.matingDate ? dateText(a.matingDate) : ''], ['Expected due', a.expectedDueDate ? dateText(a.expectedDueDate) : ''], ['Purchase price', a.purchasePrice ? 'KSh ' + Number(a.purchasePrice).toLocaleString() : ''], ['Notes', a.notes]] as [string, string][]).filter(r => r[1]).map(([k, v]) => (
                              <div key={k}><div className="text-xs uppercase text-slate-500">{k}</div><div className="font-semibold">{v}</div></div>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <b>Weight history</b>
                            <button onClick={() => p.weight(a.id)} className="bg-emerald-500 px-3 py-1.5 rounded-xl font-bold text-sm">+ Record weight</button>
                          </div>
                          {w.length ? (
                            <div className="overflow-auto">
                              <table className="w-full text-sm bg-white border rounded-xl">
                                <thead><tr>{['Date', 'Weight', 'Change', 'Notes', 'Actions'].map(h => <th key={h} className="text-left p-3 text-slate-500">{h}</th>)}</tr></thead>
                                <tbody>
                                  {w.map((x: any, i: number, list: any[]) => {
                                    const prev = list[i + 1];
                                    const diff = prev ? Number(x.weight) - Number(prev.weight) : null;
                                    return (
                                      <tr key={x.id} className="border-t">
                                        <td className="p-3 whitespace-nowrap">{dateText(x.date)}</td>
                                        <td className="p-3 whitespace-nowrap">{x.weight} kg</td>
                                        <td className="p-3 whitespace-nowrap">{diff === null ? '—' : (diff > 0 ? '+' : '') + Math.round(diff * 100) / 100 + ' kg'}</td>
                                        <td className="p-3">{x.notes || '—'}</td>
                                        <td className="p-3 whitespace-nowrap">
                                          <button className="mr-1 p-2 text-slate-600" aria-label="Edit weight" onClick={() => p.editWeight(x)}><Edit3 size={16} /></button>
                                          <button className="p-2 text-red-600" aria-label="Delete weight" onClick={() => p.deleteWeight(x.id)}><Trash2 size={16} /></button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : <p className="text-sm text-slate-500">No weights recorded for this animal yet.</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function PoultryRegister(p: any) {
  return <div className="bg-white border rounded-2xl overflow-hidden">
    <div className="p-5 border-b flex flex-col md:flex-row justify-between gap-3"><div><b className="text-lg">Poultry batches</b><p className="text-sm text-slate-500">Track birds by batch instead of individual bird records.</p></div><div className="flex gap-2"><input value={p.search} onChange={e => p.setSearch(e.target.value)} placeholder="Search batch, breed…" className="border rounded-xl px-3 py-2" /><button onClick={p.add} className="bg-emerald-500 px-3 py-2 rounded-xl font-bold flex gap-2"><Plus size={16} />Add batch</button></div></div>
    <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-stone-50"><tr>{['Batch','Bird type','Breed / strain','Hatching date','Initial birds','Current birds','Purpose','Source','Notes','Actions'].map(h => <th className="text-left p-4 text-slate-500" key={h}>{h}</th>)}</tr></thead><tbody>{p.batches.map((x: PoultryBatch) => <tr className="border-t" key={x.id}><td className="p-4 font-bold">{x.batch}</td><td className="p-4">{x.birdType}</td><td className="p-4">{x.breed}</td><td className="p-4">{dateText(x.hatchDate)}</td><td className="p-4">{x.initialBirds}</td><td className="p-4">{x.currentBirds || x.initialBirds}</td><td className="p-4">{x.purpose || '—'}</td><td className="p-4">{x.source || '—'}</td><td className="p-4">{x.notes || '—'}</td><td className="p-4 flex gap-3"><button onClick={() => p.edit(x)}><Edit3 size={16} /></button><button onClick={() => p.remove(x.id)} className="text-rose-600"><Trash2 size={16} /></button></td></tr>)}</tbody></table>{!p.batches.length && <div className="p-10 text-center text-slate-500">No poultry batches yet.</div>}</div>
  </div>;
}
function Table(p: any) {
  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b flex flex-wrap justify-between gap-3">
        <div>
          <b className="text-lg">{p.title}</b>
          <p className="text-sm text-slate-500">Persistent farm records.</p>
        </div>
        <button
          onClick={p.click}
          className="bg-emerald-500 px-3 py-2 rounded-xl font-bold flex gap-2"
        >
          <Plus size={16} />
          {p.button}
        </button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              {p.heads.map((h: string) => (
                <th className="text-left p-4 text-slate-500" key={h}>
                  {h}
                </th>
              ))}
              {(p.onEdit || p.onDelete) && <th className="text-left p-4 text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r: string[], i: number) => (
              <tr className="border-t" key={i}>
                {r.map((v: string, j: number) => (
                  <td className="p-4" key={j}>
                    {v}
                  </td>
                ))}
                {(p.onEdit || p.onDelete) && (
                  <td className="p-4 whitespace-nowrap">
                    {p.onEdit && <button className="mr-1 p-2 text-slate-600" aria-label="Edit" onClick={() => p.onEdit(i)}><Edit3 size={16} /></button>}
                    {p.onDelete && <button className="p-2 text-red-600" aria-label="Delete" onClick={() => p.onDelete(i)}><Trash2 size={16} /></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!p.rows.length && (
          <div className="p-10 text-center text-slate-500">No records yet.</div>
        )}
      </div>
    </div>
  );
}
function Card(p: any) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="text-sm text-slate-500">{p.label}</div>
      <div className="text-2xl font-black mt-2">{p.value}</div>
    </div>
  );
}
function Field(p: any) {
  return (
    <label className="text-sm font-semibold">
      {p.l}
      {p.req ? ' *' : ''}
      <input
        required={p.req}
        type={p.type || 'text'}
        value={p.v || ''}
        onChange={e => p.c(e.target.value)}
        className="mt-1 w-full border rounded-xl px-3 py-2 font-normal"
      />
    </label>
  );
}
function Select(p: any) {
  return (
    <label className="text-sm font-semibold">
      {p.l}
      <select
        value={p.v || ''}
        onChange={e => p.c(e.target.value)}
        className="mt-1 w-full border rounded-xl px-3 py-2 bg-white font-normal"
      >
        {p.opts.map((o: string) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
function AnimalSelect(p: any) {
  return (
    <label className="text-sm font-semibold">
      Animal
      <select
        value={p.v || ''}
        onChange={e => p.c(e.target.value)}
        className="mt-1 w-full border rounded-xl px-3 py-2 bg-white font-normal"
      >
        <option value="">Select animal</option>
        {p.allowAll && <option value="ALL">All active animals</option>}
        {p.animals.map((a: Animal) => (
          <option key={a.id} value={a.id}>
            {a.tag} · {a.breed}
          </option>
        ))}
      </select>
    </label>
  );
}
function Submit() {
  return (
    <div className="md:col-span-2 flex justify-end">
      <button className="bg-slate-950 text-white px-5 py-2.5 rounded-xl font-bold">
        Save record
      </button>
    </div>
  );
}
function Modal(p: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 p-2 sm:p-4 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-auto">
        <div className="p-5 border-b flex justify-between">
          <b>{p.title}</b>
          <button onClick={p.close}>
            <X />
          </button>
        </div>
        <div className="p-5">{p.children}</div>
      </div>
    </div>
  );
}

function sumQty(rows: any[], type: string, month: string) {
  return rows.filter(x => (!type || x.type === type) && String(x.date).startsWith(month)).reduce((s, x) => s + Number(x.quantity || 0), 0);
}
function downloadCSV(name: string, rows: any[]) {
  if (!rows.length) return alert('No records to export.');
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r)))).filter(c => c !== 'userId');
  const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = '\uFEFF' + [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = name.toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
function Reports(p: any) {
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const inR = (r: any) => { const d = String(r.date || '').slice(0, 10); return (!from || d >= from) && (!to || d <= to); };
  const fin = (p.data.Finances as any[]).filter(inR), prod = (p.data.Production as any[]).filter(inR), fd = (p.data.Feed as any[]).filter(inR);
  const inc = fin.filter(x => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
  const exp = fin.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
  const byCat: Record<string, number> = {};
  fin.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + (x.type === 'income' ? 1 : -1) * Number(x.amount || 0); });
  const qty = (rows: any[], t: string) => rows.filter(x => x.type === t).reduce((s, x) => s + Number(x.quantity || 0), 0);
  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-2xl p-5 flex flex-wrap gap-4 items-end">
        <Field l="From" type="date" v={from} c={setFrom} />
        <Field l="To" type="date" v={to} c={setTo} />
        <button onClick={() => window.print()} className="bg-slate-950 text-white px-4 py-2.5 rounded-xl font-bold">Print report</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card label="Income" value={money(inc)} />
        <Card label="Expenses" value={money(exp)} />
        <Card label="Net" value={money(inc - exp)} />
        <Card label="Milk (litres)" value={String(qty(prod, 'Milk'))} />
        <Card label="Eggs" value={String(qty(prod, 'Eggs'))} />
        <Card label="Feed (kg) / cost" value={fd.reduce((s, x) => s + Number(x.quantity || 0), 0) + ' kg / ' + money(fd.reduce((s, x) => s + Number(x.cost || 0), 0))} />
      </div>
      <div className="bg-white border rounded-2xl p-5">
        <b>Net by category</b>
        {Object.keys(byCat).length ? Object.entries(byCat).map(([k, v]) => (
          <div key={k} className="flex justify-between border-t mt-2 pt-2 text-sm"><span>{k}</span><span>{money(v)}</span></div>
        )) : <p className="text-sm text-slate-500 mt-2">No transactions in this period.</p>}
      </div>
      <div className="bg-white border rounded-2xl p-5">
        <b>Export to CSV (opens in Excel)</b>
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.keys(p.data).map(k => (
            <button key={k} onClick={() => downloadCSV(k, p.data[k])} className="border rounded-xl px-3 py-2 text-sm font-semibold flex gap-2"><Download size={14} />{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniChart({ data, kind, color }: { data: { label: string; value: number }[]; kind: 'bar' | 'line'; color: string }) {
  const W = 600, H = 190, L = 34, B = 24, T = 10, R = 8;
  const max = Math.max(1, ...data.map(d => d.value));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const iw = W - L - R, ih = H - T - B, n = data.length;
  const x = (i: number) => L + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const bw = Math.max(2, iw / Math.max(n, 1) - 2);
  const y = (v: number) => T + ih - (v / nice) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(nice * f));
  const labelIdx = n <= 1 ? [0] : n <= 12 ? data.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#78716c">{t}</text>
        </g>
      ))}
      {kind === 'bar'
        ? data.map((d, i) => (
            <rect key={i} x={L + (i * iw) / n + 1} y={y(d.value)} width={bw} height={Math.max(0, T + ih - y(d.value))} fill={color} rx="2">
              <title>{d.label}: {d.value}</title>
            </rect>
          ))
        : (
          <>
            <polyline fill="none" stroke={color} strokeWidth="2.5" points={data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')} />
            {n <= 31 && data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill={color}><title>{d.label}: {d.value}</title></circle>
            ))}
          </>
        )}
      {labelIdx.map(i => (
        <text key={i} x={kind === 'bar' ? L + (i * iw) / n + bw / 2 : x(i)} y={H - 6} textAnchor={n <= 12 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={n <= 12 ? 9 : 10} fill="#78716c">{data[i]?.label}</text>
      ))}
    </svg>
  );
}
function AdminCharts({ o }: { o: any }) {
  const [days, setDays] = useState(30);
  if (!o || !o.signupsByDay) return null;
  const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const all = o.signupsByDay as { date: string; count: number }[];
  const act = (o.activeByDay as { date: string; count: number }[]).slice(-days);
  const sign = all.slice(-days);
  let run = (o.usersBeforeRange || 0) + all.slice(0, all.length - days).reduce((s, x) => s + x.count, 0);
  const cumulative = sign.map(d => ({ label: fmt(d.date), value: (run += d.count) }));
  const newInRange = sign.reduce((s, d) => s + d.count, 0);
  const sections = Object.entries(o.sectionCounts || {}).sort((p: any, q: any) => q[1] - p[1]).slice(0, 8) as [string, number][];
  const topMax = Math.max(1, ...sections.map(s => s[1]));
  const Panel = (p: { title: string; sub?: string; children: any }) => (
    <div className="bg-white border rounded-2xl p-4 sm:p-5">
      <div className="font-bold">{p.title}</div>
      {p.sub && <div className="text-xs text-slate-500 mb-2">{p.sub}</div>}
      {p.children}
    </div>
  );
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600"><b className="text-slate-900">{newInRange}</b> new {newInRange === 1 ? 'registration' : 'registrations'} in the last {days} days</div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={'px-3 py-1.5 rounded-xl text-sm font-semibold border ' + (days === d ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-white')}>{d} days</button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="New registrations per day" sub="Accounts created each day">
          <MiniChart kind="bar" color="#10b981" data={sign.map(d => ({ label: fmt(d.date), value: d.count }))} />
        </Panel>
        <Panel title="Total registered users" sub="Running total over the period">
          <MiniChart kind="line" color="#0f766e" data={cumulative} />
        </Panel>
        <Panel title="Daily active users" sub="Different people who used the app each day">
          <MiniChart kind="bar" color="#f59e0b" data={act.map(d => ({ label: fmt(d.date), value: d.count }))} />
        </Panel>
        <Panel title="Most used sections" sub="Record changes in the last 90 days">
          {sections.length ? sections.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3 text-sm mt-2">
              <span className="w-24 shrink-0 text-slate-600">{name}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full" style={{ width: (count / topMax) * 100 + '%' }} /></div>
              <span className="w-8 text-right font-semibold">{count}</span>
            </div>
          )) : <p className="text-sm text-slate-500 mt-2">No activity recorded yet.</p>}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Icon size={18} />{label}</div>
      <div className="text-3xl font-black mt-3">{value}</div>
    </div>
  );
}
function GroupedBars({ data, aName, bName }: { data: { label: string; a: number; b: number }[]; aName: string; bName: string }) {
  const W = 600, H = 190, L = 34, B = 24, T = 10, R = 8;
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const iw = W - L - R, ih = H - T - B, n = data.length;
  const gw = iw / Math.max(n, 1), bw = Math.max(2, (gw - 6) / 2);
  const y = (v: number) => T + ih - (v / nice) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(nice * f));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#78716c">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={L + i * gw + 3} y={y(d.a)} width={bw} height={Math.max(0, T + ih - y(d.a))} fill="#22c55e" rx="2"><title>{d.label} {aName}: {d.a}</title></rect>
            <rect x={L + i * gw + 3 + bw} y={y(d.b)} width={bw} height={Math.max(0, T + ih - y(d.b))} fill="#f59e0b" rx="2"><title>{d.label} {bName}: {d.b}</title></rect>
            <text x={L + i * gw + gw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#78716c">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="flex gap-4 text-sm mt-1">
        <span className="flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-sm bg-green-500" />{aName}</span>
        <span className="flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-sm bg-amber-500" />{bName}</span>
      </div>
    </div>
  );
}
function AdminMonthly({ o }: { o: any }) {
  if (!o || !o.signupsByMonth) return null;
  const fmtM = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-4">
      <div className="bg-white border rounded-2xl p-4 sm:p-5">
        <div className="font-bold">Users over time</div>
        <div className="text-xs text-slate-500 mb-2">New signups per month (last 12 months)</div>
        <MiniChart kind="line" color="#2563eb" data={(o.signupsByMonth as { month: string; count: number }[]).map(d => ({ label: fmtM(d.month), value: d.count }))} />
      </div>
      <div className="bg-white border rounded-2xl p-4 sm:p-5">
        <div className="font-bold">Records added per month</div>
        <div className="text-xs text-slate-500 mb-2">Livestock and poultry vs all other records (last 12 months)</div>
        <GroupedBars aName="Livestock & poultry" bName="Other records" data={(o.recordsByMonth as { month: string; livestock: number; other: number }[]).map(d => ({ label: fmtM(d.month), a: d.livestock, b: d.other }))} />
      </div>
    </div>
  );
}
