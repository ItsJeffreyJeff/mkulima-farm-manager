import { createClient } from '@supabase/supabase-js';

// Read before the Supabase client clears the URL hash
const hash = typeof window !== 'undefined' ? window.location.hash : '';
const isRecovery = /type=recovery/.test(hash);
const linkError = /error_description=/.test(hash)
  ? decodeURIComponent((hash.match(/error_description=([^&]+)/)?.[1] || '').replace(/\+/g, ' '))
  : '';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
const ADMINS = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SECTION: Record<string, string> = {
  animals: 'Livestock', poultry: 'Poultry', weights: 'Weights', health: 'Health',
  events: 'Events', finance: 'Finances', production: 'Production', feed: 'Feed',
};

function check(kind: string, x: any) {
  const bad = (m: string) => { throw new Error(m); };
  if (kind === 'animals' && (!x.tag || !x.breed || (x.origin === 'Farm Born' && !x.dob) || (x.origin === 'Purchased' && !(Number(x.purchasePrice) > 0)))) bad('Check required animal fields.');
  if (kind === 'poultry' && (!x.batch || !x.hatchDate || !x.breed || !(Number(x.initialBirds) > 0))) bad('Batch, hatching date, breed and number of birds are required.');
  if (kind === 'weights' && (!x.animalId || !x.date || !x.weight)) bad('Animal, date and weight are required.');
  if (kind === 'health') {
    if (!x.animalId || !x.date || !x.type) bad('Animal, date and type are required.');
    if (x.type === 'Vaccination' && x.nextDue && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.nextDue))) bad('Enter a valid next vaccination date.');
  }
  if (kind === 'events' && (!x.animalId || !x.date || !x.type)) bad('Animal, date and event type are required.');
  if (kind === 'finance' && (!x.date || !x.type || !x.category || !x.description || !x.amount)) bad('Required financial fields are missing.');
  if (kind === 'production' && (!x.date || !x.type || !(Number(x.quantity) > 0))) bad('Date, type and a quantity above zero are required.');
  if (kind === 'feed' && (!x.date || !x.feedType || !(Number(x.quantity) > 0))) bad('Date, feed type and a quantity above zero are required.');
}
const strip = (x: any) => { const { id, userId, ...rest } = x || {}; void id; void userId; return rest; };
async function sessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
async function log(action: string, section: string, details = '') {
  const u = await sessionUser();
  if (u) await supabase.from('activity').insert({ user_id: u.id, email: u.email, action, section, details });
}
function parse(path: string) {
  const [, , kind, id] = path.split('/');
  if (!SECTION[kind]) throw new Error('Unknown resource');
  return { kind, id };
}

