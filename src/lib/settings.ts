/**
 * settings.ts: small per-device preferences for the alphabet drills.
 *
 * They stay in THIS browser only (localStorage). The GitHub-sync fields that
 * used to live here are gone: progress for the course now goes to the server
 * (see lib/api.ts and lib/progress.ts). The alphabet module still keeps its
 * own letter progress in this browser (lib/store.ts) until it is moved over.
 */

export interface Settings {
  /** How many new alphabet flashcards may be introduced per day. */
  newPerDay: number;
}

const KEY = 'greek.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  // 18 = one batch of six letters x three cards: one new batch per session.
  newPerDay: 18,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { newPerDay: saved.newPerDay ?? DEFAULT_SETTINGS.newPerDay };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
