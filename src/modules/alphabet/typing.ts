/**
 * typing.ts: learn to type Greek on the standard Greek keyboard layout.
 *
 * WHY BOTHER
 *   Typing a letter is active recall of its shape, and the skill pays off
 *   later: searching Logos/Accordance/STEP, writing notes, emailing a
 *   professor about ἀγάπη. The layout taught here is the one macOS uses
 *   when you add the "Greek" input source (System Settings > Keyboard >
 *   Text Input > Edit > + > Greek), so practice here transfers directly.
 *
 * HOW INPUT WORKS
 *   Keys are converted by keyToGreek(): pressing "u" types θ. If the Mac's
 *   Greek input source is already on, the key arrives as Greek and passes
 *   through unchanged, so both ways work.
 *
 * TWO LEVELS
 *   Letters: the prompt is a letter name; type it. Wrong answers light up
 *            the right key on the keyboard map.
 *   Words:   the prompt is a transliteration (logos); type the Greek word
 *            (λογος). Accents are not needed yet (they come in ch. 3). A
 *            final σ is fixed to ς automatically, so you may type either
 *            "s" or "w" at the end of a word.
 */
import { h, mount, shuffle, weightedPick } from '../../lib/dom';
import { fixFinalSigma, keyToGreek, KEY_FOR_GREEK, stripMarks, transliterate } from '../../lib/greek';
import { getProgress, recordAnswer, totalFor } from '../../lib/store';
import { setKeyHandler } from '../../router';
import { JOHN_1_1_5_WORDS, LETTERS, type Letter } from './data';

const ROUND = 20;

/** Keyboard rows, as Latin keys, for the on-screen map. */
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Keys where the Greek letter is NOT the look-alike Latin letter: highlighted in gold. */
const ODD_KEYS = new Set(['u', 'h', 'j', 'c', 'v', 'x', 'y', 'f', 'w', 'q']);

function keyboardMap(highlight?: string): Node {
  return h('div', { class: 'kb', 'aria-hidden': 'true' },
    KB_ROWS.map((row) => h('div', { class: 'kb-row' },
      [...row].map((k) => {
        const greek = k === 'q' ? ';' : keyToGreek(k);
        const cls = ['kb-key', ODD_KEYS.has(k) ? 'odd' : '', highlight === k ? 'hint' : ''].join(' ');
        return h('div', { class: cls }, h('span', { class: 'g' }, greek), k);
      }))));
}

