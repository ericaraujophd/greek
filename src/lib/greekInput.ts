/**
 * greekInput.ts: typing polytonic Greek into a text box.
 *
 * Used by the on-screen Greek keyboard (components/greekKeyboard.ts) and by
 * "Type Greek" mode, where your own keyboard types Greek letters.
 *
 * THREE JOBS
 *   1. Latin key -> Greek letter (LATIN_TO_GREEK). The layout follows the
 *      transliteration you learn in Mounce, so it is easy to guess:
 *      a α, b β, g γ, d δ, e ε, z ζ, h η, q θ, i ι, k κ, l λ, m μ, n ν,
 *      x ξ, o ο, p π, r ρ, s σ, t τ, u υ, f φ, c χ, y ψ, w ω.
 *      The few that are not obvious: q = θ, c = χ, y = ψ, h = η, w = ω.
 *   2. Accents and breathings, typed AFTER the letter (like Beta Code,
 *      which many Greek tools use):
 *        /  acute ά      \  grave ὰ      =  circumflex ᾶ
 *        )  smooth ἀ     (  rough ἁ      |  iota subscript ᾳ
 *        +  diaeresis ϊ
 *      Typing the same mark again removes it. A new accent replaces the old
 *      accent, and a new breathing replaces the old breathing.
 *   3. Final sigma: σ at the end of a word becomes ς by itself, and turns
 *      back into σ if you keep typing the word.
 *
 * HOW MARKS ARE ADDED (the tricky part)
 *   Unicode can store ἄ either as one precomposed character or as α plus
 *   "combining" marks. We take the letter before the cursor apart
 *   (normalize 'NFD'), add or remove one mark, put the marks back in the
 *   conventional order (diaeresis, breathing, accent, iota subscript), and
 *   recompose (normalize 'NFC'), so the result is the same single character
 *   the Greek New Testament text uses, and searching works.
 */

export const LATIN_TO_GREEK: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν',
  x: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', c: 'χ', y: 'ψ', w: 'ω',
};

/** The combining characters for each mark. */
export const MARK = {
  acute: '́',
  grave: '̀',
  circumflex: '͂',
  smooth: '̓',
  rough: '̔',
  iota: 'ͅ',
  diaeresis: '̈',
} as const;
export type MarkName = keyof typeof MARK;

/** Beta Code style keys for marks in Type Greek mode. */
export const KEY_TO_MARK: Record<string, MarkName> = {
  '/': 'acute', '\\': 'grave', '=': 'circumflex', ')': 'smooth', '(': 'rough', '|': 'iota', '+': 'diaeresis',
};

const ACCENTS = [MARK.acute, MARK.grave, MARK.circumflex];
const BREATHINGS = [MARK.smooth, MARK.rough];
/** Canonical order of marks after the base letter. */
const ORDER = [MARK.diaeresis, ...BREATHINGS, ...ACCENTS, MARK.iota];

const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/;
export function isGreekLetter(ch: string): boolean {
  return GREEK_LETTER.test(ch) && /\p{L}/u.test(ch);
}

/**
 * Add (or remove, if already there) one mark on a single Greek letter.
 * Returns the letter unchanged if it is not a Greek letter.
 */
export function withMark(letter: string, mark: MarkName): string {
  if (!isGreekLetter(letter)) return letter;
  const parts = [...letter.normalize('NFD')];
  const base = parts[0];
  let marks = parts.slice(1);
  const m = MARK[mark];
  if (marks.includes(m)) {
    marks = marks.filter((x) => x !== m); // same key twice: take it off
  } else {
    if (ACCENTS.includes(m as never)) marks = marks.filter((x) => !ACCENTS.includes(x as never));
    if (BREATHINGS.includes(m as never)) marks = marks.filter((x) => !BREATHINGS.includes(x as never));
    marks.push(m);
  }
  marks.sort((a, b) => ORDER.indexOf(a as never) - ORDER.indexOf(b as never));
  return (base + marks.join('')).normalize('NFC');
}

/**
 * Insert text at the cursor of a textarea or input, keeping final sigma
 * right, and tell the page the text changed (so autosave runs).
 */
export function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement, text: string): void {
  let start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const prev = before.slice(-1);
  // Final sigma: fix the letter before the cursor depending on what comes next.
  if (prev === 'σ' && !isGreekLetter(text[0])) { el.setRangeText('ς', start - 1, start, 'end'); }
  if (prev === 'ς' && isGreekLetter(text[0])) { el.setRangeText('σ', start - 1, start, 'end'); }
  start = el.selectionStart ?? start;
  el.setRangeText(text, start, Math.max(start, end), 'end');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Put a mark on the letter just before the cursor. */
export function markBeforeCursor(el: HTMLTextAreaElement | HTMLInputElement, mark: MarkName): void {
  const pos = el.selectionStart ?? el.value.length;
  if (pos === 0) return;
  const prev = el.value.slice(pos - 1, pos);
  const next = withMark(prev, mark);
  if (next === prev) return;
  el.setRangeText(next, pos - 1, pos, 'end');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Delete the character before the cursor (on-screen backspace). */
export function backspace(el: HTMLTextAreaElement | HTMLInputElement): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  if (start !== end) el.setRangeText('', start, end, 'end');
  else if (start > 0) {
    // Remove one whole character, including any combining marks after it.
    const before = [...el.value.slice(0, start).normalize('NFC')];
    const keep = before.slice(0, -1).join('');
    el.value = keep + el.value.slice(start);
    el.setSelectionRange(keep.length, keep.length);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * For searching: lowercase, no accents or breathings, ς as σ. So "λογος"
 * finds λόγος, Λόγος and λόγου's stem alike.
 */
export function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ͂-ͅ]/g, '').toLowerCase().replace(/ς/g, 'σ');
}
