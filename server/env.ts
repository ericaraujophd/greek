/**
 * env.ts: read settings from the `.env` file (on your Mac) or from the
 * host's environment (in production).
 *
 * Every setting the server uses is listed in `Env` below, with what it is
 * for. `.env.example` in the repo root has the same list to copy from.
 * `.env` itself is git-ignored: it holds secrets.
 */
import { existsSync, readFileSync } from 'node:fs';

export interface Env {
  /** Neon connection string, or "pglite" for an in-memory database. */
  DATABASE_URL: string;
  /** Long random string used to sign session tokens. Change it = everyone signs in again. */
  SESSION_SECRET: string;
  /** OAuth client id from Google Cloud ("...apps.googleusercontent.com"). Empty = Google sign-in off. */
  GOOGLE_CLIENT_ID: string;
  /** Only emails at this domain can sign in. */
  ALLOWED_DOMAIN: string;
  /** Comma-separated emails that are always admins (and always allowed in). */
  ADMIN_EMAILS: string;
  /** "1" = show the "developer sign-in" (type an invited email, no Google). NEVER in production. */
  DEV_LOGIN: string;
  /** Where the website runs, for CORS. Comma-separated if several. */
  WEB_ORIGIN: string;
  /** Port for the local API server. */
  PORT: string;
}

const DEFAULTS: Env = {
  DATABASE_URL: 'pglite',
  SESSION_SECRET: '',
  GOOGLE_CLIENT_ID: '',
  ALLOWED_DOMAIN: 'calvinseminary.edu',
  ADMIN_EMAILS: '',
  DEV_LOGIN: '0',
  WEB_ORIGIN: 'http://localhost:5173',
  PORT: '8787',
};

/** Minimal .env parser: KEY=value lines, # comments, optional quotes. */
function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function loadEnv(path = '.env'): Env {
  const file = existsSync(path) ? parseDotEnv(readFileSync(path, 'utf8')) : {};
  const merged = { ...DEFAULTS } as Record<string, string>;
  for (const key of Object.keys(DEFAULTS)) merged[key] = process.env[key] ?? file[key] ?? merged[key];
  const env = merged as unknown as Env;
  if (!env.SESSION_SECRET) {
    if (env.DEV_LOGIN === '1') env.SESSION_SECRET = 'dev-only-secret-change-me';
    else throw new Error('SESSION_SECRET is not set. Put a long random string in .env.');
  }
  return env;
}
