/**
 * greek.ts: small, pure helpers for handling Greek text.
 *
 * Everything here is a pure function (no DOM, no storage), so it is easy to
 * unit test (see greek.test.ts) and safe to reuse in every future module
 * (vocabulary, paradigms, parsing, the verse reader).
 *
 * THE ONE THING TO UNDERSTAND ABOUT GREEK IN UNICODE
 * --------------------------------------------------
 * A letter with accents can be stored two ways:
 *   - "precomposed" (NFC): one code point, e.g. "ά" = U+03AC
 *   - "decomposed"  (NFD): base letter + combining marks, e.g. "α" + U+0301
 * Two strings that LOOK identical can therefore compare as different.
 * Rule used throughout this app: normalize before comparing.
 *   - To strip marks: convert to NFD, delete the combining marks, done.
 *   - To store or display: convert to NFC.
 */

/* ------------------------------------------------------------------ */
/* Combining marks that appear in New Testament Greek                  */
/* ------------------------------------------------------------------ */

/** U+0301 acute accent ( ´ ), e.g. λόγος */
export const ACUTE = '́';
/** U+0300 grave accent ( ` ), e.g. καὶ */
export const GRAVE = '̀';
/** U+0342 circumflex ( ῀ ), e.g. ἀρχῇ, φῶς */
export const CIRCUMFLEX = '͂';
/** U+0313 smooth breathing ( ᾿ ): no sound, e.g. ἐν */
export const SMOOTH = '̓';
/** U+0314 rough breathing ( ῾ ): adds an "h" sound, e.g. ὁ = "ho" */
export const ROUGH = '̔';
/** U+0345 iota subscript ( ͅ ): written under a vowel, not pronounced */
export const IOTA_SUBSCRIPT = 'ͅ';
/** U+0308 diaeresis ( ¨ ): the two vowels are pronounced separately */
export const DIAERESIS = '̈';

/** Every combining mark we remove when we want "bare letters". */
const ALL_MARKS = /[̀-ͯ]/g;

/**
 * Remove every accent, breathing mark and subscript, and lower-case.
 * Example: stripMarks("Ἀρχῇ") === "αρχη"
 *
 * Used to compare what the learner typed with the expected answer while
 * the drill is only testing letters, not accents (accents come in ch. 3).
 */
export function stripMarks(text: string): string {
  return text.normalize('NFD').replace(ALL_MARKS, '').toLowerCase().normalize('NFC');
}

/**
 * Greek has two lowercase forms of sigma:
 *   σ  in the middle of a word,
 *   ς  at the end of a word ("final sigma").
 * Learners (and our on-screen keyboard) often type σ everywhere. This fixes
 * the ending so that "λογοσ" becomes "λογος".
 *
 * A sigma is "final" when the next character is not a Greek letter
 * (end of string, space, punctuation). Combining marks do not count as
 * letters, which is why we test the next *base* character.
 */
export function fixFinalSigma(text: string): string {
  return text.replace(/σ(?![Ͱ-Ͽἀ-῿])/g, 'ς');
}

/* ------------------------------------------------------------------ */
/* Transliteration (Mounce's scheme, Basics of Biblical Greek ch. 2)   */
/* ------------------------------------------------------------------ */

/**
 * Letter-by-letter transliteration used by Mounce.
 * Notes on the less obvious ones:
 *   η -> ē and ω -> ō : the macron marks the LONG vowel (eta, omega),
 *                       to keep them apart from ε (e) and ο (o).
 *   υ -> u            : Mounce writes "u" (some books write "y").
 *   θ -> th, φ -> ph, χ -> ch, ψ -> ps : one Greek letter, two English ones.
 *   ξ -> x            : ξ sounds like the "x" in "axiom".
 */
export const TRANSLIT: Record<string, string> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'u', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
};

/** Letters that make gamma nasal ("gamma nasal", Mounce 2.6): γγ, γκ, γξ, γχ. */
const GAMMA_NASAL_TRIGGERS = new Set(['γ', 'κ', 'ξ', 'χ']);

