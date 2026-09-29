/**
 * settings.ts: per-device settings. These stay in THIS browser only and are
 * never written to GitHub.
 *
 * The important one is the GitHub token. It is a password-equivalent, so:
 *   - it is never in the source code or the public repo,
 *   - it is typed once per device on the Settings page,
 *   - it should be a *fine-grained* token limited to the one private
 *     progress repo, with "Contents: read and write" and nothing else.
 *     If a device is lost, revoke the token on github.com and make a new one;
 *     the worst it can do is edit progress.json.
 */

export interface Settings {
  /** GitHub account that owns the progress repo, e.g. "ericaraujo". */
  owner: string;
  /** Private repo that holds progress.json. */
  repo: string;
  /** Fine-grained personal access token (Contents: read/write on `repo` only). */
  token: string;
  /** How many new flashcards may be introduced per day. */
  newPerDay: number;
}

const KEY = 'greek.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  owner: 'ericaraujophd',
  repo: 'greek-progress',
  token: '',
  // 18 = one batch of six letters x three cards: one new batch per session.
  newPerDay: 18,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Sync is possible only once all three GitHub fields are filled in. */
export function syncConfigured(s = getSettings()): boolean {
  return Boolean(s.owner && s.repo && s.token);
}
