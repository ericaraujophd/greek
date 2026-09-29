/**
 * Playwright end-to-end test config. Builds the app, serves it with
 * `vite preview` on port 4173 under /greek/, and runs e2e/*.spec.ts in
 * Chromium. Run with: npm run build && npm run test:e2e
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173/greek/', viewport: { width: 1100, height: 900 } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
