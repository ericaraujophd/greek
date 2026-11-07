/**
 * reader.ts: real New Testament verses at your level (#/read, #/read/u06).
 *
 * WHERE THE VERSES COME FROM
 *   scripts/build-data.ts picks verses from MorphGNT (the SBLGNT text with
 *   parsing) in which most words are already in your vocabulary by a unit,
 *   and writes them to src/content/generated/readings.json. Each word comes
 *   with its lemma and parsing, so nothing here is guessed.
 *
 * ON THE PAGE
 *   Words you have not learned yet are underlined with dots. Tap any word to
 *   see its form, parsing, dictionary form and meaning: the course gloss if
 *   you have learned it, otherwise a short gloss from the Dodson lexicon
 *   (public domain), marked as such.
 *
 * Which unit? By default the latest unit you have opened; the selector
 * switches to any unit that has readings.
 */
import { h, mount } from '../lib/dom';
import { appHeader, listenButton } from '../components/layout';
import { isStarted } from '../lib/progress';
import { LEXICON } from '../content/questions';
import { UNITS, unitById, wordsThrough } from '../content/units';
import readingsJson from '../content/generated/readings.json';

type ReadingWord = [text: string, lemma: string, pos: string, parse: string];
interface Reading { ref: string; label: string; known: number; words: ReadingWord[] }
const READINGS = readingsJson as unknown as Record<string, Reading[]>;

/* --------------------------- MorphGNT codes --------------------------- */
/* pos: two letters ("N-" noun, "RA" article, "V-" verb ...).              */
/* parse: 8 positions: person, tense, voice, mood, case, number, gender,   */
/* degree; "-" where it does not apply.                                    */

const POS: Record<string, string> = {
  'A-': 'adjective', 'C-': 'conjunction', 'D-': 'adverb', 'I-': 'interjection', 'N-': 'noun', 'P-': 'preposition',
  'RA': 'article', 'RD': 'demonstrative pronoun', 'RI': 'interrogative pronoun', 'RP': 'personal pronoun',
  'RR': 'relative pronoun', 'V-': 'verb', 'X-': 'particle',
};
const PARSE: Array<Record<string, string>> = [
  { 1: '1st person', 2: '2nd person', 3: '3rd person' },
  { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', X: 'perfect', Y: 'pluperfect' },
  { A: 'active', M: 'middle', P: 'passive' },
  { I: 'indicative', D: 'imperative', S: 'subjunctive', O: 'optative', N: 'infinitive', P: 'participle' },
  { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' },
  { S: 'singular', P: 'plural' },
  { M: 'masculine', F: 'feminine', N: 'neuter' },
  { C: 'comparative', S: 'superlative' },
];

/** "N-", "----GSM-" -> "noun · genitive singular masculine". */
export function describeParse(pos: string, parse: string): string {
  const parts = [...parse].map((ch, i) => PARSE[i][ch]).filter(Boolean);
  return [POS[pos] ?? pos, parts.join(' ')].filter(Boolean).join(' · ');
}

/** The unit to open by default: the latest one opened that has readings. */
function defaultUnit(): string | undefined {
  const withReadings = UNITS.filter((u) => READINGS[u.id]?.length);
  return [...withReadings].reverse().find((u) => isStarted(u.id))?.id ?? withReadings[0]?.id;
}

export function readerView(params: { unit?: string }): Node {
  const unitId = params.unit && READINGS[params.unit] ? params.unit : defaultUnit();
  const main = h('main', { class: 'page wrap stack fade-in', style: 'gap:22px' });
  const page = h('div', {}, appHeader(), main);

  if (!unitId) {
    mount(main, h('div', { class: 'panel' }, h('p', {}, 'Readings start with unit 5, once you know some nouns and the article.')));
    return page;
  }
  const unit = unitById(unitId);
  const learned = new Map(wordsThrough(unit.n).map((w) => [w.lemma, w]));
  const readings = READINGS[unitId];

  // The unit picker: every unit that has readings.
  const picker = h('select', { 'aria-label': 'Readings for unit', onchange: (e: Event) => { location.hash = `#/read/${(e.target as HTMLSelectElement).value}`; } },
    ...UNITS.filter((u) => READINGS[u.id]?.length).map((u) =>
      h('option', { value: u.id, selected: u.id === unitId }, `After unit ${u.n}: ${u.title}`)));

  // The word panel, filled when a word is tapped.
  const panel = h('aside', { class: 'panel stack', style: 'gap:8px;position:sticky;top:84px', 'aria-live': 'polite' },
    h('span', { class: 'muted' }, 'Tap a word to see what it is.'));
  let selected: HTMLElement | null = null;

  function show(btn: HTMLElement, [text, lemma, pos, parse]: ReadingWord) {
    selected?.classList.remove('sel');
    btn.classList.add('sel');
    selected = btn;
    const course = learned.get(lemma);
    const lex = LEXICON[lemma];
    const form = text.replace(/[.,;·:]/g, '');
    mount(panel, h('div', { class: 'stack fade-in', style: 'gap:8px' },
      h('div', { class: 'row', style: 'align-items:center' }, h('span', { class: 'greek', style: 'font-size:34px' }, form), listenButton(form)),
      h('div', { class: 'small' }, describeParse(pos, parse)),
      h('div', {}, 'from ', h('b', { class: 'greek', style: 'font-size:20px' }, lemma)),
      course
        ? h('div', {}, h('b', {}, course.gloss), h('span', { class: 'pill', style: 'margin-left:8px' }, 'learned'))
        : h('div', {}, lex?.g ?? 'no gloss', h('div', { class: 'tiny muted' }, 'Not learned yet. Gloss from the Dodson lexicon.')),
      lex ? h('div', { class: 'tiny muted' }, `${lex.f} times in the NT`) : null));
  }

  const verses = readings.map((r) => h('section', { class: 'panel stack', style: 'gap:10px' },
    h('div', { class: 'row', style: 'align-items:baseline' },
      h('b', { class: 'serif', style: 'font-size:20px' }, r.label),
      h('span', { class: 'small muted', style: 'margin-left:auto' }, `${r.known}% of the words learned`)),
    h('p', { class: 'verse greek', lang: 'grc' },
      ...r.words.flatMap((w, i) => {
        const b = h('button', { class: `w${learned.has(w[1]) ? '' : ' unknown'}`, type: 'button', onclick: () => show(b, w) }, w[0]);
        return i ? [' ', b] : [b];
      }))));

  mount(main, h('div', { class: 'stack', style: 'gap:22px' },
    h('div', { class: 'row', style: 'align-items:baseline' },
      h('h1', { class: 'serif', style: 'margin:0;font-size:34px' }, 'Read'),
      h('span', { class: 'muted' }, 'Verses where most words are ones you know'),
      h('span', { style: 'margin-left:auto' }, picker)),
    h('div', { class: 'reader-grid', style: 'display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:22px;align-items:start' },
      h('div', { class: 'stack', style: 'gap:16px' }, ...verses),
      panel),
    h('p', { class: 'tiny muted' }, 'Text: SBL Greek New Testament (SBLGNT), via MorphGNT, CC BY-SA. Dotted underline: not learned yet.')));
  return page;
}
