/**
 * store.ts: all learning progress, kept in the browser and merged with the
 * copy in GitHub.
 *
 * THE DATA MODEL (this exact object is what lands in progress.json)
 * ----------------------------------------------------------------
 *   {
 *     schema: 1,
 *     cards:    { "<cardId>": StoredCard },            // flashcard schedules
 *     stats:    { "<itemId>": { "<deviceId>": {seen, correct} } },
 *     sessions: [ { id, deviceId, start, end, counts } ]
 *   }
 *
 * WHY THE SHAPES LOOK LIKE THIS: MERGING WITHOUT CONFLICTS
 * -------------------------------------------------------
 * You will study on more than one device (Mac, iPad mini, phone), sometimes
 * offline. Each device keeps its own copy and later syncs through GitHub.
 * When two copies meet, they must merge without losing work. Each part of
 * the data is designed so the merge is automatic and order does not matter:
 *
 *   cards    -> keep whichever copy of a card changed most recently
 *               (compare `updatedAt`). A card is reviewed on one device at
 *               a time in practice, so "newest wins" is correct.
 *   stats    -> counters are stored PER DEVICE. A device only ever
 *               increases its own counters, so the merge takes the larger
 *               value per device, and the total is the sum across devices.
 *               (This is a "grow-only counter", a standard CRDT.) Adding
 *               the two copies would double-count; taking the max per
 *               device never does.
 *   sessions -> each has a unique id, so the merge is a union by id.
 *
 * Settings (GitHub token, repo name) are NOT in this object and never leave
 * the device: see settings.ts.
 */
import type { StoredCard } from './srs';

export const SCHEMA_VERSION = 1;

export interface Counter { seen: number; correct: number }

export interface Session {
  id: string;
  deviceId: string;
  start: string;
  end: string;
  /** How many answers each drill recorded in this session, e.g. { speed: 40 }. */
  counts: Record<string, number>;
}

export interface Progress {
  schema: number;
  cards: Record<string, StoredCard>;
  stats: Record<string, Record<string, Counter>>;
  sessions: Session[];
}

export function emptyProgress(): Progress {
  return { schema: SCHEMA_VERSION, cards: {}, stats: {}, sessions: [] };
}

/* ------------------------------------------------------------------ */
/* Merge (pure; unit tested in store.test.ts)                           */
/* ------------------------------------------------------------------ */

export function mergeProgress(a: Progress, b: Progress): Progress {
  const out = emptyProgress();

  // Cards: newest updatedAt wins.
  for (const id of new Set([...Object.keys(a.cards), ...Object.keys(b.cards)])) {
    const ca = a.cards[id];
    const cb = b.cards[id];
    out.cards[id] = !ca ? cb : !cb ? ca : ca.updatedAt >= cb.updatedAt ? ca : cb;
  }

  // Stats: per-device maximum.
  for (const item of new Set([...Object.keys(a.stats), ...Object.keys(b.stats)])) {
    const da = a.stats[item] ?? {};
    const db = b.stats[item] ?? {};
    out.stats[item] = {};
    for (const dev of new Set([...Object.keys(da), ...Object.keys(db)])) {
      const x = da[dev] ?? { seen: 0, correct: 0 };
      const y = db[dev] ?? { seen: 0, correct: 0 };
      out.stats[item][dev] = { seen: Math.max(x.seen, y.seen), correct: Math.max(x.correct, y.correct) };
    }
  }

  // Sessions: union by id, sorted by start time.
  const byId = new Map<string, Session>();
  for (const s of [...a.sessions, ...b.sessions]) {
    const existing = byId.get(s.id);
    // The same session can be saved twice (before and after it ended);
    // keep the version with the later end time.
    if (!existing || s.end > existing.end) byId.set(s.id, s);
  }
  out.sessions = [...byId.values()].sort((x, y) => x.start.localeCompare(y.start));

  return out;
}

