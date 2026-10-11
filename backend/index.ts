import { router, json, error, db, requireAuth, requireAdminEmailAllowlist, secrets } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['jeffreyoduma@gmail.com'];
const TABLES = ['animals', 'poultry', 'weights', 'health', 'events', 'finance', 'production', 'feed'];

async function listTable(table: string) {
  const result = await db.list(table, { limit: 1000 });
  return result.items;
}
async function logActivity(user: any, action: string, section: string, details = '') {
  await db.add('activity', [{ userId: user.userId, email: user.email || '', name: user.name || '', action, section, details, timestamp: new Date().toISOString() }]);
}
async function touchUser(user: any) {
  const users = await listTable('users');
  const existing = users.find((x: any) => x.userId === user.userId);
  const record = { userId: user.userId, email: user.email || '', name: user.name || '', lastSeen: new Date().toISOString(), firstSeen: existing?.firstSeen || new Date().toISOString(), role: (user.email || '').toLowerCase() === ADMIN_EMAILS[0] ? 'admin' : 'user' };
  if (existing) await db.update('users', [{ id: existing.id, record: { ...existing, ...record } }]);
  else await db.add('users', [record]);
}
async function ownedItems(table: string, user: any) {
  const items = await listTable(table);
  const isAdmin = (user.email || '').toLowerCase() === ADMIN_EMAILS[0];
  const visible = [];
  for (const item of items) {
    if (item.userId === user.userId) visible.push(item);
    else if (isAdmin && !item.userId) {
      const [ok] = await db.update(table, [{ id: item.id, record: { ...item, userId: user.userId } }]);
      if (ok) visible.push({ ...item, userId: user.userId });
    }
  }
  return visible;
}
async function addOwned(table: string, body: unknown, user: any, section: string) {
  const record = { ...(body as Record<string, unknown>), userId: user.userId };
  const [id] = await db.add(table, [record]);
  if (!id) return error('Save failed', 500);
  await logActivity(user, 'Created record', section, String((record as any).tag || (record as any).batch || (record as any).type || 'New record'));
  return json({ id });
}
async function updateOwned(table: string, id: string, body: unknown, user: any, section: string) {
  const [old] = await db.get(table, [id]);
  if (!old || old.userId !== user.userId) return error('Record not found', 404);
  const [ok] = await db.update(table, [{ id, record: { ...old, ...(body as Record<string, unknown>), userId: user.userId } }]);
  if (!ok) return error('Update failed', 500);
  await logActivity(user, 'Updated record', section, id);
  return json({ ok: true });
}
async function deleteOwned(table: string, id: string, user: any, section: string) {
  const [old] = await db.get(table, [id]);
  if (!old || old.userId !== user.userId) return error('Record not found', 404);
  const [ok] = await db.delete(table, [id]);
  if (!ok) return error('Delete failed', 500);
  await logActivity(user, 'Deleted record', section, id);
  return json({ ok: true });
}
function protectedRoute(handler: (ctx: any) => Promise<any>) {
  return [requireAuth(), async (ctx: any) => { await touchUser(ctx.user); return handler(ctx); }];
}
function adminRoute(handler: (ctx: any) => Promise<any>) {
  return [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async (ctx: any) => { await touchUser(ctx.user); return handler(ctx); }];
}

