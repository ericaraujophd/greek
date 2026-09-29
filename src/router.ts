/**
 * router.ts: hash-based routing ("#/alphabet/speed").
 *
 * WHY HASH ROUTES
 *   GitHub Pages is a plain file server. A URL like /greek/alphabet/speed
 *   would ask it for a file that does not exist and return 404. With
 *   /greek/#/alphabet/speed the server only ever sees /greek/, and the part
 *   after # is handled here in the browser. Bookmarks and the back button
 *   still work.
 *
 * KEYBOARD SHORTCUTS
 *   Drills use keys (1 to 4 for answers, space to flip a card). A screen
 *   registers its handler with setKeyHandler(); the router clears it on every
 *   route change so shortcuts never leak from one screen into the next.
 */

export type View = () => Node;

const routes = new Map<string, View>();
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let rerender: () => void = () => {};

export function route(path: string, view: View): void {
  routes.set(path, view);
}

export function currentPath(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function go(path: string): void {
  location.hash = path;
}

export function setKeyHandler(fn: ((e: KeyboardEvent) => void) | null): void {
  keyHandler = fn;
}

/** Ask the router to draw the current screen again (after data changes). */
export function refresh(): void {
  rerender();
}

export function startRouter(render: (view: View, path: string) => void): void {
  rerender = () => {
    const path = currentPath();
    const view = routes.get(path) ?? routes.get('/')!;
    render(view, path);
  };
  window.addEventListener('hashchange', () => {
    keyHandler = null;
    rerender();
    window.scrollTo(0, 0);
  });
  document.addEventListener('keydown', (e) => {
    // Never steal keys while the user types in a text field of a form
    // (the typing drills handle their own input fields and opt in).
    const t = e.target as HTMLElement;
    const inForm = t.closest('form, .no-shortcuts');
    if (keyHandler && !inForm && !e.metaKey && !e.ctrlKey && !e.altKey) keyHandler(e);
  });
  rerender();
}
