/**
 * greekKeyboard.ts: an on-screen Greek keyboard plus "Type Greek" mode,
 * attached to one text box (the notes).
 *
 * ON-SCREEN KEYS
 *   Three rows of letters in the standard Greek layout, ⇧ for capitals,
 *   ⌫ to delete, space, and a row of marks (accent, breathing, iota
 *   subscript, diaeresis) that go on the letter just before the cursor.
 *   Keys use mousedown + preventDefault so the text box keeps its focus
 *   and cursor position while you tap.
 *
 * "TYPE GREEK" MODE
 *   With the switch on (or ⌥G / Alt+G while typing), your own keys type
 *   Greek: see LATIN_TO_GREEK in lib/greekInput.ts (a α, q θ, c χ, w ω ...)
 *   and / \ = ) ( | + for the marks. Turn it off to write English. The
 *   choice is remembered in this browser.
 */
import { h } from '../lib/dom';
import { backspace, insertAtCursor, KEY_TO_MARK, LATIN_TO_GREEK, markBeforeCursor, type MarkName } from '../lib/greekInput';

const ROWS = [
  [';', 'ς', 'ε', 'ρ', 'τ', 'υ', 'θ', 'ι', 'ο', 'π'],
  ['α', 'σ', 'δ', 'φ', 'γ', 'η', 'ξ', 'κ', 'λ'],
  ['ζ', 'χ', 'ψ', 'ω', 'β', 'ν', 'μ'],
];
const MARKS: Array<[MarkName, string, string]> = [
  ['acute', 'ά', 'acute accent ( / )'],
  ['grave', 'ὰ', 'grave accent ( \\ )'],
  ['circumflex', 'ᾶ', 'circumflex ( = )'],
  ['smooth', 'ἀ', 'smooth breathing ( ) )'],
  ['rough', 'ἁ', 'rough breathing ( ( )'],
  ['iota', 'ᾳ', 'iota subscript ( | )'],
  ['diaeresis', 'ϊ', 'diaeresis ( + )'],
];
const PREF = 'greek.typeGreek';

function readPref(): boolean {
  try { return localStorage.getItem(PREF) === '1'; } catch { return false; }
}
function writePref(on: boolean): void {
  try { localStorage.setItem(PREF, on ? '1' : '0'); } catch { /* private window: fine */ }
}

export function greekKeyboard(target: HTMLTextAreaElement | HTMLInputElement): HTMLElement {
  let shift = false;
  let typeGreek = readPref();

  /** A key that does `act` without stealing focus from the text box. */
  const key = (label: string, act: () => void, cls = '', title = '') => {
    const b = h('button', { type: 'button', class: `k ${cls}`, title: title || label, 'aria-label': title || label }, label) as HTMLButtonElement;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    // 'gk-before' lets the notes panel add a step heading before the first character.
    b.addEventListener('click', () => { target.focus(); target.dispatchEvent(new Event('gk-before')); act(); });
    return b;
  };

  const letterKeys: HTMLButtonElement[] = [];
  const letter = (ch: string) => {
    const b = key(ch, () => {
      const out = shift && ch !== ';' && ch !== 'ς' ? ch.toUpperCase() : ch;
      insertAtCursor(target, out);
      if (shift) setShift(false); // one capital, like a phone keyboard
    });
    b.dataset.ch = ch;
    letterKeys.push(b);
    return b;
  };
  const shiftKey = key('⇧', () => setShift(!shift), 'wide', 'Capital letter');
  function setShift(on: boolean) {
    shift = on;
    shiftKey.classList.toggle('on', on);
    for (const b of letterKeys) {
      const ch = b.dataset.ch!;
      b.textContent = on && ch !== ';' && ch !== 'ς' ? ch.toUpperCase() : ch;
    }
  }

  // The switch for Type Greek mode.
  const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(typeGreek), 'aria-label': 'Type Greek with my keyboard' }) as HTMLButtonElement;
  const setTypeGreek = (on: boolean) => {
    typeGreek = on;
    writePref(on);
    sw.setAttribute('aria-checked', String(on));
    target.classList.toggle('typing-greek', on);
  };
  sw.addEventListener('mousedown', (e) => e.preventDefault());
  sw.addEventListener('click', () => { setTypeGreek(!typeGreek); target.focus(); });
  setTypeGreek(typeGreek);

  // Type Greek mode: translate keys as they are pressed.
  (target as HTMLTextAreaElement).addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && (e.code === 'KeyG')) { e.preventDefault(); setTypeGreek(!typeGreek); return; }
    if (!typeGreek || e.metaKey || e.ctrlKey || e.altKey) return;
    const lower = e.key.toLowerCase();
    if (e.key.length === 1 && LATIN_TO_GREEK[lower]) {
      e.preventDefault();
      const g = LATIN_TO_GREEK[lower];
      insertAtCursor(target, e.key === lower ? g : g.toUpperCase());
    } else if (KEY_TO_MARK[e.key]) {
      e.preventDefault();
      markBeforeCursor(target, KEY_TO_MARK[e.key]);
    } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab' || /^[.,;:!?'"·]$/.test(e.key)) {
      // The word just ended: a σ before the cursor becomes ς. The key itself
      // (space, Enter, punctuation) then goes through as normal.
      const pos = target.selectionStart ?? 0;
      if (target.value.slice(pos - 1, pos) === 'σ') target.setRangeText('ς', pos - 1, pos, 'end');
    }
  });

  return h('div', { class: 'gkb' },
    h('div', { class: 'gkb-head' },
      h('span', {}, 'Greek keyboard'),
      h('label', { class: 'gkb-toggle' }, 'Type Greek', sw)),
    ...ROWS.map((row, i) => h('div', { class: 'krow' },
      i === 2 ? shiftKey : null,
      ...row.map(letter),
      i === 2 ? key('⌫', () => backspace(target), 'wide', 'Delete') : null)),
    h('div', { class: 'krow' },
      ...MARKS.map(([m, label, title]) => key(label, () => markBeforeCursor(target, m), 'm', title)),
      key('space', () => insertAtCursor(target, ' '), 'space', 'Space')),
    h('p', { class: 'gkb-help' },
      'Marks go on the letter before the cursor. With Type Greek on: a α, h η, q θ, x ξ, c χ, y ψ, w ω; ',
      h('kbd', {}, '/'), ' ', h('kbd', {}, '\\'), ' ', h('kbd', {}, '='), ' accents, ',
      h('kbd', {}, ')'), ' ', h('kbd', {}, '('), ' breathings, ', h('kbd', {}, '|'), ' iota subscript. ',
      h('kbd', {}, '⌥G'), ' switches.'));
}