/** Sends vaccination reminders at 9:00 AM Africa/Nairobi. */
export async function vaccinationReminderHandler(event: { type: 'cron'; name: string; invocationId: string; scheduledTime: string; invokedTime: string }) {
  const names = await secrets.listSecretNames();
  if (!names.includes('RESEND_API_KEY') || !names.includes('RESEND_FROM_EMAIL')) {
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'Email service not configured.' }) };
  }
  const apiKey = await secrets.readSecret('RESEND_API_KEY');
  const from = await secrets.readSecret('RESEND_FROM_EMAIL');
  const [healthResult, animalResult, usersResult, logsResult] = await Promise.all([
    db.list('health', { limit: 500 }),
    db.list('animals', { limit: 500 }),
    db.list('users', { limit: 500 }),
    db.list('vaccination_reminder_logs', { limit: 500 })
  ]);
  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;
  for (const record of healthResult.items) {
    if (String(record.type || '').toLowerCase() !== 'vaccination' || !record.nextDue || record.emailReminders === false) continue;
    const due = String(record.nextDue).slice(0, 10);
    const daysUntil = Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
    if (daysUntil !== 3 && daysUntil !== 0) continue;
    const owner = usersResult.items.find((u: any) => u.userId === record.userId);
    const to = String(record.reminderEmail || owner?.email || '').trim();
    if (!to) continue;
    const reminderKey = String(record.id) + ':' + due + ':' + daysUntil;
    if (logsResult.items.some((x: any) => x.reminderKey === reminderKey)) continue;
    const animal = animalResult.items.find((a: any) => a.id === record.animalId && a.userId === record.userId);
    const animalLabel = animal ? [animal.name, animal.tag, animal.species].filter(Boolean).join(' · ') : 'your animal';
    const when = daysUntil === 0 ? 'today' : 'in 3 days';
    const subject = daysUntil === 0 ? 'Vaccination due today - Mkulima Farm Manager' : 'Vaccination reminder - due in 3 days';
    const html = '<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Vaccination reminder</h2><p>A vaccination for <strong>' + escapeHtml(String(animalLabel)) + '</strong> is due ' + when + '.</p><p><strong>Vaccine:</strong> ' + escapeHtml(String(record.vaccine || 'Vaccination')) + '<br/><strong>Due date:</strong> ' + escapeHtml(due) + '</p><p>Open Mkulima Farm Manager to review the health record.</p></div>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    if (!response.ok) continue;
    const [logId] = await db.add('vaccination_reminder_logs', [{ reminderKey, healthRecordId: record.id, userId: record.userId, sentTo: to, dueDate: due, daysBefore: daysUntil, sentAt: new Date().toISOString() }]);
    if (logId) sent += 1;
  }
  return { statusCode: 200, body: JSON.stringify({ sent }) };
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