export function typingView(): Node {
  const root = h('div', { class: 'drill' });
  let level: 'letters' | 'words' = 'letters';
  let showMap = true;

  function levelSwitch(): Node {
    const btn = (id: 'letters' | 'words', label: string) =>
      h('button', { class: level === id ? 'small primary' : 'small', onclick: () => { level = id; start(); } }, label);
    return h('div', { class: 'row', style: 'justify-content:center;margin-bottom:14px' },
      btn('letters', 'Letters'), btn('words', 'Words from John 1'),
      h('button', { class: 'small', onclick: () => { showMap = !showMap; start(); } }, showMap ? 'Hide keyboard' : 'Show keyboard'));
  }

  function start(): void {
    if (level === 'letters') lettersRound();
    else wordsRound();
  }

  /* ------------------------------ letters ------------------------------ */

  function lettersRound(): void {
    // Weighted like the speed drill: letters you miss come up more.
    const weight = (l: Letter) => {
      const t = totalFor(getProgress(), `type:${l.id}`);
      return t.seen < 2 ? 3 : 1 + 3 * (1 - t.correct / t.seen);
    };
    const prompts: Array<{ letter: Letter; final: boolean }> = [];
    while (prompts.length < ROUND) {
      const l = weightedPick(LETTERS, weight);
      prompts.push({ letter: l, final: l.id === 'sigma' && Math.random() < 0.4 });
    }
    let i = 0;
    let right = 0;

    function ask(): void {
      setKeyHandler(null);
      if (i >= prompts.length) return summary(`${right} / ${prompts.length} letters typed correctly.`);
      const { letter, final } = prompts[i];
      const expected = final ? 'ς' : letter.lower;
      const feedback = h('div', { class: 'feedback' });
      // A real text field (not just a keydown listener) so the on-screen
      // keyboard opens on the iPad and phone. The 'input' event fires for
      // hardware and touch keyboards alike.
      const box = h('input', {
        class: 'answer-input', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        maxlength: '1', 'aria-label': 'Type the letter',
      }) as HTMLInputElement;
      let done = false;
      const advance = () => { i++; ask(); };

      box.addEventListener('keydown', (e) => {
        if (done && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); advance(); }
      });
      box.addEventListener('input', () => {
        if (done || !box.value) return;
        const typed = keyToGreek(box.value.slice(-1)).toLowerCase();
        box.value = typed;
        box.readOnly = true;
        done = true;
        const ok = typed === expected;
        recordAnswer(`type:${letter.id}`, ok, 'typing');
        box.classList.add(ok ? 'right' : 'wrong');
        if (ok) {
          right++;
          feedback.className = 'feedback good';
          feedback.textContent = 'Right.';
          setTimeout(advance, 450);
        } else {
          const key = KEY_FOR_GREEK[expected];
          feedback.className = 'feedback bad';
          mount(feedback, h('div', {},
            h('div', {}, `${letter.name}${final ? ' (final)' : ''} is ${expected}, on the "${key}" key.`),
            h('button', { class: 'small', style: 'margin-top:8px', onclick: advance }, 'Next ', h('kbd', {}, 'space'))));
          if (showMap) mount(mapSlot, keyboardMap(key));
        }
      });

      const mapSlot = h('div', {}, showMap ? keyboardMap() : null);
      mount(root, h('div', {},
        levelSwitch(),
        h('div', { class: 'drill-top' }, h('span', {}, 'Typing: letters'), h('span', {}, `${i + 1} / ${prompts.length}`)),
        h('div', { class: 'progressbar' }, h('div', { style: `width:${(i / prompts.length) * 100}%` })),
        h('div', { class: 'prompt' },
          h('div', { class: 'q' }, 'Type this letter'),
          h('div', { class: 'name' }, letter.name, final ? h('span', { class: 'muted', style: 'font-size:20px' }, ' (end of word)') : null),
          box),
        feedback,
        mapSlot,
      ));
      box.focus();
    }
    ask();
  }

  /* ------------------------------ words ------------------------------ */

  function wordsRound(): void {
    const words = shuffle(JOHN_1_1_5_WORDS).slice(0, 12);
    let i = 0;
    let right = 0;

    function ask(): void {
      setKeyHandler(null);
      if (i >= words.length) return summary(`${right} / ${words.length} words typed correctly.`);
      const word = words[i];
      const expected = fixFinalSigma(stripMarks(word.greek).replace(/[’'ʼ]/g, ''));
      const feedback = h('div', { class: 'feedback' });
      // A form so Enter submits; the router ignores shortcuts inside forms.
      const input = h('input', {
        class: 'answer-input', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        'aria-label': 'Type the Greek word',
      }) as HTMLInputElement;
      let checked = false;

      // Convert Latin letters to Greek as they are typed. Using the 'input'
      // event (not 'keydown') makes this work with touch keyboards too.
      input.addEventListener('input', () => {
        if (checked) return;
        input.value = [...input.value].map(keyToGreek).join('');
      });

      const form = h('form', {
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (checked) { i++; ask(); return; }
          checked = true;
          const typed = fixFinalSigma(stripMarks(input.value.trim()));
          const ok = typed === expected;
          recordAnswer(`word:${word.greek}`, ok, 'typing-words');
          input.classList.add(ok ? 'right' : 'wrong');
          input.readOnly = true;
          if (ok) right++;
          feedback.className = ok ? 'feedback good' : 'feedback bad';
          mount(feedback, h('div', {},
            h('span', { class: 'greek', style: 'font-size:26px' }, word.greek), ` "${word.gloss}". `,
            ok ? 'Right.' : `Expected ${expected}.`, ' Press enter to go on.'));
        },
      }, input);

      mount(root, h('div', {},
        levelSwitch(),
        h('div', { class: 'drill-top' }, h('span', {}, 'Typing: words'), h('span', {}, `${i + 1} / ${words.length}`)),
        h('div', { class: 'progressbar' }, h('div', { style: `width:${(i / words.length) * 100}%` })),
        h('div', { class: 'prompt' },
          h('div', { class: 'q' }, 'Type this word in Greek (no accents needed), then press enter'),
          h('div', { class: 'name' }, transliterate(word.greek)),
          form),
        feedback,
        showMap ? keyboardMap() : null,
      ));
      input.focus();
    }
    ask();
  }

  function summary(text: string): void {
    setKeyHandler((e) => { if (e.key === 'Enter') start(); });
    mount(root, h('div', {},
      levelSwitch(),
      h('div', { class: 'prompt' },
        h('div', { class: 'q' }, 'Round complete'),
        h('div', { class: 'name', style: 'font-size:28px' }, text),
        h('div', { class: 'row', style: 'justify-content:center' },
          h('button', { class: 'primary', onclick: start }, 'Another round ', h('kbd', {}, 'enter')),
          h('a', { class: 'button', href: '#/alphabet' }, 'Done')))));
  }

  start();
  return root;
}
