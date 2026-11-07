/**
 * app.ts: every API endpoint, as one Hono app.
 *
 * Hono is a small web framework that runs the same code on Node (your Mac,
 * via server/index.ts) and on serverless hosts such as Cloudflare Workers
 * (later, for production). Nothing in this file is Node-specific.
 *
 * MAP OF THE API (all JSON; all but /api/health, /api/config and
 * /api/auth/* need "Authorization: Bearer <session token>")
 *
 *   GET  /api/config                     what the sign-in page needs to know
 *   POST /api/auth/google                {credential} -> {token, user}
 *   POST /api/auth/dev                   {email} -> {token, user}   (DEV_LOGIN=1 only)
 *   GET  /api/me                         the signed-in user
 *
 *   GET  /api/cards                      all my flashcard schedules
 *   PUT  /api/cards                      {cards:[{card_id,data,due}]} upsert, batch
 *   POST /api/answers                    {answers:[{item_id,drill,correct,given}]}
 *   GET  /api/stats                      my accuracy per item + study days
 *   GET  /api/notes                      my notes, all units
 *   PUT  /api/notes/:unit                {body}
 *   GET  /api/unit-progress              my checklists, all units
 *   PUT  /api/unit-progress/:unit        {checklist}
 *   GET  /api/scores                     best and latest attempt per check
 *   POST /api/scores                     {check_id, correct, total, detail}
 *   GET  /api/content-status             which drafted content is checked
 *
 *   Admin only:
 *   GET  /api/admin/summary              counts for the top of the page
 *   GET  /api/admin/students             one row per student
 *   GET  /api/admin/invitations          the invitation list
 *   POST /api/admin/invitations          {emails:"a@x, b@x"} add
 *   POST /api/admin/invitations/revoke   {email}
 *   PUT  /api/admin/users/:id/role       {role}
 *   PUT  /api/admin/content-status       {unit_id, part, status}
 */
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import type { Db } from './db';
import type { Env } from './env';
import {
  AuthError, adminEmails, isAllowed, issueSession, readSession, upsertUser, verifyGoogleToken, type User,
} from './auth';

type Vars = { user: User };

