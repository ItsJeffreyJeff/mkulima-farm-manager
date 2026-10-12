import { createClient } from '@supabase/supabase-js';

// Admin-only: list every marketplace listing, and approve or reject one.
export default async function handler(req: any, res: any) {
  try { return await run(req, res); } catch (e: any) { return res.status(500).json({ error: String(e?.message || e) }); }
}

async function run(req: any, res: any) {
  const sb = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const token = String(req.headers.authorization || '').replace('Bearer ', '');
  const { data: { user } } = await sb.auth.getUser(token);
  const admins = String(process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!user || !admins.includes((user.email || '').toLowerCase())) return res.status(403).json({ error: 'Admins only' });

  if (req.method === 'POST') {
    const { id, action, reason } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Bad request' });
    const patch = action === 'approve'
      ? { status: 'live', approved_at: new Date().toISOString(), reject_reason: null }
      : { status: 'rejected', reject_reason: String(reason || 'Not approved'), approved_at: null };
    const { error } = await sb.from('listings').update(patch).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  }

  const { data: rows, error } = await sb.from('listings').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(400).json({ error: error.message });
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emails: Record<string, string> = {};
  (list?.users || []).forEach(u => { emails[u.id] = u.email || ''; });
  return res.json({ items: (rows || []).map(r => ({ ...r, seller_email: emails[r.user_id] || '' })) });
}
