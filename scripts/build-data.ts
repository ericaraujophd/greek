/**
 * build-data.ts: turn the open New Testament data in data/ into the small
 * JSON files the website loads (src/content/generated/).
 *
 * Run it whenever the course word lists change:   npm run build:data
 *
 * INPUTS (both open data, both kept in the repo under data/)
 *   data/morphgnt/*.txt   MorphGNT: every word of the SBL Greek New
 *                         Testament with its lemma and full parsing.
 *                         Parsing CC BY-SA (James Tauber et al.); SBLGNT text
 *                         © Society of Biblical Literature and Logos.
 *   data/dodson.csv       Dodson's Greek lexicon, brief English glosses,
 *                         public domain (CC0). Used only for the "help" glosses
 *                         of words a student has NOT learned yet in the reader.
 *
 * OUTPUTS
 *   generated/lexicon.json   lemma -> { f: NT frequency, g: Dodson gloss }
 *                            for every lemma used 5+ times, plus every course word.
 *   generated/forms.json     lemma -> [[form, parse code, count], ...] for course
 *                            words and the article: the real forms used in
 *                            parsing drills (no made-up forms, all accented).
 *   generated/readings.json  per unit: the NT verses with the highest share of
 *                            words the student knows by then, each word tagged
 *                            with lemma and parsing for tap-to-help.
 *
 * MorphGNT LINE FORMAT (space separated)
 *   040101 N- ----DSF- ἀρχῇ ἀρχῇ ἀρχῇ ἀρχή
 *   ^bbccvv ^pos ^parse ^text-with-punct ^word ^normalized ^lemma
 *   parse = person, tense, voice, mood, case, number, gender, degree
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { UNITS, wordsThrough } from '../src/content/units';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'src/content/generated');
mkdirSync(OUT, { recursive: true });

/* ------------------------------ read MorphGNT ------------------------------ */

interface Token { ref: string; pos: string; parse: string; text: string; word: string; norm: string; lemma: string }

const BOOKS: Record<string, string> = {
  '01': 'Matthew', '02': 'Mark', '03': 'Luke', '04': 'John', '05': 'Acts', '06': 'Romans', '07': '1 Corinthians',
  '08': '2 Corinthians', '09': 'Galatians', '10': 'Ephesians', '11': 'Philippians', '12': 'Colossians',
  '13': '1 Thessalonians', '14': '2 Thessalonians', '15': '1 Timothy', '16': '2 Timothy', '17': 'Titus',
  '18': 'Philemon', '19': 'Hebrews', '20': 'James', '21': '1 Peter', '22': '2 Peter', '23': '1 John',
  '24': '2 John', '25': '3 John', '26': 'Jude', '27': 'Revelation',
};

const tokens: Token[] = [];
const dir = join(ROOT, 'data/morphgnt');
for (const file of readdirSync(dir).filter((f) => f.endsWith('-morphgnt.txt')).sort()) {
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    const p = line.trim().split(' ');
    if (p.length < 7) continue;
    // norm = the word with a grave accent turned back to acute (τὸν -> τόν), as
    // a dictionary or paradigm writes it. Drills use norm; readings use text.
    tokens.push({ ref: p[0], pos: p[1], parse: p[2], text: p[3], word: p[4], norm: p[5], lemma: p[6].normalize('NFC') });
  }
}
console.log(`MorphGNT: ${tokens.length} words`);

/** "040101" -> "John 1:1" */
function refLabel(ref: string): string {
  return `${BOOKS[ref.slice(0, 2)]} ${Number(ref.slice(2, 4))}:${Number(ref.slice(4, 6))}`;
}

/* ------------------------------ frequencies ------------------------------ */

const freq = new Map<string, number>();
for (const t of tokens) freq.set(t.lemma, (freq.get(t.lemma) ?? 0) + 1);

/* ------------------------------ Dodson glosses ------------------------------ */

/**
 * Dodson spells Greek in Beta Code (ASCII): a)/lfa = ἄλφα. Letters map one to
 * one; ) ( / \ = | + after a letter are smooth breathing, rough breathing,
 * acute, grave, circumflex, iota subscript, diaeresis; * before a letter
 * (with its marks in between) makes it a capital.
 */
const BETA_LETTERS: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ',
  n: 'ν', c: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', x: 'χ', y: 'ψ', w: 'ω', v: 'ϝ',
};
const BETA_MARKS: Record<string, string> = {
  ')': '̓', '(': '̔', '/': '́', '\\': '̀', '=': '͂', '|': 'ͅ', '+': '̈',
};

export function betaToUnicode(beta: string): string {
  let out = '';
  for (let i = 0; i < beta.length; i++) {
    const ch = beta[i];
    if (ch === '*') {
      // Capital: collect marks that come before the letter, then the letter.
      let marks = '';
      i++;
      while (i < beta.length && BETA_MARKS[beta[i]]) marks += BETA_MARKS[beta[i++]];
      const letter = BETA_LETTERS[beta[i]?.toLowerCase()] ?? '';
      out += letter.toUpperCase() + marks;
    } else if (BETA_LETTERS[ch.toLowerCase()]) {
      out += BETA_LETTERS[ch.toLowerCase()];
    } else if (BETA_MARKS[ch]) {
      out += BETA_MARKS[ch];
    } else {
      out += ch;
    }
  }
  // Final sigma, then compose accents into single characters.
  return out.replace(/σ(?![̀-ͯα-ωϝ])/g, 'ς').normalize('NFC');
}

