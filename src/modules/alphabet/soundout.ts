/**
 * soundout.ts: "Sound it out". Read a real word from John 1:1-5 aloud,
 * then type what you said in Latin letters (its transliteration).
 *
 * The check is forgiving about things that are not the point yet:
 *   - macrons are optional (arche = archē),
 *   - y is accepted for upsilon,
 *   - capital letters do not matter.
 * It is strict about the letters themselves, and about the two rules from
 * Mounce ch. 3 to 4 that change the sound:
 *   - rough breathing adds h: ὁ = ho, οὗτος = houtos,
 *   - gamma before γ, κ, ξ, χ is n: ἄγγελος = angelos.
 * A "Letter by letter" button breaks the word down if you are stuck.
 *
 * Under the drill the five verses are shown with the current word marked,
 * so each word is also met in its sentence.
 */
import { h, mount, shuffle } from '../../lib/dom';
import { looseTranslit, stripMarks, transliterate } from '../../lib/greek';
import { recordAnswer } from '../../lib/store';
import { setKeyHandler } from '../../router';
import { JOHN_1_1_5_TEXT, JOHN_1_1_5_WORDS, LETTERS } from './data';

const ROUND = 12;

/** "ἀρχῇ" -> "α a · ρ r · χ ch · η ē" (plus a note on breathing). */
function breakdown(word: string): string {
  const bare = stripMarks(word).replace(/[’'ʼ]/g, '');
  const parts = [...bare].map((ch) => {
    const l = LETTERS.find((x) => x.lower === ch || (ch === 'ς' && x.id === 'sigma'));
    return l ? `${ch} ${l.translit}` : ch;
  });
  const rough = word.normalize('NFD').includes('̔');
  return parts.join(' · ') + (rough ? '  (rough breathing: starts with h)' : '');
}

/** The verses, with every occurrence of `word` wrapped in <mark>. */
function versesWith(word: string): Node {
  return h('div', { class: 'verses' },
    JOHN_1_1_5_TEXT.map((verse, i) => h('div', {},
      h('sup', {}, String(i + 1)),
      verse.split(/(\s+)/).map((token) => {
        const clean = token.replace(/[,.·;]/g, '');
        return clean === word ? h('mark', {}, token) : token;
      }))));
}

export function soundOutView(): Node {
  const root = h('div', { class: 'drill' });

  function start(): void {
    const words = shuffle(JOHN_1_1_5_WORDS).slice(0, ROUND);
    let i = 0;
    let right = 0;

    function ask(): void {
      setKeyHandler(null);
      if (i >= words.length) return done();
      const w = words[i];
      const expected = transliterate(w.greek);
      const feedback = h('div', { class: 'feedback' });
      const hint = h('div', { class: 'muted small-text', style: 'min-height:22px;margin-top:8px' });
      const input = h('input', {
        class: 'answer-input latin', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        placeholder: 'type what you said', 'aria-label': 'Transliteration',
      }) as HTMLInputElement;
      let checked = false;

      const form = h('form', {
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (checked) { i++; ask(); return; }
          if (!input.value.trim()) return;
          checked = true;
          const ok = looseTranslit(input.value) === looseTranslit(expected);
          recordAnswer(`read:${w.greek}`, ok, 'soundout');
          if (ok) right++;
          input.classList.add(ok ? 'right' : 'wrong');
          input.readOnly = true;
          feedback.className = ok ? 'feedback good' : 'feedback bad';
          mount(feedback, h('div', {},
            h('b', {}, expected), ` means "${w.gloss}". `,
            ok ? '' : breakdown(w.greek) + '. ',
            'Press enter to go on.'));
        },
      }, input);

      mount(root, h('div', {},
        h('div', { class: 'drill-top' }, h('span', {}, 'Sound it out: John 1:1 to 5'), h('span', {}, `${i + 1} / ${words.length}`)),
        h('div', { class: 'progressbar' }, h('div', { style: `width:${(i / words.length) * 100}%` })),
        h('div', { class: 'prompt' },
          h('div', { class: 'q' }, 'Say it aloud, then type it in English letters'),
          h('div', { class: 'word' }, w.greek),
          form,
          hint),
        h('div', { class: 'row', style: 'justify-content:center' },
          h('button', { class: 'small', type: 'button', onclick: () => { hint.textContent = breakdown(w.greek); } }, 'Letter by letter')),
        feedback,
        h('div', { class: 'panel', style: 'margin-top:18px' }, versesWith(w.greek)),
      ));
      input.focus();
    }

    function done(): void {
      setKeyHandler((e) => { if (e.key === 'Enter') start(); });
      mount(root, h('div', { class: 'prompt' },
        h('div', { class: 'q' }, 'Round complete'),
        h('div', { class: 'name' }, `${right} / ${words.length}`),
        h('p', { class: 'muted' }, 'Now read all five verses aloud, slowly, start to finish.'),
        h('div', { class: 'panel', style: 'width:100%' }, versesWith('')),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          h('button', { class: 'primary', onclick: start }, 'Another round ', h('kbd', {}, 'enter')),
          h('a', { class: 'button', href: '#/alphabet' }, 'Done'))));
    }

    ask();
  }

  start();
  return root;
}
