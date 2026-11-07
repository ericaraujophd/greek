/**
 * db.ts: one tiny interface for talking to Postgres, with two backends.
 *
 *   neon   - the real database (Neon). Used on your Mac against the Neon
 *            "dev" branch, and in production against the main branch.
 *            Uses Neon's HTTP driver: every query is one HTTPS request, so it
 *            also works later on serverless hosts such as Cloudflare Workers.
 *   pglite - a complete Postgres compiled to WebAssembly, running inside
 *            this Node process, in memory. Used by the automated tests, and
 *            as an offline fallback (`DATABASE_URL=pglite` in .env).
 *
 * The rest of the server only ever calls `db.query(sql, params)` and never
 * knows which one it got. Always pass values as $1, $2 ... parameters, never
 * by pasting them into the SQL string: parameters cannot be used for SQL
 * injection, pasted strings can.
 */
import { neon } from '@neondatabase/serverless';

export interface Db {
  /** Run one statement and return its rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Run a script with several statements (used only by migrations). */
  exec(script: string): Promise<void>;
}

/** Neon over HTTPS. `url` is the connection string from the Neon console. */
export function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.query(text, params)) as T[];
    },
    async exec(script: string) {
      // The HTTP driver runs one statement per request, so split the script.
      // Our migrations are plain DDL (no functions with ';' inside), which
      // makes "split on ';' at the end of a line" safe.
      for (const stmt of splitStatements(script)) await sql.query(stmt, []);
    },
  };
}

/** In-memory Postgres (WebAssembly). Imported lazily so production never loads it. */
export async function pgliteDb(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async exec(script: string) {
      await pg.exec(script);
    },
  };
}

/** Pick the backend from DATABASE_URL ("pglite" or a postgres:// URL). */
export async function connect(url: string | undefined): Promise<Db> {
  if (!url || url === 'pglite') return pgliteDb();
  return neonDb(url);
}

/** Split a SQL script into statements, ignoring comment-only chunks. */
export function splitStatements(script: string): string[] {
  return script
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s.length > 0);
}
