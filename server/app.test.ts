/**
 * API tests against a real Postgres (PGlite, in memory). They cover the
 * rules that matter most: who can get in, that students only see their own
 * data, and that admin endpoints are closed to students.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { pgliteDb } from './db';
import { migrate } from './migrate';
import { createApp } from './app';
import type { Env } from './env';

const env: Env = {
  DATABASE_URL: 'pglite', SESSION_SECRET: 'test-secret', GOOGLE_CLIENT_ID: '', ALLOWED_DOMAIN: 'calvinseminary.edu',
  ADMIN_EMAILS: 'efer251@calvinseminary.edu', DEV_LOGIN: '1', WEB_ORIGIN: 'http://localhost:5173', PORT: '0',
};

let app: ReturnType<typeof createApp>;

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() as any };
}

async function devLogin(email: string) {
  return call('POST', '/api/auth/dev', { email });
}

beforeAll(async () => {
  const db = await pgliteDb();
  await migrate(db);
  app = createApp(db, env);
});

describe('sign-in', () => {
  it('lets the admin in without an invitation', async () => {
    const r = await devLogin('efer251@calvinseminary.edu');
    expect(r.status).toBe(200);
    expect(r.json.user.role).toBe('admin');
  });

  it('turns away an uninvited CTS address', async () => {
    const r = await devLogin('stranger@calvinseminary.edu');
    expect(r.status).toBe(403);
    expect(r.json.error).toMatch(/invited/);
  });

  it('turns away other domains', async () => {
    expect((await devLogin('someone@gmail.com')).status).toBe(403);
  });

  it('admits an invited student and locks them out when revoked', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    expect((await call('POST', '/api/admin/invitations', { emails: 'student1@calvinseminary.edu' }, admin)).status).toBe(200);
    const s = await devLogin('student1@calvinseminary.edu');
    expect(s.status).toBe(200);
    expect(s.json.user.role).toBe('student');
    expect((await call('GET', '/api/me', undefined, s.json.token)).status).toBe(200);
    await call('POST', '/api/admin/invitations/revoke', { email: 'student1@calvinseminary.edu' }, admin);
    expect((await call('GET', '/api/me', undefined, s.json.token)).status).toBe(401);
  });

  it('rejects invitations for other domains', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    expect((await call('POST', '/api/admin/invitations', { emails: 'x@gmail.com' }, admin)).status).toBe(400);
  });
});

describe('student data', () => {
  it('keeps each student to their own cards, notes and scores', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    await call('POST', '/api/admin/invitations', { emails: 'a@calvinseminary.edu, b@calvinseminary.edu' }, admin);
    const a = (await devLogin('a@calvinseminary.edu')).json.token;
    const b = (await devLogin('b@calvinseminary.edu')).json.token;

    await call('PUT', '/api/cards', { cards: [{ card_id: 'word:λόγος', data: { due: '2026-11-01T00:00:00Z', reps: 1 } }] }, a);
    await call('PUT', '/api/notes/u06', { body: 'genitive = of' }, a);
    await call('POST', '/api/scores', { check_id: 'u06', correct: 9, total: 12 }, a);
    await call('POST', '/api/answers', { answers: [{ item_id: 'form:λόγου', drill: 'review', correct: false, given: 'gen pl' }] }, a);

    expect((await call('GET', '/api/cards', undefined, a)).json.cards).toHaveLength(1);
    expect((await call('GET', '/api/cards', undefined, b)).json.cards).toHaveLength(0);
    expect((await call('GET', '/api/notes', undefined, b)).json.notes).toHaveLength(0);
    const scores = (await call('GET', '/api/scores', undefined, a)).json;
    expect(scores.best[0]).toMatchObject({ check_id: 'u06', best: 75, attempts: 1 });
    const stats = (await call('GET', '/api/stats', undefined, a)).json;
    expect(stats.items[0]).toMatchObject({ item_id: 'form:λόγου', seen: 1, correct: 0, misses7: 1 });
  });

  it('closes admin endpoints to students', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    await call('POST', '/api/admin/invitations', { emails: 'c@calvinseminary.edu' }, admin);
    const c = (await devLogin('c@calvinseminary.edu')).json.token;
    expect((await call('GET', '/api/admin/students', undefined, c)).status).toBe(403);
    expect((await call('GET', '/api/admin/students', undefined, admin)).status).toBe(200);
  });

  it('requires a session for personal data', async () => {
    expect((await call('GET', '/api/cards')).status).toBe(401);
    expect((await call('GET', '/api/cards', undefined, 'garbage')).status).toBe(401);
  });
});

describe('recorded audio', () => {
  it('admins record, everyone plays, students cannot record', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    await call('POST', '/api/admin/invitations', { emails: 'listener@calvinseminary.edu' }, admin);
    const student = (await devLogin('listener@calvinseminary.edu')).json.token;
    const key = encodeURIComponent('word:λόγος');
    const clip = { mime: 'audio/webm;codecs=opus', data: btoa('fake audio bytes') };

    expect((await call('PUT', `/api/admin/audio/${key}`, clip, student)).status).toBe(403);
    expect((await call('PUT', `/api/admin/audio/${key}`, clip, admin)).status).toBe(200);

    const list = await call('GET', '/api/audio', undefined, student);
    expect(list.json.audio.map((a: any) => a.key)).toContain('word:λόγος');
    const got = await call('GET', `/api/audio/${key}`, undefined, student);
    expect(got.json.data).toBe(clip.data);

    expect((await call('PUT', `/api/admin/audio/${encodeURIComponent('bad key')}`, clip, admin)).status).toBe(400);
    expect((await call('PUT', `/api/admin/audio/${key}`, { mime: 'text/html', data: clip.data }, admin)).status).toBe(400);
    expect((await call('DELETE', `/api/admin/audio/${key}`, undefined, admin)).status).toBe(200);
    expect((await call('GET', `/api/audio/${key}`, undefined, student)).status).toBe(404);
  });
});

describe('students recording and submitting', () => {
  it('a student records privately, submits, and the admin accepts', async () => {
    const admin = (await devLogin('efer251@calvinseminary.edu')).json.token;
    await call('POST', '/api/admin/invitations', { emails: 'reader@calvinseminary.edu, other@calvinseminary.edu' }, admin);
    const student = (await devLogin('reader@calvinseminary.edu')).json.token;
    const other = (await devLogin('other@calvinseminary.edu')).json.token;
    const key = encodeURIComponent('word:ἀγάπη');
    const clip = { mime: 'audio/mp4', data: btoa('student take') };

    expect((await call('POST', `/api/audio/mine/${key}/submit`, {}, student)).status).toBe(400); // nothing recorded yet
    expect((await call('PUT', `/api/audio/mine/${key}`, clip, student)).status).toBe(200);
    // Private: another student does not see it.
    expect((await call('GET', `/api/audio/mine/${key}`, undefined, other)).status).toBe(404);
    expect((await call('GET', `/api/audio/mine/${key}`, undefined, student)).json.data).toBe(clip.data);

    expect((await call('POST', `/api/audio/mine/${key}/submit`, {}, student)).status).toBe(200);
    const mine = await call('GET', '/api/audio/mine', undefined, student);
    expect(mine.json.mine[0]).toMatchObject({ key: 'word:ἀγάπη', submitted: 'pending' });

    // Students cannot review submissions.
    expect((await call('GET', '/api/admin/audio-submissions', undefined, student)).status).toBe(403);
    const subs = await call('GET', '/api/admin/audio-submissions', undefined, admin);
    const sub = subs.json.submissions.find((x: any) => x.key === 'word:ἀγάπη');
    expect(sub.email).toBe('reader@calvinseminary.edu');
    expect((await call('POST', `/api/admin/audio-submissions/${sub.id}/accept`, {}, admin)).status).toBe(200);

    // Now everyone hears it, credited to the student.
    const shared = await call('GET', '/api/audio', undefined, other);
    expect(shared.json.audio.find((a: any) => a.key === 'word:ἀγάπη').recorded_by).toBe('reader');
    expect((await call('GET', '/api/audio/mine', undefined, student)).json.mine[0].submitted).toBe('accepted');
  });
});
