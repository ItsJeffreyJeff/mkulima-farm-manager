import { createClient } from '@supabase/supabase-js';

const KINDS = ['animals', 'poultry', 'weights', 'health', 'events', 'finance', 'production', 'feed'];

export default async function handler(req: any, res: any) {
  try { return await run(req, res); } catch (e: any) { return res.status(500).json({ error: String(e?.message || e) }); }
}

async function run(req: any, res: any) {
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
  const range = Array.from({ length: 90 }, (_, i) => new Date(Date.now() - (89 - i) * 86400000).toISOString().slice(0, 10));
  const signupMap: Record<string, number> = {};
  users.forEach(u => { const d = String(u.firstSeen).slice(0, 10); signupMap[d] = (signupMap[d] || 0) + 1; });
  const signupsByDay = range.map(date => ({ date, count: signupMap[date] || 0 }));
  const usersBeforeRange = users.filter(u => String(u.firstSeen).slice(0, 10) < range[0]).length;
  const { data: rows } = await sb.from('activity').select('email,section,created_at').gte('created_at', range[0] + 'T00:00:00Z').limit(10000);
  const activeMap: Record<string, Set<string>> = {};
  const sectionCounts: Record<string, number> = {};
  (rows || []).forEach(r => {
    const d = String(r.created_at).slice(0, 10);
    (activeMap[d] = activeMap[d] || new Set()).add(r.email || '');
    if (r.section && r.section !== 'Account') sectionCounts[r.section] = (sectionCounts[r.section] || 0) + 1;
  });
  const activeByDay = range.map(date => ({ date, count: activeMap[date]?.size || 0 }));
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (11 - i)); return d.toISOString().slice(0, 7); });
  const signupMonth: Record<string, number> = {};
  users.forEach(u => { const m = String(u.firstSeen).slice(0, 7); signupMonth[m] = (signupMonth[m] || 0) + 1; });
  const signupsByMonth = months.map(month => ({ month, count: signupMonth[month] || 0 }));
  const { data: recRows } = await sb.from('records').select('kind,created_at').gte('created_at', months[0] + '-01T00:00:00Z').limit(20000);
  const recMap: Record<string, { livestock: number; other: number }> = {};
  (recRows || []).forEach(r => {
    const m = String(r.created_at).slice(0, 7);
    const e = (recMap[m] = recMap[m] || { livestock: 0, other: 0 });
    if (r.kind === 'animals' || r.kind === 'poultry') e.livestock += 1; else e.other += 1;
  });
  const recordsByMonth = months.map(month => ({ month, livestock: recMap[month]?.livestock || 0, other: recMap[month]?.other || 0 }));
  const recordCounts: Record<string, number> = {};
  for (const k of KINDS) {
    const { count } = await sb.from('records').select('*', { count: 'exact', head: true }).eq('kind', k);
    recordCounts[k] = count || 0;
  }
  const { count: totalActivity } = await sb.from('activity').select('*', { count: 'exact', head: true });
  return res.json({
    users: users.length,
    activeToday: users.filter(u => String(u.lastSeen).slice(0, 10) === today).length,
    totalActivity: totalActivity || 0,
    recordCounts, recentActivity: activity,
    signupsByDay, usersBeforeRange, activeByDay, sectionCounts,
    signupsByMonth, recordsByMonth,
    totalRecords: Object.values(recordCounts).reduce((t, n) => t + n, 0),
  });
}
