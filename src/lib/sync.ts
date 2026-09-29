/**
 * sync.ts: keep progress.json in a private GitHub repo in step with the
 * browser, using the GitHub REST "Contents" API.
 *
 * THE FLOW
 * --------
 *   pull:  GET the file -> merge it into local progress -> save locally.
 *   push:  pull first (so we never overwrite another device's work),
 *          then PUT the merged file back with the `sha` we just read.
 *
 * WHY THE `sha` MATTERS
 *   GitHub requires the sha (version id) of the file you are replacing. If
 *   another device pushed in between, our sha is stale and GitHub answers
 *   409 or 422. We then pull again, re-merge, and retry once. Because the
 *   merge never loses data (store.ts), retrying is always safe.
 *
 * WHEN IT RUNS (chosen to keep the commit history small)
 *   - on app start: pull only (no commit),
 *   - when you press "Save to GitHub",
 *   - automatically when there are unsaved changes and 15 minutes have
 *     passed since the last push, while the app is open.
 *   A typical 30-minute session therefore makes one or two commits.
 *
 * ENCODING
 *   The API sends file contents as base64. Plain `atob`/`btoa` only handle
 *   Latin-1, and progress.json contains Greek, so we go through bytes with
 *   TextEncoder/TextDecoder.
 */
import { getProgress, isDirty, markClean, mergeProgress, replaceProgress, type Progress } from './store';
import { getSettings, syncConfigured } from './settings';

const FILE = 'progress.json';
const AUTO_PUSH_MS = 15 * 60 * 1000;

export type SyncStatus =
  | { kind: 'off' }                        // not configured
  | { kind: 'idle'; lastSync?: string }    // configured, nothing happening
  | { kind: 'busy'; what: string }
  | { kind: 'error'; message: string };

let status: SyncStatus = syncConfigured() ? { kind: 'idle' } : { kind: 'off' };
let lastPush = 0;
const listeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus { return status; }
export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(s: SyncStatus): void {
  status = s;
  listeners.forEach((fn) => fn(s));
}

/* ------------------------------ encoding ------------------------------ */

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}
function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/* ------------------------------ API calls ------------------------------ */

function apiUrl(): string {
  const s = getSettings();
  return `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/contents/${FILE}`;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getSettings().token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** Fetch the remote file. Returns null content (and null sha) if it does not exist yet. */
async function fetchRemote(): Promise<{ progress: Progress | null; sha: string | null }> {
  // `cache: 'no-store'` so the browser never hands us a stale copy.
  const res = await fetch(apiUrl(), { headers: headers(), cache: 'no-store' });
  if (res.status === 404) return { progress: null, sha: null };
  if (!res.ok) throw new Error(await explain(res));
  const body = await res.json();
  return { progress: JSON.parse(fromBase64(body.content)) as Progress, sha: body.sha };
}

async function putRemote(p: Progress, sha: string | null, message: string): Promise<Response> {
  return fetch(apiUrl(), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      message,
      // Pretty-printed with a trailing newline, so diffs on GitHub are readable.
      content: toBase64(JSON.stringify(p, null, 1) + '\n'),
      ...(sha ? { sha } : {}),
    }),
  });
}

/** Turn an HTTP error into a sentence a human can act on. */
async function explain(res: Response): Promise<string> {
  if (res.status === 401) return 'GitHub rejected the token (401). It may have expired: make a new one in Settings.';
  if (res.status === 403) return 'The token is not allowed to write to this repo (403). Check its repository access and "Contents: read and write".';
  if (res.status === 404) return 'Repo not found (404). Check the owner and repo name, and that the token can see that repo.';
  let detail = '';
  try { detail = (await res.json()).message ?? ''; } catch { /* ignore */ }
  return `GitHub error ${res.status}${detail ? `: ${detail}` : ''}`;
}

/* ------------------------------ public API ------------------------------ */

/** Pull remote changes into the browser. Safe to call any time. */
export async function pull(): Promise<void> {
  if (!syncConfigured()) return setStatus({ kind: 'off' });
  setStatus({ kind: 'busy', what: 'Loading from GitHub' });
  try {
    const { progress: remote } = await fetchRemote();
    if (remote) replaceProgress(mergeProgress(getProgress(), remote), isDirty());
    setStatus({ kind: 'idle', lastSync: new Date().toISOString() });
  } catch (e) {
    setStatus({ kind: 'error', message: messageOf(e) });
  }
}

/** Pull, merge, and write the merged result back to GitHub. */
export async function push(reason = 'Study session'): Promise<void> {
  if (!syncConfigured()) return setStatus({ kind: 'off' });
  setStatus({ kind: 'busy', what: 'Saving to GitHub' });
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { progress: remote, sha } = await fetchRemote();
      const merged = remote ? mergeProgress(getProgress(), remote) : getProgress();
      replaceProgress(merged, true);
      const res = await putRemote(merged, sha, commitMessage(reason));
      if (res.ok) {
        markClean();
        lastPush = Date.now();
        setStatus({ kind: 'idle', lastSync: new Date().toISOString() });
        return;
      }
      // 409/422 = someone else pushed first. Loop once to re-merge and retry.
      if (!(res.status === 409 || res.status === 422) || attempt === 2) throw new Error(await explain(res));
    }
  } catch (e) {
    setStatus({ kind: 'error', message: messageOf(e) });
  }
}

/** "Study session 2026-09-29: 42 answers" */
function commitMessage(reason: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const answers = getProgress().sessions
    .filter((s) => s.start.startsWith(today))
    .reduce((n, s) => n + Object.values(s.counts).reduce((a, b) => a + b, 0), 0);
  return `${reason} ${today}: ${answers} answers today`;
}

function messageOf(e: unknown): string {
  if (e instanceof TypeError) return 'Could not reach GitHub (offline?). Your progress is safe on this device and will sync later.';
  return e instanceof Error ? e.message : String(e);
}

/**
 * Start background sync: pull once now, then check every minute whether an
 * automatic push is due. Also try a push when the tab is being hidden
 * (switching apps on the iPad), since that is often the end of a session.
 */
export function startAutoSync(): void {
  void pull();
  setInterval(() => {
    if (syncConfigured() && isDirty() && Date.now() - lastPush > AUTO_PUSH_MS && status.kind !== 'busy') {
      void push('Auto-save');
    }
  }, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    // The 5-minute floor stops rapid app-switching from making a commit each time.
    if (document.visibilityState === 'hidden' && syncConfigured() && isDirty()
        && status.kind !== 'busy' && Date.now() - lastPush > 5 * 60 * 1000) {
      void push('Study session');
    }
  });
}
