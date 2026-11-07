/**
 * main.ts: application entry point.
 *
 * WHAT HAPPENS ON LOAD
 *   1. Every screen is registered with the router (hash routes, see router.ts).
 *   2. Public screens (front page, sign-in) draw straight away.
 *   3. Any other screen needs a session: if there is a token, the student's
 *      data is loaded once from the API (lib/progress.ts loadAll) and kept in
 *      memory; if there is no token, or the server rejects it, we go to the
 *      sign-in page.
 *   4. Answers and card schedules are queued (lib/api.ts outbox) and sent in
 *      the background; the queue is flushed every 20 seconds, when the tab is
 *      hidden, and when the connection comes back.
 *
 * ADDING A SCREEN
 *   Write a view in src/views/ that returns a Node (or a Promise of one) and
 *   register it below with route('/path/:param', view).
 */
import '@fontsource/gentium-book-plus/greek-400.css';
import '@fontsource/gentium-book-plus/greek-700.css';
import '@fontsource/gentium-book-plus/greek-ext-400.css';
import '@fontsource/gentium-book-plus/latin-400.css';
import './styles.css';

import { h, mount } from './lib/dom';
import { go, route, startRouter, type View } from './router';
import { ApiError, flush, getToken, setOnUnauthorized, setToken } from './lib/api';
import { loadAll, state } from './lib/progress';
import { appHeader, errorBox, loading } from './components/layout';

import { loginView } from './views/login';
import { dashboardView } from './views/dashboard';
import { unitView } from './views/unit';
import { reviewView } from './views/review';
import { checkView, quizView } from './views/check';
import { readerView } from './views/reader';
import { paradigmsView } from './views/paradigms';
import { notesView } from './views/notes';
import { adminView } from './views/admin';

import { alphabetHubView } from './modules/alphabet/hub';
import { learnView } from './modules/alphabet/learn';
import { flashcardsView } from './modules/alphabet/flashcards';
import { speedView } from './modules/alphabet/speed';
import { lookalikesView } from './modules/alphabet/lookalikes';
import { typingView } from './modules/alphabet/typing';
import { soundOutView } from './modules/alphabet/soundout';

/** Screens anyone can see without signing in. */
const PUBLIC = new Set(['/', '/login']);

/**
 * The alphabet drills were written for the first version of the site and
 * draw only their own content. This wraps them in the app header and the
 * `.alpha` container that keeps their older styles scoped.
 */
const alpha = (view: () => Node): View => () =>
  h('div', {}, appHeader(), h('main', { class: 'page wrap alpha' },
    h('p', { class: 'small' }, h('a', { href: '#/alphabet' }, 'Alphabet'), ' · ', h('a', { href: '#/unit/u02' }, 'Unit 2')),
    view()));

route('/', loginView); // the front page is the sign-in page
route('/login', loginView);
route('/dashboard', dashboardView);
route('/unit/:id', unitView);
route('/review', reviewView);
route('/check/:id', checkView);
route('/quiz/:id', quizView);
route('/read', readerView);
route('/read/:unit', readerView);
route('/paradigms', paradigmsView);
route('/notes', notesView);
route('/admin', adminView);
route('/alphabet', alpha(alphabetHubView));
route('/alphabet/learn', alpha(learnView));
route('/alphabet/cards', alpha(flashcardsView));
route('/alphabet/speed', alpha(speedView));
route('/alphabet/lookalikes', alpha(lookalikesView));
route('/alphabet/typing', alpha(typingView));
route('/alphabet/sound', alpha(soundOutView));

const app = document.getElementById('app')!;

/* ------------------------------ sign-in guard ------------------------------ */

let loaded: Promise<void> | null = null;

/** Load the student's data once per page load (null when not signed in). */
function ensureLoaded(): Promise<void> | null {
  if (!getToken()) return null;
  loaded ??= loadAll().catch((e) => { loaded = null; throw e; });
  return loaded;
}

// Any 401 from the API (expired session, revoked invitation): back to sign-in.
setOnUnauthorized(() => {
  setToken(null);
  state.user = null;
  loaded = null;
  go('/login');
});

/* ------------------------------ render loop ------------------------------ */

let renderId = 0;

startRouter(async (path, found) => {
  const id = ++renderId; // a newer navigation wins over a slow older one
  const show = (node: Node) => { if (id === renderId) mount(app, node); };

  if (!found) return show(h('div', {}, h('main', { class: 'page wrap' }, h('h1', {}, 'Not found'), h('a', { href: '#/dashboard' }, 'Dashboard'))));

  if (!PUBLIC.has(path)) {
    const pending = ensureLoaded();
    if (!pending) return go('/login');
    if (!state.user) show(loading());
    try { await pending; } catch (e) {
      if (e instanceof ApiError && e.status === 401) return; // handled above
      return show(errorBox(`Could not reach the server (${(e as Error).message}). Is it running? See README: npm run dev.`));
    }
    if (path === '/admin' && state.user?.role !== 'admin') return go('/dashboard');
  } else if (getToken()) {
    // Already signed in: skip the sign-in page and go to the dashboard.
    return go('/dashboard');
  }

  try {
    const node = found.route.view(found.params);
    if (node instanceof Promise) { show(loading()); show(await node); } else show(node);
  } catch (e) {
    console.error(e);
    show(errorBox((e as Error).message));
  }
});

/* ------------------------------ background saving ------------------------------ */

setInterval(() => void flush(), 20_000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
window.addEventListener('online', () => void flush());
