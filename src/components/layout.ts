/**
 * layout.ts: the header shown on every signed-in page, plus small shared
 * pieces (score colour, loading and error boxes).
 */
import { logoMark } from './logo';
import { h } from '../lib/dom';
import { currentPath, go } from '../router';
import { isAdmin, state } from '../lib/progress';
import { setToken } from '../lib/api';

export function brand(href = '#/dashboard'): HTMLElement {
  return h('a', { class: 'brand', href }, logoMark(34), 'Greek Companion');
}

export function appHeader(): HTMLElement {
  const path = currentPath();
  const link = (href: string, label: string, match = href) =>
    h('a', { href: '#' + href, class: path.startsWith(match) ? 'active' : '' }, label);
  const initials = (state.user?.name || state.user?.email || '?')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  const signOut = () => { setToken(null); go('/login'); location.reload(); };
  return h('header', { class: 'app-header' },
    h('div', { class: 'wrap' },
      brand(),
      h('nav', { class: 'app-nav', 'aria-label': 'Main' },
        link('/dashboard', 'Dashboard'), link('/review', 'Review'), link('/read', 'Read'),
        link('/paradigms', 'Paradigms'), link('/alphabet', 'Alphabet'), link('/notes', 'My notes')),
      h('div', { class: 'header-right' },
        isAdmin() ? h('a', { href: '#/admin', class: 'small' }, 'Admin') : null,
        h('button', { class: 'btn small', type: 'button', onclick: signOut, title: state.user?.email ?? '' }, 'Sign out'),
        h('span', { class: 'avatar', 'aria-label': `Signed in as ${state.user?.email ?? ''}` }, initials),
      ),
    ),
  );
}

/** Colour for a score: green at 85% or more, orange below. */
export function scoreColor(pct: number | undefined): string {
  if (pct === undefined) return 'var(--line)';
  return pct >= 85 ? 'var(--green)' : 'var(--orange)';
}

/*
 * There is deliberately NO audio anywhere in the site (removed Nov 6 and 9,
 * 2026). Browser voices either speak modern Greek (wrong sounds) or are
 * English voices reading respellings (stress guessed, no ü, no "loch" χ).
 * The alphabet drills show written respellings instead ("AHL-fah"), from
 * src/modules/alphabet/data.ts. Real recordings may come later.
 */

export function loading(text = 'Loading…'): HTMLElement {
  return h('div', { class: 'wrap', style: 'padding:48px 24px' }, h('p', { class: 'muted' }, text));
}

export function errorBox(message: string): HTMLElement {
  return h('div', { class: 'wrap', style: 'padding:48px 24px' },
    h('div', { class: 'feedback bad' }, h('b', {}, 'Something went wrong. '), message));
}
