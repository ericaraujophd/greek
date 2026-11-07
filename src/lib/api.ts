/**
 * api.ts: every call from the website to the server goes through here.
 *
 * WHERE THE SERVER IS
 *   VITE_API_URL at build time (see .env.example). On your Mac it is
 *   http://localhost:8787. In production it will be the server's address.
 *
 * THE SESSION TOKEN
 *   After sign-in the server returns a token; we keep it in localStorage and
 *   send it as "Authorization: Bearer ..." on every call. If the server says
 *   401 (expired or access removed), we forget it and show the sign-in page.
 *
 * OFFLINE ANSWERS
 *   Answers and card updates made while offline are queued in localStorage
 *   and sent when the connection is back, so a session on the bus is not lost.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';

const TOKEN_KEY = 'greek.session';
const QUEUE_KEY = 'greek.outbox';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null): void {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Called when the server rejects our session; main.ts sends the user to sign-in. */
let onUnauthorized: () => void = () => {};
export function setOnUnauthorized(fn: () => void): void { onUnauthorized = fn; }

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken(null);
    onUnauthorized();
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Server error ${res.status}`);
  return data as T;
}

/* ------------------------------ outbox ------------------------------ */

interface Outbox { answers: unknown[]; cards: Record<string, unknown> }

function readOutbox(): Outbox {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '') as Outbox; } catch { return { answers: [], cards: {} }; }
}
function writeOutbox(o: Outbox): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(o)); } catch { /* ignore */ }
}

/** Queue an answer (sent in batches by flush()). */
export function queueAnswer(a: { item_id: string; drill: string; correct: boolean; given?: string }): void {
  const o = readOutbox();
  o.answers.push({ ...a, at: new Date().toISOString() });
  writeOutbox(o);
  scheduleFlush();
}

/** Queue a card update; only the latest version of each card is kept. */
export function queueCard(card_id: string, data: unknown): void {
  const o = readOutbox();
  o.cards[card_id] = data;
  writeOutbox(o);
  scheduleFlush();
}

let timer: number | undefined;
function scheduleFlush(): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => void flush(), 1500);
}

/** Send everything queued. Safe to call any time; failures stay queued. */
export async function flush(): Promise<void> {
  const o = readOutbox();
  if (!o.answers.length && !Object.keys(o.cards).length) return;
  writeOutbox({ answers: [], cards: {} });
  try {
    if (o.answers.length) await api('POST', '/api/answers', { answers: o.answers });
    const cards = Object.entries(o.cards).map(([card_id, data]) => ({ card_id, data }));
    if (cards.length) await api('PUT', '/api/cards', { cards });
  } catch {
    // Put them back (merged with anything queued meanwhile) and retry later.
    const now = readOutbox();
    writeOutbox({ answers: [...o.answers, ...now.answers], cards: { ...o.cards, ...now.cards } });
  }
}

window.addEventListener('online', () => void flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
