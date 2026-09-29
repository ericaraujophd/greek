/**
 * learn.ts: browse the alphabet. A grid of all 24 letters in their four
 * batches; tapping one shows its details. Arrow keys move between letters,
 * which makes it quick to walk through a whole batch.
 */
import { h, mount } from '../../lib/dom';
import { setKeyHandler } from '../../router';
import { LETTERS, type Letter } from './data';
import { unlockedBatch } from './cards';
import { speakerButton, speakLetter } from '../../components/speaker';

export function learnView(): Node {
  let selected: Letter = LETTERS[0];
  const detailSlot = h('div', { class: 'panel', style: 'margin-top:18px' });
  const buttons = new Map<string, HTMLButtonElement>();
  const open = unlockedBatch();

  function select(letter: Letter): void {
    selected = letter;
    buttons.forEach((b, id) => b.classList.toggle('selected', id === letter.id));
    mount(detailSlot, detail(letter));
  }

  const batches = [1, 2, 3, 4].map((b) =>
    h('div', { class: 'batch' },
      h('h3', {}, `Batch ${b}${b <= open ? '' : ' · opens in flashcards after batch ' + (b - 1)}`),
      h('div', { class: 'letters' },
        LETTERS.filter((l) => l.batch === b).map((l) => {
          const btn = h('button', { class: 'letter-btn', onclick: () => select(l), 'aria-label': l.name },
            h('span', { class: 'g' }, l.lower), h('span', { class: 'n' }, l.name));
          buttons.set(l.id, btn);
          return btn;
        }))));

  setKeyHandler((e) => {
    const i = LETTERS.indexOf(selected);
    if (e.key === 'ArrowRight' && i < 23) select(LETTERS[i + 1]);
    if (e.key === 'ArrowLeft' && i > 0) select(LETTERS[i - 1]);
    if (e.key === 'l') speakLetter(selected);
  });

  const view = h('div', {},
    h('h1', {}, 'Learn the letters'),
    h('p', { class: 'lead' },
      'Say each letter\'s name and sound out loud as you go. Use ', h('kbd', {}, '←'), ' ', h('kbd', {}, '→'),
      ' to step through, ', h('kbd', {}, 'L'), ' to listen. Pronunciation is Erasmian, as in Mounce; stressed syllables are in capitals.'),
    batches,
    detailSlot,
  );
  select(selected);
  return view;
}

function detail(l: Letter): Node {
  return h('div', { class: 'detail' },
    h('div', { class: 'big' }, h('span', {}, l.lower), h('span', { class: 'up' }, l.upper),
      l.id === 'sigma' ? h('span', {}, 'ς') : null),
    h('div', {},
      h('h2', { style: 'margin-top:0' }, l.name),
      h('dl', { class: 'facts' },
        h('dt', {}, 'Sound'), h('dd', {}, l.sound),
        h('dt', {}, 'Say'), h('dd', {}, h('b', {}, l.say.name), ', ', h('span', { class: 'greek', style: 'font-size:20px' }, l.example.greek), ' = ', h('b', {}, l.say.example), ' ', speakerButton(l)),
        h('dt', {}, 'Transliteration'), h('dd', {}, h('b', {}, l.translit)),
        h('dt', {}, 'Example'), h('dd', {}, h('span', { class: 'greek', style: 'font-size:22px' }, l.example.greek),
          ` ${l.example.translit}, "${l.example.gloss}"`),
      ),
      l.note ? h('div', { class: 'note' }, l.note) : null,
    ),
  );
}
