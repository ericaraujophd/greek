/**
 * data.ts: the Greek alphabet, as Mounce teaches it (BBG ch. 2).
 *
 * Pronunciation is ERASMIAN, the academic pronunciation used by Mounce and
 * by the seminary. It is NOT how Greek is spoken in Greece today (modern
 * Greek pronounces η, ι, υ, ει, οι all as "ee", β as "v", and so on). That
 * is why this app has no text-to-speech: browser Greek voices are modern
 * Greek and would teach the wrong sounds. Use Mounce's free vocabulary audio
 * for listening practice.
 *
 * The letters are split into four BATCHES of six, in alphabet order. The
 * learn screen and the flashcards introduce one batch at a time, so each
 * 30-minute session has a small, finishable goal.
 */

export interface Letter {
  /** Stable id used in progress data. Never change once in use. */
  id: string;
  /** Lowercase form. For sigma this is the medial form σ. */
  lower: string;
  /** Capital form. */
  upper: string;
  /** English name, spelled as Mounce spells it. */
  name: string;
  /** Mounce's transliteration. */
  translit: string;
  /** How to pronounce it, as a short hint with an English example. */
  sound: string;
  /** Anything special: look-alikes, alternative forms, exceptions. */
  note?: string;
  /** A real NT word that shows the letter, with its transliteration. */
  example: { greek: string; translit: string; gloss: string };
  /** Which batch of six (1 to 4) introduces this letter. */
  batch: 1 | 2 | 3 | 4;
}

