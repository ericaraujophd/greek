/**
 * sync.test.ts: runs push/pull against a fake GitHub (an in-memory file with
 * a sha), to check the three things that matter:
 *   1. Greek text survives the base64 round trip,
 *   2. a push merges another device's work instead of overwriting it,
 *   3. a stale sha (someone pushed first) is retried, not lost.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- a minimal localStorage for Node ----
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});
mem.set('greek.settings.v1', JSON.stringify({ owner: 'me', repo: 'greek-progress', token: 't', newPerDay: 18 }));

// ---- a fake GitHub Contents endpoint ----
let remote: { text: string; sha: number } | null = null;
let failNextPutWithConflict = false;
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');

vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
  if (!init?.method || init.method === 'GET') {
    if (!remote) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ content: b64(remote.text), sha: String(remote.sha) }), { status: 200 });
  }
  const body = JSON.parse(String(init.body));
  if (failNextPutWithConflict) {
    failNextPutWithConflict = false;
    // Simulate another device writing between our GET and PUT.
    const other = JSON.parse(remote!.text);
    other.stats['alpha:nu'] = { ipad: { seen: 3, correct: 3 } };
    remote = { text: JSON.stringify(other), sha: remote!.sha + 1 };
    return new Response('{"message":"conflict"}', { status: 409 });
  }
  if ((remote?.sha ?? null) !== (body.sha ? Number(body.sha) : null)) return new Response('{}', { status: 409 });
  remote = { text: unb64(body.content), sha: (remote?.sha ?? 0) + 1 };
  return new Response('{}', { status: 200 });
});

const store = await import('./store');
const sync = await import('./sync');

describe('sync', () => {
  beforeEach(() => { remote = null; store.resetLocal(); });

  it('creates the file and keeps Greek intact', async () => {
    store.recordAnswer('read:λόγος', true, 'soundout');
    await sync.push();
    expect(sync.getSyncStatus().kind).toBe('idle');
    expect(JSON.parse(remote!.text).stats['read:λόγος']).toBeDefined();
    expect(store.isDirty()).toBe(false);
  });

  it('merges another device instead of overwriting it', async () => {
    remote = { text: JSON.stringify({ schema: 1, cards: {}, sessions: [], stats: { 'alpha:eta': { ipad: { seen: 5, correct: 4 } } } }), sha: 7 };
    store.recordAnswer('alpha:nu', false, 'speed');
    await sync.push();
    const saved = JSON.parse(remote!.text);
    expect(saved.stats['alpha:eta'].ipad.seen).toBe(5);
    expect(saved.stats['alpha:nu']).toBeDefined();
  });

  it('retries after a conflict and keeps both sides', async () => {
    remote = { text: JSON.stringify({ schema: 1, cards: {}, sessions: [], stats: {} }), sha: 1 };
    store.recordAnswer('alpha:rho', true, 'speed');
    failNextPutWithConflict = true;
    await sync.push();
    const saved = JSON.parse(remote!.text);
    expect(saved.stats['alpha:rho']).toBeDefined();
    expect(saved.stats['alpha:nu'].ipad.seen).toBe(3);
  });
});