/** Total seen/correct for an item across all devices. */
export function totalFor(p: Progress, itemId: string): Counter {
  const perDevice = p.stats[itemId] ?? {};
  return Object.values(perDevice).reduce(
    (acc, c) => ({ seen: acc.seen + c.seen, correct: acc.correct + c.correct }),
    { seen: 0, correct: 0 },
  );
}

/* ------------------------------------------------------------------ */
/* The live store (browser)                                             */
/* ------------------------------------------------------------------ */

const KEY_PROGRESS = 'greek.progress.v1';
const KEY_DEVICE = 'greek.deviceId';
const KEY_DIRTY = 'greek.dirty';

/**
 * localStorage can throw (private browsing, storage disabled). Every access
 * goes through these two helpers so the app keeps working in memory even
 * when the browser refuses to save.
 */
function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* keep going in memory */ }
}

/** A random id for this browser, created once and kept forever. */
export function deviceId(): string {
  let id = readLocal(KEY_DEVICE);
  if (!id) {
    id = 'dev-' + crypto.randomUUID().slice(0, 8);
    writeLocal(KEY_DEVICE, id);
  }
  return id;
}

let progress: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  const raw = readLocal(KEY_PROGRESS);
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as Progress;
    return parsed.schema === SCHEMA_VERSION ? parsed : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function save(markDirty = true): void {
  writeLocal(KEY_PROGRESS, JSON.stringify(progress));
  if (markDirty) writeLocal(KEY_DIRTY, '1');
  listeners.forEach((fn) => fn());
}

/** Read-only view of the current progress. */
export function getProgress(): Progress {
  return progress;
}

/** Re-render hooks: called after every change. Returns an unsubscribe. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True when there are local changes GitHub has not seen yet. */
export function isDirty(): boolean {
  return readLocal(KEY_DIRTY) === '1';
}
export function markClean(): void {
  writeLocal(KEY_DIRTY, '0');
  listeners.forEach((fn) => fn());
}

/** Replace progress with a merged version (used by sync). */
export function replaceProgress(next: Progress, dirty: boolean): void {
  progress = next;
  save(dirty);
  if (!dirty) markClean();
}

export function getCard(id: string): StoredCard | undefined {
  return progress.cards[id];
}

export function putCard(id: string, card: StoredCard): void {
  progress.cards[id] = card;
  save();
}

/** Record one answer to a drill question about `itemId` (a letter id, a word...). */
export function recordAnswer(itemId: string, correct: boolean, drill: string): void {
  const dev = deviceId();
  progress.stats[itemId] ??= {};
  const c = (progress.stats[itemId][dev] ??= { seen: 0, correct: 0 });
  c.seen += 1;
  if (correct) c.correct += 1;
  bumpSession(drill);
  save();
}

/* ------------------------------ sessions ------------------------------ */

/**
 * A "session" is a stretch of study with no gap longer than 30 minutes.
 * It is opened on the first answer and extended by each later one, so the
 * stats page can show which days you studied without any Start/Stop button.
 */
const SESSION_GAP_MS = 30 * 60 * 1000;

function bumpSession(drill: string): void {
  const now = new Date();
  const dev = deviceId();
  const mine = progress.sessions.filter((s) => s.deviceId === dev);
  let current = mine[mine.length - 1];
  if (!current || now.getTime() - new Date(current.end).getTime() > SESSION_GAP_MS) {
    current = { id: crypto.randomUUID(), deviceId: dev, start: now.toISOString(), end: now.toISOString(), counts: {} };
    progress.sessions.push(current);
  }
  current.end = now.toISOString();
  current.counts[drill] = (current.counts[drill] ?? 0) + 1;
}

/** Answers recorded in the current session on this device (for the header). */
export function currentSessionCount(): number {
  const dev = deviceId();
  const mine = progress.sessions.filter((s) => s.deviceId === dev);
  const last = mine[mine.length - 1];
  if (!last || Date.now() - new Date(last.end).getTime() > SESSION_GAP_MS) return 0;
  return Object.values(last.counts).reduce((a, b) => a + b, 0);
}

/** Wipe everything on this device (Settings -> danger zone). */
export function resetLocal(): void {
  progress = emptyProgress();
  save(false);
  markClean();
}