export function createApp(db: Db, env: Env) {
  const app = new Hono<{ Variables: Vars }>();

  app.use('/api/*', cors({
    origin: env.WEB_ORIGIN.split(',').map((s) => s.trim()),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }));

  // Turn our own AuthError into a clean 401/403; anything else is a 500 with
  // a generic message (the details go to the server log, not the browser).
  app.onError((err, c) => {
    if (err instanceof AuthError) return c.json({ error: err.message }, 403);
    console.error(err);
    return c.json({ error: 'Something went wrong on the server.' }, 500);
  });

  /* ------------------------------ public ------------------------------ */

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.get('/api/config', (c) => c.json({
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    devLogin: env.DEV_LOGIN === '1',
    allowedDomain: env.ALLOWED_DOMAIN,
  }));

  async function signIn(c: Context, email: string, name: string) {
    if (!(await isAllowed(db, env, email))) {
      throw new AuthError("This account hasn't been invited yet. Ask Eric for an invitation, or sign in with the address it was sent to.");
    }
    const user = await upsertUser(db, env, email, name);
    return c.json({ token: await issueSession(user, env), user });
  }

  app.post('/api/auth/google', async (c) => {
    if (!env.GOOGLE_CLIENT_ID) throw new AuthError('Google sign-in is not configured on this server.');
    const { credential } = await c.req.json<{ credential: string }>();
    let identity;
    try {
      identity = await verifyGoogleToken(credential, env);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError('Google sign-in could not be verified. Please try again.');
    }
    return signIn(c, identity.email, identity.name);
  });

  app.post('/api/auth/dev', async (c) => {
    if (env.DEV_LOGIN !== '1') return c.json({ error: 'Not available.' }, 404);
    const { email } = await c.req.json<{ email: string }>();
    const clean = String(email ?? '').trim().toLowerCase();
    if (!clean.endsWith('@' + env.ALLOWED_DOMAIN)) throw new AuthError(`Only @${env.ALLOWED_DOMAIN} accounts can sign in.`);
    return signIn(c, clean, clean.split('@')[0]);
  });

  /* ------------------------------ signed in ------------------------------ */

  /**
   * requireUser: read the Bearer token, load the user, and re-check that
   * they are still allowed (a revoked invitation locks them out at once,
   * even with a valid token).
   */
  async function requireUser(c: Context<{ Variables: Vars }>, next: Next) {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return c.json({ error: 'Please sign in.' }, 401);
    let userId: string;
    try { userId = await readSession(token, env); } catch { return c.json({ error: 'Your session has expired. Please sign in again.' }, 401); }
    const rows = await db.query<User>('SELECT id, email, name, role FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user || !(await isAllowed(db, env, user.email))) return c.json({ error: 'Your access has been removed.' }, 401);
    c.set('user', user);
    await next();
  }

  async function requireAdmin(c: Context<{ Variables: Vars }>, next: Next) {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Admins only.' }, 403);
    await next();
  }

  const me = new Hono<{ Variables: Vars }>();
  me.use('*', requireUser);

  me.get('/me', async (c) => {
    const u = c.get('user');
    await db.query('UPDATE users SET last_seen_at = now() WHERE id = $1', [u.id]);
    return c.json({ user: u });
  });

  me.get('/cards', async (c) => {
    const rows = await db.query<{ card_id: string; data: unknown }>(
      'SELECT card_id, data FROM cards WHERE user_id = $1', [c.get('user').id]);
    return c.json({ cards: rows });
  });

  me.put('/cards', async (c) => {
    const { cards } = await c.req.json<{ cards: Array<{ card_id: string; data: { due: string } }> }>();
    for (const card of (cards ?? []).slice(0, 500)) {
      await db.query(
        `INSERT INTO cards (user_id, card_id, data, due, updated_at) VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (user_id, card_id) DO UPDATE SET data = EXCLUDED.data, due = EXCLUDED.due, updated_at = now()`,
        [c.get('user').id, card.card_id, JSON.stringify(card.data), card.data.due]);
    }
    return c.json({ ok: true });
  });

  me.post('/answers', async (c) => {
    const { answers } = await c.req.json<{ answers: Array<{ item_id: string; drill: string; correct: boolean; given?: string; at?: string }> }>();
    for (const a of (answers ?? []).slice(0, 500)) {
      await db.query(
        'INSERT INTO answers (user_id, item_id, drill, correct, given, created_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))',
        [c.get('user').id, a.item_id, a.drill, a.correct, a.given ?? null, a.at ?? null]);
    }
    return c.json({ ok: true });
  });

  /**
   * Stats, all computed from the answers log:
   *   items: accuracy per item over the last 120 days (drives "weak items")
   *   days:  answers per local day over the last 120 days (calendar strip)
   *   week:  accuracy over the last 7 days
   *   misses7: per item, misses in the last 7 days ("3rd miss this week")
   */
  me.get('/stats', async (c) => {
    const id = c.get('user').id;
    const items = await db.query(
      `SELECT item_id, count(*)::int AS seen, sum(CASE WHEN correct THEN 1 ELSE 0 END)::int AS correct,
              sum(CASE WHEN NOT correct AND created_at > now() - interval '7 days' THEN 1 ELSE 0 END)::int AS misses7
       FROM answers WHERE user_id = $1 AND created_at > now() - interval '120 days' GROUP BY item_id`, [id]);
    const days = await db.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, count(*)::int AS answers
       FROM answers WHERE user_id = $1 AND created_at > now() - interval '120 days' GROUP BY 1 ORDER BY 1`, [id]);
    const week = await db.query<{ seen: number; correct: number }>(
      `SELECT count(*)::int AS seen, coalesce(sum(CASE WHEN correct THEN 1 ELSE 0 END), 0)::int AS correct
       FROM answers WHERE user_id = $1 AND created_at > now() - interval '7 days'`, [id]);
    return c.json({ items, days, week: week[0] });
  });

  me.get('/notes', async (c) => c.json({
    notes: await db.query('SELECT unit_id, body, updated_at FROM notes WHERE user_id = $1', [c.get('user').id]),
  }));

  me.put('/notes/:unit', async (c) => {
    const { body } = await c.req.json<{ body: string }>();
    await db.query(
      `INSERT INTO notes (user_id, unit_id, body, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, unit_id) DO UPDATE SET body = EXCLUDED.body, updated_at = now()`,
      [c.get('user').id, c.req.param('unit'), String(body ?? '').slice(0, 20000)]);
    return c.json({ ok: true });
  });

  me.get('/unit-progress', async (c) => c.json({
    progress: await db.query('SELECT unit_id, checklist FROM unit_progress WHERE user_id = $1', [c.get('user').id]),
  }));

  me.put('/unit-progress/:unit', async (c) => {
    const { checklist } = await c.req.json<{ checklist: Record<string, string | boolean> }>();
    await db.query(
      `INSERT INTO unit_progress (user_id, unit_id, checklist, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, unit_id) DO UPDATE SET checklist = EXCLUDED.checklist, updated_at = now()`,
      [c.get('user').id, c.req.param('unit'), JSON.stringify(checklist ?? {})]);
    return c.json({ ok: true });
  });

  me.get('/scores', async (c) => {
    const id = c.get('user').id;
    const best = await db.query(
      `SELECT check_id, max(round(100.0 * correct / greatest(total, 1)))::int AS best, count(*)::int AS attempts,
              max(taken_at) AS last_at
       FROM scores WHERE user_id = $1 GROUP BY check_id`, [id]);
    const latest = await db.query(
      `SELECT DISTINCT ON (check_id) check_id, correct, total, detail, taken_at
       FROM scores WHERE user_id = $1 ORDER BY check_id, taken_at DESC`, [id]);
    return c.json({ best, latest });
  });

  me.post('/scores', async (c) => {
    const s = await c.req.json<{ check_id: string; correct: number; total: number; detail?: unknown }>();
    await db.query('INSERT INTO scores (user_id, check_id, correct, total, detail) VALUES ($1, $2, $3, $4, $5)',
      [c.get('user').id, s.check_id, s.correct | 0, s.total | 0, JSON.stringify(s.detail ?? null)]);
    return c.json({ ok: true });
  });

  me.get('/content-status', async (c) => c.json({
    status: await db.query('SELECT unit_id, part, status FROM content_status'),
  }));

  /* ------------------------------ admin ------------------------------ */

  const admin = new Hono<{ Variables: Vars }>();
  admin.use('*', requireUser, requireAdmin);

  admin.get('/summary', async (c) => {
    const [r] = await db.query<Record<string, number>>(
      `SELECT (SELECT count(*) FROM users)::int AS users,
              (SELECT count(DISTINCT user_id) FROM answers WHERE created_at > now() - interval '7 days')::int AS active7,
              (SELECT count(*) FROM invitations WHERE accepted_at IS NULL AND revoked_at IS NULL)::int AS pending,
              (SELECT count(*) FROM content_status WHERE status = 'checked')::int AS checked`);
    return c.json(r);
  });

  admin.get('/students', async (c) => c.json({
    students: await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.last_seen_at,
              (SELECT round(100.0 * avg(CASE WHEN a.correct THEN 1 ELSE 0 END))::int FROM answers a
                 WHERE a.user_id = u.id AND a.created_at > now() - interval '7 days') AS acc7,
              (SELECT max(p.unit_id) FROM unit_progress p WHERE p.user_id = u.id) AS last_unit,
              (SELECT json_object_agg(s.check_id, s.best) FROM (
                 SELECT check_id, max(round(100.0 * correct / greatest(total, 1)))::int AS best
                 FROM scores WHERE user_id = u.id AND check_id LIKE 'q%' GROUP BY check_id) s) AS quizzes
       FROM users u ORDER BY u.last_seen_at DESC`),
  }));

  admin.get('/invitations', async (c) => c.json({
    invitations: await db.query('SELECT email, invited_by, created_at, accepted_at, revoked_at FROM invitations ORDER BY created_at DESC'),
    admins: adminEmails(env),
  }));

  admin.post('/invitations', async (c) => {
    const { emails } = await c.req.json<{ emails: string }>();
    const list = String(emails ?? '').split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const bad = list.filter((e) => !e.endsWith('@' + env.ALLOWED_DOMAIN) || !/^[^@\s]+@[^@\s]+$/.test(e));
    if (bad.length) return c.json({ error: `Not @${env.ALLOWED_DOMAIN} addresses: ${bad.join(', ')}` }, 400);
    for (const email of list) {
      await db.query(
        `INSERT INTO invitations (email, invited_by) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET revoked_at = NULL`, [email, c.get('user').email]);
    }
    return c.json({ added: list.length });
  });

  admin.post('/invitations/revoke', async (c) => {
    const { email } = await c.req.json<{ email: string }>();
    await db.query('UPDATE invitations SET revoked_at = now() WHERE email = $1', [String(email).toLowerCase()]);
    return c.json({ ok: true });
  });

  admin.put('/users/:id/role', async (c) => {
    const { role } = await c.req.json<{ role: string }>();
    if (role !== 'admin' && role !== 'student') return c.json({ error: 'Bad role.' }, 400);
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, c.req.param('id')]);
    return c.json({ ok: true });
  });

  admin.put('/content-status', async (c) => {
    const { unit_id, part, status } = await c.req.json<{ unit_id: string; part: string; status: string }>();
    await db.query(
      `INSERT INTO content_status (unit_id, part, status, checked_by, updated_at) VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (unit_id, part) DO UPDATE SET status = EXCLUDED.status, checked_by = EXCLUDED.checked_by, updated_at = now()`,
      [unit_id, part, status, c.get('user').email]);
    return c.json({ ok: true });
  });

  app.route('/api', me);
  app.route('/api/admin', admin);
  return app;
}
