/**
 * router.ts: hash-based routing with parameters ("#/unit/u06").
 *
 * WHY HASH ROUTES
 *   GitHub Pages is a plain file server. /greek/unit/u06 would be a 404; with
 *   /greek/#/unit/u06 the server only ever sees /greek/ and the browser
 *   handles the rest. Bookmarks and the back button still work.
 *
 * ROUTES
 *   route('/unit/:id', view) registers a pattern; the view receives
 *   { id: 'u06' }. Views return a DOM node, or a Promise of one when they
 *   need to load data first (a "Loading…" placeholder shows meanwhile).
 *
 * KEYBOARD SHORTCUTS
 *   A screen registers its key handler with setKeyHandler(); the router
 *   clears it on every route change, so shortcuts never leak between screens.
 *   Keys typed into form fields are never treated as shortcuts.
 */

export type Params = Record<string, string>;
export type View = (params: Params) => Node | Promise<Node>;

interface Route { pattern: RegExp; keys: string[]; view: View; path: string }

const routes: Route[] = [];
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let rerender: () => void = () => {};

export function route(path: string, view: View): void {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ pattern, keys, view, path });
}

export function currentPath(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function go(path: string): void {
  if (currentPath() === path) rerender();
  else location.hash = path;
}

export function setKeyHandler(fn: ((e: KeyboardEvent) => void) | null): void {
  keyHandler = fn;
}

/** Draw the current screen again (after data changes). */
export function refresh(): void {
  rerender();
}

export function match(path: string): { route: Route; params: Params } | null {
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function startRouter(render: (path: string, found: ReturnType<typeof match>) => void): void {
  rerender = () => render(currentPath(), match(currentPath()));
  window.addEventListener('hashchange', () => {
    keyHandler = null;
    rerender();
    window.scrollTo(0, 0);
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, form, .no-shortcuts')) return;
    if (keyHandler && !e.metaKey && !e.ctrlKey && !e.altKey) keyHandler(e);
  });
  rerender();
}
