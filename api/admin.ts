import { createClient } from '@supabase/supabase-js';

const KINDS = ['animals', 'poultry', 'weights', 'health', 'events', 'finance', 'production', 'feed'];

export default async function handler(req: any, res: any) {
  const sb = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const token = String(req.headers.authorization || '').replace('Bearer ', '');
  const { data: { user } } = await sb.auth.getUser(token);
  const admins = String(process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!user || !admins.includes((user.email || '').toLowerCase())) return res.status(403).json({ error: 'Admins only' });

  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const users = (list?.users || []).map(u => ({
    email: u.email || '', name: u.user_metadata?.name || '',
    role: admins.includes((u.email || '').toLowerCase()) ? 'admin' : 'user',
    firstSeen: u.created_at, lastSeen: u.last_sign_in_at || u.created_at,
  })).sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)));
  const { data: act } = await sb.from('activity').select('email,action,section,details,created_at').order('created_at', { ascending: false }).limit(100);
  const activity = (act || []).map(a => ({ email: a.email, name: '', action: a.action, section: a.section, details: a.details, timestamp: a.created_at }));

  const view = req.query.view;
  if (view === 'users') return res.json({ items: users });
  if (view === 'activity') return res.json({ items: activity });
  const today = new Date().toISOString().slice(0, 10);
  const recordCounts: Record<string, number> = {};
  for (const k of KINDS) {
    const { count } = await sb.from('records').select('*', { count: 'exact', head: true }).eq('kind', k);
    recordCounts[k] = count || 0;
  }
  const { count: totalActivity } = await sb.from('activity').select('*', { count: 'exact', head: true });
  return res.json({ users: users.length, activeToday: users.filter(u => String(u.lastSeen).slice(0, 10) === today).length, totalActivity: totalActivity || 0, recordCounts, recentActivity: activity });
}
