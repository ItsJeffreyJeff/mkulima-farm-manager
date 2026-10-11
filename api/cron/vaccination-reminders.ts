import { createClient } from '@supabase/supabase-js';

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c);

// Runs daily at 06:00 UTC (9:00 AM Nairobi), see vercel.json
export default async function handler(req: any, res: any) {
  if (process.env.CRON_SECRET && req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return res.json({ skipped: true, reason: 'Email service not configured.' });
  const sb = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const [{ data: health }, { data: animals }, { data: logs }] = await Promise.all([
    sb.from('records').select('id,user_id,data').eq('kind', 'health').limit(5000),
    sb.from('records').select('id,user_id,data').eq('kind', 'animals').limit(5000),
    sb.from('reminder_logs').select('key').limit(10000),
  ]);
  const done = new Set((logs || []).map(l => l.key));
  const today = new Date().toISOString().slice(0, 10);
  const emails: Record<string, string> = {};
  let sent = 0;
  for (const rec of health || []) {
    const r: any = rec.data;
    if (String(r.type || '').toLowerCase() !== 'vaccination' || !r.nextDue || r.emailReminders === false) continue;
    const due = String(r.nextDue).slice(0, 10);
    const days = Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
    if (days !== 3 && days !== 0) continue;
    const key = rec.id + ':' + due + ':' + days;
    if (done.has(key)) continue;
    if (!emails[rec.user_id]) emails[rec.user_id] = (await sb.auth.admin.getUserById(rec.user_id)).data.user?.email || '';
    const to = String(r.reminderEmail || emails[rec.user_id] || '').trim();
    if (!to) continue;
    const a: any = (animals || []).find(x => x.id === r.animalId && x.user_id === rec.user_id)?.data;
    const label = a ? [a.name, a.tag, a.species].filter(Boolean).join(' · ') : 'your animal';
    const subject = days === 0 ? 'Vaccination due today - Mkulima Farm Manager' : 'Vaccination reminder - due in 3 days';
    const html = '<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Vaccination reminder</h2><p>A vaccination for <strong>' + esc(label) + '</strong> is due ' + (days === 0 ? 'today' : 'in 3 days') + '.</p><p><strong>Vaccine:</strong> ' + esc(String(r.vaccine || 'Vaccination')) + '<br/><strong>Due date:</strong> ' + esc(due) + '</p><p>Open Mkulima Farm Manager to review the health record.</p></div>';
    const resp = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
    if (!resp.ok) continue;
    await sb.from('reminder_logs').insert({ key });
    sent += 1;
  }
  return res.json({ sent });
}
