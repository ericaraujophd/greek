/**
 * index.ts: start the API on your Mac.
 *
 *   npm run dev      starts this (port 8787) AND the website (port 5173)
 *   npm run api      starts only this
 *
 * On start it reads .env, connects to the database, applies any pending
 * migrations, and listens. Edit any server file and tsx restarts it.
 */
import { serve } from '@hono/node-server';
import { loadEnv } from './env';
import { connect } from './db';
import { migrate } from './migrate';
import { createApp } from './app';

const env = loadEnv();
const db = await connect(env.DATABASE_URL);
await migrate(db, (s) => console.log('[migrate]', s));

if (env.DATABASE_URL === 'pglite') {
  console.log('[db] using the in-memory database: data disappears when the server stops.');
}
if (env.DEV_LOGIN === '1') {
  console.log('[auth] developer sign-in is ON (never enable this in production).');
}

serve({ fetch: createApp(db, env).fetch, port: Number(env.PORT) }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
