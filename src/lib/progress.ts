/**
 * progress.ts: the signed-in student's data, kept in memory while the app
 * is open, loaded from the server once at sign-in and updated as they work.
 *
 * Screens read from here synchronously (fast, no spinners), and every change
 * is written both here and to the server (answers and cards through the
 * offline-safe outbox in api.ts; notes, checklists and scores directly).
 */
import { api, queueAnswer, queueCard } from './api';
import { newCard, review, type Grade, type StoredCard } from './srs';
import { UNITS, type Unit } from '../content/units';

export interface User { id: string; email: string; name: string; role: 'student' | 'admin' }
interface ItemStat { item_id: string; seen: number; correct: number; misses7: number }

interface State {
  user: User | null;
  cards: Map<string, StoredCard>;
  items: Map<string, ItemStat>;
  days: Map<string, number>;
  week: { seen: number; correct: number };
  best: Map<string, { best: number; attempts: number }>;
  latest: Map<string, { correct: number; total: number; detail: any; taken_at: string }>;
  notes: Map<string, string>;
  checklists: Map<string, Record<string, string | boolean>>;
  status: Map<string, 'draft' | 'checked'>;
}

export const state: State = {
  user: null, cards: new Map(), items: new Map(), days: new Map(), week: { seen: 0, correct: 0 },
  best: new Map(), latest: new Map(), notes: new Map(), checklists: new Map(), status: new Map(),
};

/** Load everything for the signed-in user. Called once after sign-in or reload. */
export async function loadAll(): Promise<void> {
  const [me, cards, stats, scores, notes, prog, status] = await Promise.all([
    api('GET', '/api/me'), api('GET', '/api/cards'), api('GET', '/api/stats'), api('GET', '/api/scores'),
    api('GET', '/api/notes'), api('GET', '/api/unit-progress'), api('GET', '/api/content-status'),
  ]);
  state.user = me.user;
  state.cards = new Map(cards.cards.map((c: any) => [c.card_id, c.data]));
  state.items = new Map(stats.items.map((i: ItemStat) => [i.item_id, i]));
  state.days = new Map(stats.days.map((d: any) => [d.day, d.answers]));
  state.week = stats.week ?? { seen: 0, correct: 0 };
  state.best = new Map(scores.best.map((b: any) => [b.check_id, { best: b.best, attempts: b.attempts }]));
  state.latest = new Map(scores.latest.map((l: any) => [l.check_id, l]));
  state.notes = new Map(notes.notes.map((n: any) => [n.unit_id, n.body]));
  state.checklists = new Map(prog.progress.map((p: any) => [p.unit_id, p.checklist]));
  state.status = new Map(status.status.map((s: any) => [`${s.unit_id}:${s.part}`, s.status]));
}

export function isAdmin(): boolean {
  return state.user?.role === 'admin';
}

/* ------------------------------ answers & cards ------------------------------ */

/** Record one answer, here and on the server. */
export function recordAnswer(itemId: string, drill: string, correct: boolean, given?: string): void {
  const s = state.items.get(itemId) ?? { item_id: itemId, seen: 0, correct: 0, misses7: 0 };
  s.seen++;
  if (correct) s.correct++; else s.misses7++;
  state.items.set(itemId, s);
  const today = localDay(new Date());
  state.days.set(today, (state.days.get(today) ?? 0) + 1);
  state.week.seen++;
  if (correct) state.week.correct++;
  queueAnswer({ item_id: itemId, drill, correct, given });
}

/** A card's schedule, or a fresh one. */
export function cardOf(id: string): StoredCard {
  return state.cards.get(id) ?? newCard();
}

/** Rate a flashcard and save its new schedule. */
export function rateCard(id: string, grade: Grade): StoredCard {
  const next = review(cardOf(id), grade);
  state.cards.set(id, next);
  queueCard(id, next);
  return next;
}

/** How much to favour an item in drills: more after misses, less when solid. */
export function weightOf(itemId: string): number {
  const s = state.items.get(itemId);
  if (!s || s.seen < 2) return 2;
  return 1 + 3 * (1 - s.correct / s.seen) + Math.min(s.misses7, 3);
}

/* ------------------------------ units ------------------------------ */

/** A unit counts as started once its page has been opened. */
export function isStarted(unitId: string): boolean {
  return state.checklists.has(unitId);
}

export async function markStarted(unitId: string): Promise<void> {
  if (isStarted(unitId)) return;
  state.checklists.set(unitId, {});
  await api('PUT', `/api/unit-progress/${unitId}`, { checklist: {} });
}

export async function setChecklist(unitId: string, checklist: Record<string, string | boolean>): Promise<void> {
  state.checklists.set(unitId, checklist);
  await api('PUT', `/api/unit-progress/${unitId}`, { checklist });
}

export async function saveNote(unitId: string, body: string): Promise<void> {
  state.notes.set(unitId, body);
  await api('PUT', `/api/notes/${unitId}`, { body });
}

export async function saveScore(checkId: string, correct: number, total: number, detail: unknown): Promise<void> {
  await api('POST', '/api/scores', { check_id: checkId, correct, total, detail });
  const pct = Math.round((100 * correct) / Math.max(total, 1));
  const prev = state.best.get(checkId);
  state.best.set(checkId, { best: Math.max(prev?.best ?? 0, pct), attempts: (prev?.attempts ?? 0) + 1 });
  state.latest.set(checkId, { correct, total, detail, taken_at: new Date().toISOString() });
}

/**
 * The unit to work on next ("You are here" on the course map):
 *   - the furthest unit you have opened, while it has no practice-check
 *     score yet (you are in the middle of it);
 *   - otherwise the next drafted unit after it;
 *   - for a new student, unit 1.
 * Units are self-paced, so this follows what you actually opened rather
 * than the class calendar.
 */
export function currentUnit(): Unit {
  const drafted = UNITS.filter((u) => u.drafted);
  const opened = UNITS.filter((u) => isStarted(u.id));
  const furthest = opened[opened.length - 1];
  if (!furthest) return drafted[0];
  if (!state.best.has(furthest.id)) return furthest;
  return drafted.find((u) => u.n > furthest.n) ?? furthest;
}

/** Content parts students may see: checked, or anything for admins. */
export function contentVisible(unitId: string, part: 'ideas' | 'words' | 'check'): boolean {
  return isAdmin() || state.status.get(`${unitId}:${part}`) === 'checked';
}

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