export const api = {
  async get(path: string): Promise<any> {
    if (path === '/api/me') {
      const u = await sessionUser();
      await log('Signed in / opened app', 'Account');
      const email = (u?.email || '').toLowerCase();
      return { data: { user: { userId: u?.id, email, name: u?.user_metadata?.name || '', role: ADMINS.includes(email) ? 'admin' : 'user' } } };
    }
    if (path.startsWith('/api/admin/')) {
      const { data } = await supabase.auth.getSession();
      const r = await fetch('/api/admin?view=' + path.split('/').pop(), { headers: { Authorization: 'Bearer ' + data.session?.access_token } });
      if (!r.ok) {
        const j: any = await r.json().catch(() => ({}));
        throw new Error('Admin: ' + (j.error || 'request failed (' + r.status + ')'));
      }
      return { data: await r.json() };
    }
    const { kind } = parse(path);
    const { data, error } = await supabase.from('records').select('id,data').eq('kind', kind).order('created_at', { ascending: true }).limit(5000);
    if (error) throw error;
    return { data: { items: (data || []).map(r => ({ ...r.data, id: r.id })) } };
  },
  async post(path: string, body: any): Promise<any> {
    const { kind } = parse(path);
    check(kind, body);
    const { data, error } = await supabase.from('records').insert({ kind, data: strip(body) }).select('id').single();
    if (error) throw error;
    await log('Created record', SECTION[kind], String(body.tag || body.batch || body.type || 'New record'));
    return { data: { id: data.id } };
  },
  async put(path: string, body: any): Promise<any> {
    const { kind, id } = parse(path);
    const { data: old, error: e1 } = await supabase.from('records').select('data').eq('id', id).single();
    if (e1) throw e1;
    const { error } = await supabase.from('records').update({ data: { ...old.data, ...strip(body) }, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await log('Updated record', SECTION[kind], String(id));
    return { data: { ok: true } };
  },
  async delete(path: string): Promise<any> {
    const { kind, id } = parse(path);
    const { error } = await supabase.from('records').delete().eq('id', id);
    if (error) throw error;
    await log('Deleted record', SECTION[kind], String(id));
    return { data: { ok: true } };
  },
};

export const auth = {
  isRecovery,
  linkError,
  async resetPassword(email: string): Promise<void> {
    if (!email) throw new Error('Enter your email address first.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
  },
  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
  onPasswordRecovery(cb: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') cb(); });
    return () => data.subscription.unsubscribe();
  },
  async getUser(): Promise<any> { return sessionUser(); },
  async signIn(o: { email: string; password: string; mode: 'signin' | 'signup' }): Promise<void> {
    if (!o.email || !o.password) throw new Error('Enter your email and password.');
    if (o.mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: o.email, password: o.password });
      if (error) throw error;
      if (!data.session) throw new Error('Account created. Check your email to confirm it, then sign in.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: o.email, password: o.password });
    if (error) throw error;
  },
  async signOut(): Promise<void> { await supabase.auth.signOut(); },
};

// ---------- Marketplace ----------
const BUCKET = 'listing-photos';
const mapListing = (r: any) => ({
  id: r.id, userId: r.user_id, sellerName: r.seller_name || '', title: r.title, category: r.category,
  description: r.description || '', location: r.location || '', price: Number(r.price), unit: r.unit,
  quantity: r.quantity, contactPhone: r.contact_phone, photos: (r.photos || []) as string[],
  feeAmount: r.fee_amount, paymentRef: r.payment_ref, status: r.status as string,
  rejectReason: r.reject_reason || '', createdAt: r.created_at, sellerEmail: r.seller_email || '',
});
async function compress(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file is not a valid image.')); i.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob(bl => (bl ? res(bl) : rej(new Error('Could not process the image.'))), 'image/jpeg', 0.8));
  } finally { URL.revokeObjectURL(url); }
}
async function adminCall(method: 'GET' | 'POST', body?: any): Promise<any> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/listings', {
    method, headers: { Authorization: 'Bearer ' + data.session?.access_token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
  return j;
}
export const market = {
  fee: Number(import.meta.env.VITE_LISTING_FEE || 200),
  instructions: String(import.meta.env.VITE_PAY_INSTRUCTIONS || 'Pay the listing fee by M-Pesa, then enter the transaction code below.'),
  async list() {
    const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data || []).map(mapListing);
  },
  async save(f: any, files: File[], keep: string[], id?: string) {
    const u = await sessionUser();
    if (!u) throw new Error('Please sign in again.');
    const ref = String(f.paymentRef || '').trim().toUpperCase();
    if (!f.title?.trim() || !f.location?.trim() || !(Number(f.price) > 0) || !(Number(f.quantity) > 0)) throw new Error('Title, location, price and quantity are required.');
    if (!/^\+?[0-9 ]{9,15}$/.test(String(f.contactPhone || '').trim())) throw new Error('Enter a valid phone number buyers can reach you on.');
    if (!/^[A-Z0-9]{8,12}$/.test(ref)) throw new Error('Enter the M-Pesa transaction code from your payment confirmation message.');
    if (keep.length + files.length < 1) throw new Error('Add at least one photo.');
    const urls = [...keep];
    for (const file of files) {
      const blob = await compress(file);
      const path = u.id + '/' + crypto.randomUUID() + '.jpg';
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    const row = {
      seller_name: u.user_metadata?.name || String(u.email || '').split('@')[0],
      title: f.title.trim(), category: f.category, description: String(f.description || '').trim(),
      location: f.location.trim(), price: Number(f.price), unit: f.unit, quantity: Math.round(Number(f.quantity)),
      contact_phone: String(f.contactPhone).trim(), photos: urls, fee_amount: market.fee, payment_ref: ref,
      status: 'pending', reject_reason: null, approved_at: null,
    };
    const q = id ? supabase.from('listings').update(row).eq('id', id) : supabase.from('listings').insert(row);
    const { error } = await q;
    if (error) throw new Error(error.code === '23505' ? 'That M-Pesa code has already been used for another listing.' : error.message);
  },
  async markSold(id: string) {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string, photos: string[]) {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) throw error;
    const paths = photos.map(p => p.split('/' + BUCKET + '/')[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  },
  async adminList() { return ((await adminCall('GET')).items || []).map(mapListing); },
  async adminAct(id: string, action: 'approve' | 'reject', reason?: string) { await adminCall('POST', { id, action, reason }); },
};