export const LETTERS: Letter[] = [
  // ---------------- Batch 1: α β γ δ ε ζ ----------------
  { id: 'alpha', lower: 'α', upper: 'Α', name: 'alpha', translit: 'a', sound: 'a as in father',
    example: { greek: 'ἀγάπη', translit: 'agapē', gloss: 'love' }, batch: 1 },
  { id: 'beta', lower: 'β', upper: 'Β', name: 'beta', translit: 'b', sound: 'b as in Bible',
    example: { greek: 'βίβλος', translit: 'biblos', gloss: 'book' }, batch: 1 },
  { id: 'gamma', lower: 'γ', upper: 'Γ', name: 'gamma', translit: 'g', sound: 'g as in gone',
    note: 'Lowercase γ hangs below the line and looks like an English y. Before γ, κ, ξ or χ it sounds like n ("gamma nasal"): ἄγγελος = angelos.',
    example: { greek: 'γραφή', translit: 'graphē', gloss: 'writing, Scripture' }, batch: 1 },
  { id: 'delta', lower: 'δ', upper: 'Δ', name: 'delta', translit: 'd', sound: 'd as in dog',
    example: { greek: 'δόξα', translit: 'doxa', gloss: 'glory' }, batch: 1 },
  { id: 'epsilon', lower: 'ε', upper: 'Ε', name: 'epsilon', translit: 'e', sound: 'e as in met',
    note: 'Short e. Do not confuse with eta (η), the long e.',
    example: { greek: 'ἐγώ', translit: 'egō', gloss: 'I' }, batch: 1 },
  { id: 'zeta', lower: 'ζ', upper: 'Ζ', name: 'zeta', translit: 'z', sound: 'z as in daze',
    note: 'Compare ξ (xi), which has an extra loop at the top.',
    example: { greek: 'ζωή', translit: 'zōē', gloss: 'life' }, batch: 1 },

  // ---------------- Batch 2: η θ ι κ λ μ ----------------
  { id: 'eta', lower: 'η', upper: 'Η', name: 'eta', translit: 'ē', sound: 'e as in obey',
    note: 'Looks like an English n with a long tail. The capital Η looks like H but is a vowel.',
    example: { greek: 'ἡμέρα', translit: 'hēmera', gloss: 'day' }, batch: 2 },
  { id: 'theta', lower: 'θ', upper: 'Θ', name: 'theta', translit: 'th', sound: 'th as in thing',
    example: { greek: 'θεός', translit: 'theos', gloss: 'God' }, batch: 2 },
  { id: 'iota', lower: 'ι', upper: 'Ι', name: 'iota', translit: 'i', sound: 'i as in intrigue (long) or sit (short)',
    note: 'No dot on top. Can be written under a vowel as a small "iota subscript" (ᾳ, ῃ, ῳ), which is not pronounced.',
    example: { greek: 'ἱερόν', translit: 'hieron', gloss: 'temple' }, batch: 2 },
  { id: 'kappa', lower: 'κ', upper: 'Κ', name: 'kappa', translit: 'k', sound: 'k as in kitchen',
    example: { greek: 'κύριος', translit: 'kurios', gloss: 'Lord' }, batch: 2 },
  { id: 'lambda', lower: 'λ', upper: 'Λ', name: 'lambda', translit: 'l', sound: 'l as in law',
    example: { greek: 'λόγος', translit: 'logos', gloss: 'word' }, batch: 2 },
  { id: 'mu', lower: 'μ', upper: 'Μ', name: 'mu', translit: 'm', sound: 'm as in mother',
    example: { greek: 'μαθητής', translit: 'mathētēs', gloss: 'disciple' }, batch: 2 },

  // ---------------- Batch 3: ν ξ ο π ρ σ ----------------
  { id: 'nu', lower: 'ν', upper: 'Ν', name: 'nu', translit: 'n', sound: 'n as in new',
    note: 'Lowercase ν looks like an English v, but it is an n. Compare υ (upsilon), which is rounded at the bottom.',
    example: { greek: 'νόμος', translit: 'nomos', gloss: 'law' }, batch: 3 },
  { id: 'xi', lower: 'ξ', upper: 'Ξ', name: 'xi', translit: 'x', sound: 'x as in axiom',
    note: 'Compare ζ (zeta). Xi has the extra squiggle.',
    example: { greek: 'δόξα', translit: 'doxa', gloss: 'glory' }, batch: 3 },
  { id: 'omicron', lower: 'ο', upper: 'Ο', name: 'omicron', translit: 'o', sound: 'o as in not',
    note: 'Short o ("o-micron" = small o). Compare omega ω, the long o ("o-mega" = big o).',
    example: { greek: 'οἶκος', translit: 'oikos', gloss: 'house' }, batch: 3 },
  { id: 'pi', lower: 'π', upper: 'Π', name: 'pi', translit: 'p', sound: 'p as in pray',
    example: { greek: 'πίστις', translit: 'pistis', gloss: 'faith' }, batch: 3 },
  { id: 'rho', lower: 'ρ', upper: 'Ρ', name: 'rho', translit: 'r', sound: 'r as in rod',
    note: 'Lowercase ρ looks like an English p, but it is an r. The capital Ρ looks like P.',
    example: { greek: 'ῥῆμα', translit: 'rhēma', gloss: 'word, saying' }, batch: 3 },
  { id: 'sigma', lower: 'σ', upper: 'Σ', name: 'sigma', translit: 's', sound: 's as in study',
    note: 'Two lowercase forms: σ in the middle of a word, ς at the end (λόγος).',
    example: { greek: 'σῶμα', translit: 'sōma', gloss: 'body' }, batch: 3 },

  // ---------------- Batch 4: τ υ φ χ ψ ω ----------------
  { id: 'tau', lower: 'τ', upper: 'Τ', name: 'tau', translit: 't', sound: 't as in talk',
    example: { greek: 'τέκνον', translit: 'teknon', gloss: 'child' }, batch: 4 },
  { id: 'upsilon', lower: 'υ', upper: 'Υ', name: 'upsilon', translit: 'u', sound: 'u as in the French tu or German ü',
    note: 'Rounded at the bottom (υ), unlike nu (ν), which comes to a point. The capital Υ looks like Y.',
    example: { greek: 'υἱός', translit: 'huios', gloss: 'son' }, batch: 4 },
  { id: 'phi', lower: 'φ', upper: 'Φ', name: 'phi', translit: 'ph', sound: 'ph as in phone',
    example: { greek: 'φῶς', translit: 'phōs', gloss: 'light' }, batch: 4 },
  { id: 'chi', lower: 'χ', upper: 'Χ', name: 'chi', translit: 'ch', sound: 'ch as in the Scottish loch',
    note: 'Looks like an English x, but it is ch. Χριστός (Christos) begins with it, which is where "Xmas" comes from.',
    example: { greek: 'χάρις', translit: 'charis', gloss: 'grace' }, batch: 4 },
  { id: 'psi', lower: 'ψ', upper: 'Ψ', name: 'psi', translit: 'ps', sound: 'ps as in lips',
    example: { greek: 'ψυχή', translit: 'psuchē', gloss: 'soul, life' }, batch: 4 },
  { id: 'omega', lower: 'ω', upper: 'Ω', name: 'omega', translit: 'ō', sound: 'o as in tone',
    note: 'Long o. Looks like an English w, but it is a vowel. Compare omicron ο, the short o.',
    example: { greek: 'ὥρα', translit: 'hōra', gloss: 'hour' }, batch: 4 },
];

