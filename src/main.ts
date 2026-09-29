/**
 * main.ts: application entry point.
 *
 * Builds the page frame (header, navigation, sync status), registers every
 * screen with the router, and starts background sync with GitHub.
 *
 * ADDING A NEW MODULE LATER (e.g. noun paradigms)
 *   1. Create src/modules/<name>/ with its data and views.
 *   2. Register its routes below with route('/<name>/...', view).
 *   3. Add a tile for it in src/views/home.ts (MODULES list).
 * Progress for every module lives in the same progress.json, keyed by
 * prefixes ("alpha:", "noun:", ...), so sync needs no changes.
 */
import '@fontsource/gentium-book-plus/greek-400.css';
import '@fontsource/gentium-book-plus/greek-700.css';
import '@fontsource/gentium-book-plus/greek-ext-400.css';
import '@fontsource/gentium-book-plus/latin-400.css';
import './styles.css';

import { h, mount } from './lib/dom';
import { currentPath, route, startRouter, type View } from './router';
import { currentSessionCount, isDirty, subscribe } from './lib/store';
import { getSyncStatus, onSyncStatus, push, startAutoSync, type SyncStatus } from './lib/sync';
import { syncConfigured } from './lib/settings';

import { homeView } from './views/home';
import { statsView } from './views/stats';
import { settingsView } from './views/settings';
import { alphabetHubView } from './modules/alphabet/hub';
import { learnView } from './modules/alphabet/learn';
import { flashcardsView } from './modules/alphabet/flashcards';
import { speedView } from './modules/alphabet/speed';
import { lookalikesView } from './modules/alphabet/lookalikes';
import { typingView } from './modules/alphabet/typing';
import { soundOutView } from './modules/alphabet/soundout';

route('/', homeView);
route('/alphabet', alphabetHubView);
route('/alphabet/learn', learnView);
route('/alphabet/cards', flashcardsView);
route('/alphabet/speed', speedView);
route('/alphabet/lookalikes', lookalikesView);
route('/alphabet/typing', typingView);
route('/alphabet/sound', soundOutView);
route('/stats', statsView);
route('/settings', settingsView);

const app = document.getElementById('app')!;
const headerSlot = h('div');
const mainSlot = h('main', { class: 'wrap' });
app.replaceChildren(headerSlot, mainSlot);

/* ------------------------------ header ------------------------------ */

function syncLabel(s: SyncStatus): { text: string; cls: string; title: string } {
  if (s.kind === 'off') return { text: 'Not syncing', cls: 'pill muted', title: 'Set up GitHub sync in Settings' };
  if (s.kind === 'busy') return { text: s.what + '…', cls: 'pill busy', title: '' };
  if (s.kind === 'error') return { text: 'Sync problem', cls: 'pill bad', title: s.message };
  return isDirty()
    ? { text: 'Unsaved', cls: 'pill warn', title: 'Changes not yet on GitHub' }
    : { text: 'Saved', cls: 'pill good', title: s.lastSync ? `Last sync ${new Date(s.lastSync).toLocaleTimeString()}` : '' };
}

function renderHeader(): void {
  const path = currentPath();
  const link = (href: string, label: string) =>
    h('a', { href: '#' + href, class: (href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : '' }, label);
  const s = syncLabel(getSyncStatus());
  const count = currentSessionCount();
  mount(headerSlot, h('header', { class: 'top' },
    h('div', { class: 'wrap top-inner' },
      h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark greek' }, 'α'), 'Greek'),
      h('nav', {}, link('/', 'Today'), link('/alphabet', 'Alphabet'), link('/stats', 'Progress'), link('/settings', 'Settings')),
      h('div', { class: 'top-right' },
        count > 0 ? h('span', { class: 'session-count', title: 'Answers this session' }, `${count} answer${count === 1 ? '' : 's'}`) : null,
        h('span', { class: s.cls, title: s.title }, s.text),
        syncConfigured() && isDirty()
          ? h('button', { class: 'small', onclick: () => void push('Study session') }, 'Save to GitHub')
          : null,
      ),
    ),
  ));
}

/* ------------------------------ render loop ------------------------------ */

let currentView: View | null = null;

startRouter((view) => {
  currentView = view;
  renderHeader();
  mount(mainSlot, view());
});

// Header reflects every data change and sync event. The main area is NOT
// re-rendered on data change (that would reset a drill mid-question); screens
// that show live numbers refresh themselves.
subscribe(renderHeader);
onSyncStatus((s) => {
  renderHeader();
  // After a pull brings in new data, redraw passive screens (home, stats).
  if (s.kind === 'idle' && currentView && ['/', '/stats', '/alphabet'].includes(currentPath())) {
    mount(mainSlot, currentView());
  }
});

startAutoSync();