const dodson = new Map<string, string>();
const csv = readFileSync(join(ROOT, 'data/dodson.csv'), 'utf8').split('\n').slice(1);
for (const row of csv) {
  const cells = row.split('\t').map((c) => c.replace(/^"|"$/g, ''));
  if (cells.length < 4) continue;
  const lemma = betaToUnicode(cells[2].split(',')[0].trim());
  if (!dodson.has(lemma)) dodson.set(lemma, cells[3].trim());
}
console.log(`Dodson: ${dodson.size} entries`);

/* ------------------------------ course words ------------------------------ */

const courseWords = wordsThrough(UNITS.length);
const courseLemmas = new Set(courseWords.map((w) => w.lemma.normalize('NFC')));
const missing = [...courseLemmas].filter((l) => !freq.has(l));
if (missing.length) console.warn('WARNING: course words not found in MorphGNT (check spelling/accents):', missing.join(', '));

/* lexicon.json */
const lexicon: Record<string, { f: number; g: string }> = {};
for (const [lemma, f] of freq) {
  if (f >= 5 || courseLemmas.has(lemma)) lexicon[lemma] = { f, g: dodson.get(lemma) ?? '' };
}
writeFileSync(join(OUT, 'lexicon.json'), JSON.stringify(lexicon));

/* forms.json: real attested forms for course words and the article */
const formsWanted = new Set([...courseLemmas, 'ὁ']);
const forms: Record<string, Record<string, [string, number]>> = {};
for (const t of tokens) {
  if (!formsWanted.has(t.lemma)) continue;
  // Key by form+parse so that one spelling with two parsings stays two entries.
  const word = t.norm.normalize('NFC');
  const key = `${word}|${t.parse}`;
  forms[t.lemma] ??= {};
  const cur = forms[t.lemma][key];
  forms[t.lemma][key] = [t.pos, (cur?.[1] ?? 0) + 1];
}
const formsOut: Record<string, Array<[string, string, string, number]>> = {};
for (const [lemma, map] of Object.entries(forms)) {
  formsOut[lemma] = Object.entries(map)
    .map(([key, [pos, n]]) => { const [w, parse] = key.split('|'); return [w, pos, parse, n] as [string, string, string, number]; })
    .sort((a, b) => b[3] - a[3]);
}
writeFileSync(join(OUT, 'forms.json'), JSON.stringify(formsOut));

/* ------------------------------ readings ------------------------------ */

/**
 * Which tokens count as "known" after a unit:
 *   - the lemma is in a course word list up to that unit, or is the article;
 *   - AND its part of speech has been taught by then (see UNITS[n].grammar):
 *     verbs other than εἰμί only count once present-tense verbs are taught.
 * A verse's score is the share of known words; we keep the best few, preferring
 * famous books (Gospels, John's letters) when scores tie.
 */
const byVerse = new Map<string, Token[]>();
for (const t of tokens) {
  const list = byVerse.get(t.ref) ?? [];
  list.push(t);
  byVerse.set(t.ref, list);
}

const PREFERRED = ['04', '23', '01', '02', '03', '06', '10'];

/**
 * Hand-picked verses shown first for a unit, before the automatic picks.
 * Mark 1:1 is a string of genitives, ideal right after ch. 7; John 1:1 is
 * the classic first verse. Refs are MorphGNT's bbccvv.
 */
const CURATED: Record<string, string[]> = {
  u06: ['020101', '040101'],
  u07: ['020101', '040101', '040102'],
  u08: ['040101', '040102', '230408'],
};

const readings: Record<string, Array<{ ref: string; label: string; known: number; words: Array<[string, string, string, string]> }>> = {};
for (const unit of UNITS) {
  if (!unit.readingsFrom) continue;
  const known = new Set(wordsThrough(unit.n).map((w) => w.lemma.normalize('NFC')));
  known.add('ὁ');
  const verbsOk = unit.grammar.includes('verbs');
  const candidates: Array<{ ref: string; score: number }> = [];
  for (const [ref, words] of byVerse) {
    if (words.length < 5 || words.length > 22) continue;
    const ok = words.filter((w) => known.has(w.lemma) && (w.pos !== 'V-' || verbsOk || w.lemma === 'εἰμί')).length;
    candidates.push({ ref, score: ok / words.length });
  }
  candidates.sort((a, b) => b.score - a.score
    || (PREFERRED.indexOf(a.ref.slice(0, 2)) + 1 || 99) - (PREFERRED.indexOf(b.ref.slice(0, 2)) + 1 || 99));
  const scoreOf = new Map(candidates.map((c) => [c.ref, c.score]));
  const curated = (CURATED[unit.id] ?? []).map((ref) => ({ ref, score: scoreOf.get(ref) ?? 0 }));
  const picks = [...curated, ...candidates.filter((c) => !curated.some((k) => k.ref === c.ref))].slice(0, 6);
  readings[unit.id] = picks.map(({ ref, score }) => ({
    ref, label: refLabel(ref), known: Math.round(score * 100),
    // [text with punctuation, lemma, pos, parse]
    // The SBLGNT marks textual variants with signs like ⸀ ⸂ ⸃; they mean nothing to
    // a beginner, so they are removed here.
    words: byVerse.get(ref)!.map((w) => [w.text.replace(/[\u2E00-\u2E05]/g, '').normalize('NFC'), w.lemma, w.pos, w.parse] as [string, string, string, string]),
  }));
}
writeFileSync(join(OUT, 'readings.json'), JSON.stringify(readings));

console.log(`wrote lexicon (${Object.keys(lexicon).length}), forms (${Object.keys(formsOut).length} lemmas), readings (${Object.keys(readings).length} units)`);
