/**
 * hub.ts: the Alphabet landing screen. One tile per drill, in the order
 * that makes sense within a 30-minute session:
 *   Learn (look) -> Flashcards (remember) -> Speed (recognise fast)
 *   -> Look-alikes (avoid traps) -> Typing (produce) -> Sound it out (read).
 */
import { h } from '../../lib/dom';
import { deckSummary } from './cards';

const DRILLS = [
  { href: '#/alphabet/learn', glyph: 'αβγ', title: 'Learn the letters', text: 'Every letter with its name, sound, transliteration and an NT example. Start here.' },
  { href: '#/alphabet/cards', glyph: 'λ ⇄ lambda', title: 'Flashcards', text: 'Spaced repetition: read, write and capital cards. Opens one batch of six letters at a time.' },
  { href: '#/alphabet/speed', glyph: 'ψ?', title: 'Speed drill', text: '20 quick multiple-choice questions. Your weakest letters come up more often.' },
  { href: '#/alphabet/lookalikes', glyph: 'ν ≠ v', title: 'Look-alikes', text: 'The traps: ν is not v, η is not n, ρ is not p, ω is not w, χ is not x.' },
  { href: '#/alphabet/typing', glyph: 'u → θ', title: 'Typing', text: 'Learn the standard Greek keyboard, letter by letter, then whole words.' },
  { href: '#/alphabet/sound', glyph: 'λόγος', title: 'Sound it out', text: 'Read the words of John 1:1 to 5 aloud and type what you said.' },
];

export function alphabetHubView(): Node {
  const d = deckSummary();
  return h('div', {},
    h('h1', {}, 'The alphabet'),
    h('p', { class: 'lead' },
      'Mounce chapters 1 to 4. The goal for weeks 1 and 2: read any Greek word aloud without hesitating. ',
      'Batches of six open one after another as you learn them.'),
    h('div', { class: 'stats-row' },
      h('div', { class: 'stat' }, h('b', {}, `${d.batch} of 4`), h('span', {}, 'batches open')),
      h('div', { class: 'stat' }, h('b', {}, `${d.learned} / ${d.total}`), h('span', {}, 'cards learned')),
      h('div', { class: 'stat' }, h('b', {}, String(d.queue)), h('span', {}, 'cards waiting today')),
    ),
    h('div', { class: 'grid' },
      DRILLS.map((x) => h('a', { class: 'tile', href: x.href },
        h('div', { class: 'tile-glyph' }, x.glyph),
        h('h3', {}, x.title),
        h('p', {}, x.text)))),
  );
}
