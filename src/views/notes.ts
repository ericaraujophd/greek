/**
 * notes.ts: all your unit notes on one page (#/notes).
 *
 * Notes are written on each unit page and saved to your account. Here they
 * are listed in course order and can be edited in place (saved a moment
 * after you stop typing). Only you can read them.
 */
import { h } from '../lib/dom';
import { appHeader } from '../components/layout';
import { saveNote, state } from '../lib/progress';
import { UNITS } from '../content/units';

export function notesView(): Node {
  const withNotes = UNITS.filter((u) => (state.notes.get(u.id) ?? '').trim());
  const sections = withNotes.map((u) => {
    const status = h('span', { class: 'tiny muted', style: 'margin-left:auto' }, '');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const area = h('textarea', { rows: 6, style: 'width:100%', 'aria-label': `Notes for unit ${u.n}` }, state.notes.get(u.id) ?? '') as HTMLTextAreaElement;
    area.addEventListener('input', () => {
      status.textContent = 'Saving…';
      clearTimeout(timer);
      timer = setTimeout(() => saveNote(u.id, area.value).then(() => { status.textContent = 'Saved'; }, () => { status.textContent = 'Not saved: offline?'; }), 700);
    });
    return h('section', { class: 'panel stack', style: 'gap:8px' },
      h('div', { class: 'row', style: 'align-items:baseline' },
        h('a', { href: `#/unit/${u.id}`, class: 'serif', style: 'font-size:20px;font-weight:700;color:var(--ink)' }, `Unit ${u.n}: ${u.title}`),
        h('span', { class: 'small muted' }, u.chapters), status),
      area);
  });
  return h('div', {}, appHeader(), h('main', { class: 'page wrap stack fade-in', style: 'gap:22px' },
    h('div', { class: 'row', style: 'align-items:baseline' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:34px' }, 'My notes'),
      h('span', { class: 'muted' }, 'Private to you. Write them on each unit page.')),
    ...(sections.length ? sections : [h('div', { class: 'panel' }, h('p', {}, 'No notes yet. Each unit page has a notes box at the bottom.'))])));
}