/**
 * Transliterate one Greek word (or a phrase) into Latin letters.
 *
 * Rules implemented, in the order they apply:
 *   1. Rough breathing anywhere in a word means the word starts with "h".
 *      (On a diphthong the mark sits on the SECOND vowel, as in οὗτος,
 *      but the h sound still comes first: "houtos".)
 *      On rho it becomes "rh": ῥῆμα -> "rhēma".
 *   2. Gamma before γ, κ, ξ, χ is pronounced (and written) "n":
 *      ἄγγελος -> "angelos".
 *   3. Everything else maps letter by letter through TRANSLIT.
 *   4. Accents, smooth breathing and iota subscript are dropped.
 *   5. Apostrophes of elision (δι’) are dropped.
 *
 * Examples: λόγος -> logos, ἀρχῇ -> archē, ὁ -> ho, ἀνθρώπων -> anthrōpōn
 */
export function transliterate(text: string): string {
  return text
    .split(/(\s+)/) // keep the whitespace so phrases survive
    .map((token) => (/\s/.test(token) ? token : transliterateWord(token)))
    .join('');
}

function transliterateWord(word: string): string {
  const decomposed = word.normalize('NFD');
  const hasRough = decomposed.includes(ROUGH);
  const letters = stripMarks(word).replace(/[’'ʼ᾽]/g, '');

  let out = '';
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i];
    const next = letters[i + 1];
    if (ch === 'γ' && next && GAMMA_NASAL_TRIGGERS.has(next)) {
      out += 'n';
    } else {
      out += TRANSLIT[ch] ?? ch; // punctuation passes through unchanged
    }
  }

  if (hasRough) {
    // ῥ -> "rh", every other rough breathing -> a leading "h".
    out = letters.startsWith('ρ') ? 'rh' + out.slice(1) : 'h' + out;
  }
  return out;
}

/**
 * Loosen a transliteration so small differences are not marked wrong:
 *   - macrons are optional (e == ē, o == ō), since they are hard to type,
 *   - "y" is accepted for upsilon (many books use it),
 *   - case and surrounding spaces do not matter.
 * Used by the "sound it out" drill to compare the learner's answer.
 */
export function looseTranslit(text: string): string {
  return text
    .normalize('NFD')
    .replace(ALL_MARKS, '')
    .toLowerCase()
    .replace(/y/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Greek keyboard                                                       */
/* ------------------------------------------------------------------ */

/**
 * The standard Greek keyboard layout (the one macOS, iOS and Windows use
 * when you add "Greek" as an input source). Key = the Latin key you press,
 * value = the Greek letter it produces.
 *
 * Most keys are "the obvious letter" (a->α, b->β, d->δ ...). The ones to
 * memorise are the leftovers:
 *   u->θ  j->ξ  h->η  c->ψ  v->ω  x->χ  y->υ  f->φ  w->ς (final sigma)
 * The typing drill teaches exactly this layout, so the skill carries over
 * to typing Greek anywhere on the Mac once the Greek input source is on.
 */
export const GREEK_KEYBOARD: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', u: 'θ',
  i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', j: 'ξ', o: 'ο', p: 'π',
  r: 'ρ', s: 'σ', w: 'ς', t: 'τ', y: 'υ', f: 'φ', x: 'χ', c: 'ψ', v: 'ω',
};

/** Reverse map: Greek letter -> the Latin key that types it. */
export const KEY_FOR_GREEK: Record<string, string> = Object.fromEntries(
  Object.entries(GREEK_KEYBOARD).map(([latin, greek]) => [greek, latin]),
);

/**
 * Convert a single key press to Greek.
 * Returns the key unchanged if it is not on the map (e.g. already Greek,
 * because the Mac's own Greek input source is switched on).
 */
export function keyToGreek(key: string): string {
  const lower = key.toLowerCase();
  const greek = GREEK_KEYBOARD[lower];
  if (!greek) return key;
  return key === lower ? greek : greek.toUpperCase();
}
