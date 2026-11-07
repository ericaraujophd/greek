/**
 * Vite configuration.
 *
 * WHY base = "/greek/":
 *   GitHub Pages serves a *project* repository (one that is not
 *   <username>.github.io) under a sub-path named after the repo. The repo is
 *   called "greek", so every asset URL must start with "/greek/". If the main
 *   website has a custom domain, GitHub applies it here too, so the app shows
 *   up at https://<your-domain>/greek/ with no extra work.
 *
 * WHY a PWA (progressive web app):
 *   The plugin writes a service worker that caches the whole app, including
 *   the Greek font. After the first visit the tools work offline (bus, plane,
 *   seminary basement), and on the iPad or phone you can "Add to Home Screen"
 *   so it opens like an app. Answers made offline wait in an outbox and are
 *   sent to the API when you are back online (see src/lib/api.ts).
 */
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/greek/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png'],
      manifest: {
        name: 'Greek Companion',
        short_name: 'Greek',
        description: 'A study companion for Greek Fundamentals I, alongside Mounce.',
        theme_color: '#1f2a44',
        background_color: '#f7f4ee',
        display: 'standalone',
        start_url: '/greek/',
        scope: '/greek/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // Cache fonts too, so Greek renders offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Never serve API calls from the cache: they must always hit the server.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
} as any);