/** Look up a letter by id. Throws on a typo so bugs surface immediately. */
export function letterById(id: string): Letter {
  const found = LETTERS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown letter id: ${id}`);
  return found;
}

/* ------------------------------------------------------------------ */
/* Look-alikes                                                          */
/* ------------------------------------------------------------------ */

/**
 * Greek letters that an English reader misreads because they look like a
 * DIFFERENT English letter. These are the classic beginner traps and get
 * their own drill. `looksLike` is the English letter the eye wants to see.
 */
export const FALSE_FRIENDS: Array<{ letterId: string; greek: string; looksLike: string }> = [
  { letterId: 'nu', greek: 'ν', looksLike: 'v' },
  { letterId: 'eta', greek: 'η', looksLike: 'n' },
  { letterId: 'rho', greek: 'ρ', looksLike: 'p' },
  { letterId: 'omega', greek: 'ω', looksLike: 'w' },
  { letterId: 'chi', greek: 'χ', looksLike: 'x' },
  { letterId: 'gamma', greek: 'γ', looksLike: 'y' },
  { letterId: 'eta', greek: 'Η', looksLike: 'H' },
  { letterId: 'rho', greek: 'Ρ', looksLike: 'P' },
  { letterId: 'chi', greek: 'Χ', looksLike: 'X' },
];

/**
 * Pairs of GREEK letters that are easy to confuse with each other. Used to
 * pick tricky wrong answers ("distractors") in the multiple-choice drill,
 * which is much better practice than random wrong answers.
 */
export const CONFUSABLE_PAIRS: Array<[string, string]> = [
  ['nu', 'upsilon'],
  ['zeta', 'xi'],
  ['epsilon', 'eta'],
  ['omicron', 'omega'],
  ['theta', 'phi'],
  ['phi', 'psi'],
  ['omicron', 'sigma'],
  ['kappa', 'chi'],
  ['eta', 'nu'],
  ['iota', 'tau'],
];

/** All letters that are easily confused with the given one. */
export function confusablesOf(letterId: string): string[] {
  return CONFUSABLE_PAIRS.flatMap(([a, b]) => (a === letterId ? [b] : b === letterId ? [a] : []));
}

/* ------------------------------------------------------------------ */
/* Words for "sound it out"                                             */
/* ------------------------------------------------------------------ */

/**
 * Every distinct word of John 1:1 to 5, in order of first appearance.
 * Source: the Westcott-Hort text (public domain). Transliterations are
 * computed with transliterate() and checked in data.test.ts.
 *
 * John's prologue is the traditional first reading for beginners: short
 * sentences, few rare words, and several words you already half-know
 * (logos, theos, zōē, phōs).
 */
export const JOHN_1_1_5_WORDS: Array<{ greek: string; gloss: string }> = [
  { greek: 'ἐν', gloss: 'in' },
  { greek: 'ἀρχῇ', gloss: 'beginning' },
  { greek: 'ἦν', gloss: 'was' },
  { greek: 'ὁ', gloss: 'the' },
  { greek: 'λόγος', gloss: 'word' },
  { greek: 'καὶ', gloss: 'and' },
  { greek: 'πρὸς', gloss: 'with, toward' },
  { greek: 'τὸν', gloss: 'the' },
  { greek: 'θεόν', gloss: 'God' },
  { greek: 'θεὸς', gloss: 'God' },
  { greek: 'οὗτος', gloss: 'this one' },
  { greek: 'πάντα', gloss: 'all things' },
  { greek: 'δι’', gloss: 'through' },
  { greek: 'αὐτοῦ', gloss: 'him' },
  { greek: 'ἐγένετο', gloss: 'came into being' },
  { greek: 'χωρὶς', gloss: 'without' },
  { greek: 'οὐδὲ', gloss: 'not even' },
  { greek: 'ἕν', gloss: 'one (thing)' },
  { greek: 'ὃ', gloss: 'which' },
  { greek: 'γέγονεν', gloss: 'has come into being' },
  { greek: 'αὐτῷ', gloss: 'him' },
  { greek: 'ζωὴ', gloss: 'life' },
  { greek: 'ἡ', gloss: 'the' },
  { greek: 'φῶς', gloss: 'light' },
  { greek: 'τῶν', gloss: 'of the' },
  { greek: 'ἀνθρώπων', gloss: 'people' },
  { greek: 'σκοτίᾳ', gloss: 'darkness' },
  { greek: 'φαίνει', gloss: 'shines' },
  { greek: 'σκοτία', gloss: 'darkness' },
  { greek: 'αὐτὸ', gloss: 'it' },
  { greek: 'οὐ', gloss: 'not' },
  { greek: 'κατέλαβεν', gloss: 'overcame, grasped' },
];

/** The five verses in full, for the reading panel under the drill. */
export const JOHN_1_1_5_TEXT = [
  'Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.',
  'οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν.',
  'πάντα δι’ αὐτοῦ ἐγένετο, καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν. ὃ γέγονεν',
  'ἐν αὐτῷ ζωὴ ἦν, καὶ ἡ ζωὴ ἦν τὸ φῶς τῶν ἀνθρώπων·',
  'καὶ τὸ φῶς ἐν τῇ σκοτίᾳ φαίνει, καὶ ἡ σκοτία αὐτὸ οὐ κατέλαβεν.',
];
