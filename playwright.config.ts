/**
 * Playwright end-to-end test config.
 *
 * Starts two servers:
 *   - the API on port 8788 with an in-memory database (PGlite) and the
 *     developer sign-in on, so no Neon or Google account is needed;
 *   - the built website with `vite preview` on port 4173 under /greek/,
 *     pointed at that API (VITE_API_URL is baked in at build time, so run
 *     `npm run build:e2e` first, see package.json).
 * Then runs e2e/*.spec.ts in Chromium. Screenshots go to test-results/.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173/greek/',
    viewport: { width: 1200, height: 900 },
    // Optional: point at a Chromium you already have (CI machines). On a Mac,
    // leave CHROMIUM_PATH unset and run `npx playwright install chromium` once.
    // A fake microphone (a test tone) so the recording feature can be tested.
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    },
  },
  webServer: [
    {
      command: 'npx tsx server/index.ts',
      port: 8788,
      reuseExistingServer: false,
      env: { DATABASE_URL: 'pglite', DEV_LOGIN: '1', PORT: '8788', WEB_ORIGIN: 'http://localhost:4173', ADMIN_EMAILS: 'admin@calvinseminary.edu', GOOGLE_CLIENT_ID: '' },
    },
    { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  ],
});