export const handler = router({
  'GET /api/me': protectedRoute(async ({ user }) => {
    await logActivity(user, 'Signed in / opened app', 'Account');
    return json({ user: { userId: user.userId, email: user.email || '', name: user.name || '', role: (user.email || '').toLowerCase() === ADMIN_EMAILS[0] ? 'admin' : 'user' } });
  }),
  'GET /api/animals': protectedRoute(async ({ user }) => json({ items: await ownedItems('animals', user) })),
  'POST /api/animals': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.tag || !x.breed || (x.origin === 'Farm Born' && !x.dob) || (x.origin === 'Purchased' && !(Number(x.purchasePrice) > 0))) return error('Check required animal fields.', 400);
    return addOwned('animals', x, user, 'Livestock');
  }),
  'PUT /api/animals/:id': protectedRoute(async ({ params, body, user }) => updateOwned('animals', params.id, body, user, 'Livestock')),
  'DELETE /api/animals/:id': protectedRoute(async ({ params, user }) => deleteOwned('animals', params.id, user, 'Livestock')),
  'GET /api/poultry': protectedRoute(async ({ user }) => json({ items: await ownedItems('poultry', user) })),
  'POST /api/poultry': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.batch || !x.hatchDate || !x.breed || !(Number(x.initialBirds) > 0)) return error('Batch, hatching date, breed and number of birds are required.', 400);
    return addOwned('poultry', x, user, 'Poultry');
  }),
  'PUT /api/poultry/:id': protectedRoute(async ({ params, body, user }) => updateOwned('poultry', params.id, body, user, 'Poultry')),
  'DELETE /api/poultry/:id': protectedRoute(async ({ params, user }) => deleteOwned('poultry', params.id, user, 'Poultry')),
  'GET /api/weights': protectedRoute(async ({ user }) => json({ items: await ownedItems('weights', user) })),
  'POST /api/weights': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.animalId || !x.date || !x.weight) return error('Animal, date and weight are required.', 400);
    return addOwned('weights', x, user, 'Weights');
  }),
  'GET /api/health': protectedRoute(async ({ user }) => json({ items: await ownedItems('health', user) })),
  'PUT /api/health/:id': protectedRoute(async ({ params, body, user }) => updateOwned('health', params.id, body, user, 'Health')),
  'DELETE /api/health/:id': protectedRoute(async ({ params, user }) => deleteOwned('health', params.id, user, 'Health')),
  'POST /api/health': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.animalId || !x.date || !x.type) return error('Animal, date and type are required.', 400);
    if (x.type === 'Vaccination' && x.nextDue && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.nextDue))) return error('Enter a valid next vaccination date.', 400);
    return addOwned('health', x, user, 'Health');
  }),
  'GET /api/events': protectedRoute(async ({ user }) => json({ items: await ownedItems('events', user) })),
  'POST /api/events': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.animalId || !x.date || !x.type) return error('Animal, date and event type are required.', 400);
    return addOwned('events', x, user, 'Events');
  }),
  'GET /api/finance': protectedRoute(async ({ user }) => json({ items: await ownedItems('finance', user) })),
  'POST /api/finance': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.date || !x.type || !x.category || !x.description || !x.amount) return error('Required financial fields are missing.', 400);
    return addOwned('finance', x, user, 'Finances');
  }),
  'PUT /api/weights/:id': protectedRoute(async ({ params, body, user }) => updateOwned('weights', params.id, body, user, 'Weights')),
  'DELETE /api/weights/:id': protectedRoute(async ({ params, user }) => deleteOwned('weights', params.id, user, 'Weights')),
  'PUT /api/events/:id': protectedRoute(async ({ params, body, user }) => updateOwned('events', params.id, body, user, 'Events')),
  'DELETE /api/events/:id': protectedRoute(async ({ params, user }) => deleteOwned('events', params.id, user, 'Events')),
  'PUT /api/finance/:id': protectedRoute(async ({ params, body, user }) => updateOwned('finance', params.id, body, user, 'Finances')),
  'DELETE /api/finance/:id': protectedRoute(async ({ params, user }) => deleteOwned('finance', params.id, user, 'Finances')),
  'GET /api/production': protectedRoute(async ({ user }) => json({ items: await ownedItems('production', user) })),
  'POST /api/production': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.date || !x.type || !(Number(x.quantity) > 0)) return error('Date, type and a quantity above zero are required.', 400);
    return addOwned('production', x, user, 'Production');
  }),
  'PUT /api/production/:id': protectedRoute(async ({ params, body, user }) => updateOwned('production', params.id, body, user, 'Production')),
  'DELETE /api/production/:id': protectedRoute(async ({ params, user }) => deleteOwned('production', params.id, user, 'Production')),
  'GET /api/feed': protectedRoute(async ({ user }) => json({ items: await ownedItems('feed', user) })),
  'POST /api/feed': protectedRoute(async ({ body, user }) => {
    const x = body as Record<string, unknown>;
    if (!x.date || !x.feedType || !(Number(x.quantity) > 0)) return error('Date, feed type and a quantity above zero are required.', 400);
    return addOwned('feed', x, user, 'Feed');
  }),
  'PUT /api/feed/:id': protectedRoute(async ({ params, body, user }) => updateOwned('feed', params.id, body, user, 'Feed')),
  'DELETE /api/feed/:id': protectedRoute(async ({ params, user }) => deleteOwned('feed', params.id, user, 'Feed')),
  'GET /api/admin/overview': adminRoute(async () => {
    const users = await listTable('users');
    const activity = await listTable('activity');
    const recent = activity.sort((a: any, b: any) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 100);
    const counts: Record<string, number> = {};
    for (const table of TABLES) counts[table] = (await listTable(table)).length;
    return json({ users: users.length, activeToday: users.filter((x: any) => String(x.lastSeen || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length, totalActivity: activity.length, recordCounts: counts, recentActivity: recent.map((x: any) => ({ email: x.email, name: x.name, action: x.action, section: x.section, details: x.details, timestamp: x.timestamp })) });
  }),
  'GET /api/admin/users': adminRoute(async () => {
    const users = await listTable('users');
    return json({ items: users.sort((a: any, b: any) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))).slice(0, 100).map((x: any) => ({ email: x.email, name: x.name, role: x.role, firstSeen: x.firstSeen, lastSeen: x.lastSeen })) });
  }),
  'GET /api/admin/activity': adminRoute(async () => {
    const activity = await listTable('activity');
    return json({ items: activity.sort((a: any, b: any) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))).slice(0, 100).map((x: any) => ({ email: x.email, name: x.name, action: x.action, section: x.section, details: x.details, timestamp: x.timestamp })) });
  }),
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })]
});