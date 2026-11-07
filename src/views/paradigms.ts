/**
 * paradigms.ts: every paradigm table from the units you have opened, on one
 * page (#/paradigms), for quick reference while reading or doing homework.
 *
 * "Hide forms" blanks every cell so you can recite a table and then tap a
 * cell to check it. Tables that appear in several units are shown once, in
 * their latest (most complete) version.
 */
import { h, mount } from '../lib/dom';
import { appHeader } from '../components/layout';
import { isAdmin, isStarted } from '../lib/progress';
import { LESSONS } from '../content/lessons';
import { UNITS } from '../content/units';
import type { Paradigm } from '../content/types';

/** Draw one table. Masked cells reveal themselves when tapped. */
export function paradigmTable(p: Paradigm, masked: boolean): HTMLElement {
  return h('div', { class: 'stack', style: 'gap:6px' },
    h('b', {}, p.title),
    h('div', { style: 'overflow-x:auto' },
      h('table', { class: 'paradigm' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), ...p.columns.map((c) => h('th', {}, c)))),
        h('tbody', {}, ...p.rows.map((r) => h('tr', { class: r.isNew ? 'new' : '' },
          h('th', {}, r.label),
          ...r.cells.map((cell) => {
            const td = h('td', { class: `greek${masked && cell ? ' masked' : ''}` }, cell);
            if (masked) td.addEventListener('click', () => td.classList.remove('masked'));
            return td;
          })))))),
    p.note ? h('span', { class: 'small muted' }, p.note) : null);
}

export function paradigmsView(): Node {
  // Latest version of each table among the units opened (admins see all drafted).
  const latest = new Map<string, { p: Paradigm; unit: number }>();
  for (const u of UNITS) {
    if (!(isStarted(u.id) || (isAdmin() && u.drafted))) continue;
    for (const p of LESSONS[u.id]?.paradigms ?? []) latest.set(p.id, { p, unit: u.n });
  }
  const body = h('div', { class: 'stack', style: 'gap:22px' });
  let masked = false;
  const toggle = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, 'Hide forms');
  const draw = () => mount(body, latest.size
    ? h('div', { class: 'stack', style: 'gap:22px' }, ...[...latest.values()].map(({ p, unit }) =>
        h('section', { class: 'panel stack', style: 'gap:8px' },
          h('span', { class: 'tiny muted' }, `Unit ${unit}`), paradigmTable(p, masked))))
    : h('div', { class: 'panel' }, h('p', {}, 'Tables appear here as you open units.')));
  toggle.addEventListener('click', () => {
    masked = !masked;
    toggle.textContent = masked ? 'Show forms' : 'Hide forms';
    toggle.setAttribute('aria-pressed', String(masked));
    draw();
  });
  draw();
  return h('div', {}, appHeader(), h('main', { class: 'page wrap stack fade-in', style: 'gap:22px' },
    h('div', { class: 'row', style: 'align-items:baseline' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:34px' }, 'Paradigms'),
      h('span', { class: 'muted' }, 'Every table so far. Hide the forms, recite, tap to check.'),
      h('span', { style: 'margin-left:auto' }, toggle)),
    body));
}
