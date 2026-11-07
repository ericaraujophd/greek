/**
 * migrate.ts: bring a database's schema up to date.
 *
 * Every file in server/migrations/ is applied once, in file-name order, and
 * recorded in the `schema_migrations` table. To change the schema later,
 * ADD a new file (002_something.sql); never edit one that has already run
 * on a real database, because it will not run again there.
 *
 * Usage:  npm run db:migrate        (uses DATABASE_URL from .env)
 * The dev server also runs this automatically at start-up.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './db';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function migrate(db: Db, log: (s: string) => void = () => {}): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());`);
  const done = new Set((await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const dir = join(HERE, 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    log(`applying ${file}`);
    await db.exec(readFileSync(join(dir, file), 'utf8'));
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
  }
}

// Run directly: `tsx server/migrate.ts`
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  const { loadEnv } = await import('./env');
  const { connect } = await import('./db');
  const env = loadEnv();
  const db = await connect(env.DATABASE_URL);
  await migrate(db, console.log);
  console.log('database is up to date');
}
