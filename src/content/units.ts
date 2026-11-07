/**
 * units.ts: the course outline. One entry per unit, following the CTS
 * syllabus for 5303 Greek Fundamentals I (12 weeks, chapters 1 to 21 of
 * Mounce, Basics of Biblical Greek, 4th edition).
 *
 * WHAT LIVES HERE
 *   - the 24 units in class order, with the class session each matches;
 *   - the practice quizzes, placed where the class quizzes are;
 *   - each unit's WORDS (the chapter vocabulary), as drafts to check;
 *   - which grammar each unit adds (used to decide what a student can be
 *     asked to parse, and which NT verses they can read).
 *
 * WHAT DOES NOT
 *   - key ideas, paradigms and practice questions: src/content/units/uNN.ts
 *
 * ABOUT THE WORD LISTS (important)
 *   The lists follow the chapters of Mounce's book. Claude drafted them from
 *   memory of the book's chapter vocabularies, so they MUST be checked
 *   against your copy before students see them: the Admin page shows each
 *   unit's words as "draft" until you mark them "checked". The English
 *   glosses are our own short wording, not Mounce's. NT frequencies come
 *   from the open MorphGNT data at build time.
 *
 * IDS ARE PERMANENT
 *   Unit ids ('u06') and lemmas are stored in students' progress. Fix a
 *   typo in a gloss freely; never rename an id or a lemma that is in use.
 */

export interface Word {
  /** Dictionary form exactly as in MorphGNT (accents matter: the build checks it). */
  lemma: string;
  /** Short English meaning, our own wording. */
  gloss: string;
  /** What to show beside the lemma, if more than the lemma (e.g. "ὁ, ἡ, τό"). */
  display?: string;
  /** A memory hook or usage note. */
  note?: string;
}

/** Grammar a unit makes available. Cumulative: see grammarThrough(). */
export type Grammar =
  | 'alphabet' | 'syllables'
  | 'nom' | 'acc' | 'gen' | 'dat' | 'article'
  | 'prepositions' | 'eimi' | 'adjectives' | 'third-decl'
  | 'pronouns-12' | 'autos' | 'demonstratives' | 'relative'
  | 'verbs' | 'contract' | 'middle-passive' | 'future' | 'imperfect';

export interface Unit {
  /** Permanent id: 'u01' to 'u24'. */
  id: string;
  /** Position, 1 to 24. */
  n: number;
  /** Part of the course, 1 to 4 (Foundations, Nouns, Pronouns, Verbs). */
  part: 1 | 2 | 3 | 4;
  /** Chapter label as shown to students. */
  chapters: string;
  title: string;
  /** Class session in the syllabus this unit matches. */
  session: string;
  /** One sentence: what you can do after this unit. */
  goal: string;
  /** Exegetical "It's all Greek to me!" topic attached to this class session. */
  insight?: string;
  /** Grammar this unit adds. */
  adds: Grammar[];
  /** Cumulative grammar through this unit (filled in below). */
  grammar: Grammar[];
  /** The chapter's words, introduced in this unit. */
  words: Word[];
  /** Offer NT readings from this unit on. */
  readingsFrom?: boolean;
  /** Content for this unit has been drafted (key ideas, paradigms, check). */
  drafted: boolean;
}

export interface Quiz {
  /** 'q1' to 'q5', 'exam'. */
  id: string;
  title: string;
  /** Unit after which it sits on the course map. */
  afterUnit: number;
  /** Units whose material it draws on. Inferred from the syllabus order. */
  covers: string[];
  session: string;
}

export const PARTS: Record<number, { name: string; chapters: string }> = {
  1: { name: 'Foundations', chapters: 'Ch. 1 to 4' },
  2: { name: 'Nouns and cases', chapters: 'Ch. 5 to 10' },
  3: { name: 'Pronouns', chapters: 'Ch. 11 to 14' },
  4: { name: 'Indicative verbs', chapters: 'Ch. 15 to 21' },
};

/* ------------------------------ word lists ------------------------------ */
/* Drafts. See "ABOUT THE WORD LISTS" above.                                 */

const CH4: Word[] = [
  { lemma: 'ἄγγελος', gloss: 'angel, messenger', note: 'γγ sounds "ng": angelos' },
  { lemma: 'ἀμήν', gloss: 'amen, truly' },
  { lemma: 'ἄνθρωπος', gloss: 'man, person, human being', note: 'anthropology' },
  { lemma: 'ἀπόστολος', gloss: 'apostle, one sent' },
  { lemma: 'Γαλιλαία', gloss: 'Galilee' },
  { lemma: 'γραφή', gloss: 'writing, Scripture', note: 'graphic' },
  { lemma: 'Δαυίδ', gloss: 'David', note: 'does not change form' },
  { lemma: 'δόξα', gloss: 'glory', note: 'doxology' },
  { lemma: 'ἐγώ', gloss: 'I', note: 'ego' },
  { lemma: 'ἔσχατος', gloss: 'last', note: 'eschatology' },
  { lemma: 'ζωή', gloss: 'life', note: 'zoology' },
  { lemma: 'θεός', gloss: 'God, god', note: 'theology' },
  { lemma: 'καί', gloss: 'and, even, also', display: 'καί' },
  { lemma: 'καρδία', gloss: 'heart', note: 'cardiac' },
  { lemma: 'κόσμος', gloss: 'world', note: 'cosmos' },
  { lemma: 'λόγος', gloss: 'word, Word, message' },
  { lemma: 'Παῦλος', gloss: 'Paul' },
  { lemma: 'Πέτρος', gloss: 'Peter' },
  { lemma: 'Πιλᾶτος', gloss: 'Pilate' },
  { lemma: 'πνεῦμα', gloss: 'spirit, Spirit, wind', note: 'pneumatic' },
  { lemma: 'προφήτης', gloss: 'prophet' },
  { lemma: 'σάββατον', gloss: 'Sabbath, week' },
  { lemma: 'Σίμων', gloss: 'Simon' },
  { lemma: 'φωνή', gloss: 'sound, voice', note: 'phonetics' },
  { lemma: 'Χριστός', gloss: 'Christ, Messiah, Anointed One' },
];

const CH6: Word[] = [
  { lemma: 'ἀγάπη', gloss: 'love' },
  { lemma: 'ἄλλος', gloss: 'other, another', note: 'allegory' },
  { lemma: 'αὐτός', gloss: 'he, she, it; self; same', note: 'autonomy. Fully taught in ch. 12' },
  { lemma: 'βασιλεία', gloss: 'kingdom, reign' },
  { lemma: 'δέ', gloss: 'but, and', note: 'never first word in its clause (postpositive)' },
  { lemma: 'ἐν', gloss: 'in, on, among', note: 'always with the dative' },
  { lemma: 'ἔργον', gloss: 'work, deed', note: 'ergonomic' },
  { lemma: 'καιρός', gloss: 'season, appointed time' },
  { lemma: 'νῦν', gloss: 'now' },
  { lemma: 'ὁ', gloss: 'the', display: 'ὁ, ἡ, τό' },
  { lemma: 'ὅτι', gloss: 'that, since, because' },
  { lemma: 'οὐ', gloss: 'not', display: 'οὐ, οὐκ, οὐχ', note: 'οὐκ before a smooth breathing, οὐχ before a rough one' },
  { lemma: 'πρός', gloss: 'to, toward, with', note: 'with the accusative' },
  { lemma: 'ψυχή', gloss: 'soul, life, self', note: 'psychology' },
  { lemma: 'ὥρα', gloss: 'hour, moment', note: 'horoscope' },
];

const CH7: Word[] = [
  { lemma: 'ἀδελφός', gloss: 'brother', note: 'Philadelphia' },
  { lemma: 'ἄρτος', gloss: 'bread, loaf' },
  { lemma: 'γάρ', gloss: 'for, then', note: 'postpositive' },
  { lemma: 'δοῦλος', gloss: 'slave, servant' },
  { lemma: 'δῶρον', gloss: 'gift' },
  { lemma: 'ἐξουσία', gloss: 'authority, power' },
  { lemma: 'εὐαγγέλιον', gloss: 'good news, gospel', note: 'evangelism' },
  { lemma: 'Ἰησοῦς', gloss: 'Jesus, Joshua' },
  { lemma: 'κύριος', gloss: 'Lord, lord, master, sir' },
  { lemma: 'μή', gloss: 'not, lest' },
  { lemma: 'οὐρανός', gloss: 'heaven, sky', note: 'Uranus' },
  { lemma: 'υἱός', gloss: 'son, descendant' },
];

/* ------------------------------ the units ------------------------------ */

type Raw = Omit<Unit, 'grammar' | 'n'>;

const RAW: Raw[] = [
  { id: 'u01', part: 1, chapters: 'ch. 1 to 2', title: 'The Greek language and learning it', session: 'Week 1, Tuesday',
    goal: 'Know what Koine Greek is, why the course reads it, and how to study it day to day.',
    adds: [], words: [], drafted: true },
  { id: 'u02', part: 1, chapters: 'ch. 3', title: 'Alphabet and pronunciation', session: 'Week 1, Thursday',
    goal: 'Read any Greek word aloud: letters, vowels, diphthongs, breathing marks.',
    adds: ['alphabet'], words: [], drafted: true },
  { id: 'u03', part: 1, chapters: 'ch. 4', title: 'Punctuation and syllables', session: 'Week 2, Tuesday',
    goal: 'Recognize Greek punctuation, divide words into syllables, and know the first 25 words.',
    adds: ['syllables'], words: CH4, drafted: true },
  { id: 'u04', part: 2, chapters: 'ch. 5 and 6a', title: 'Nouns: nominative and accusative', session: 'Week 2, Thursday',
    goal: 'See how case shows a noun\'s job, and recognize subject and direct object.',
    adds: ['nom', 'acc', 'article'], words: CH6, drafted: true },
  { id: 'u05', part: 2, chapters: 'ch. 6b', title: 'Nominative and accusative, continued', session: 'Week 3, Tuesday',
    goal: 'Parse nominative and accusative nouns and articles, and translate simple sentences.',
    adds: [], words: [], drafted: true, readingsFrom: true },
  { id: 'u06', part: 2, chapters: 'ch. 7a', title: 'Genitive and dative', session: 'Week 3, Tuesday',
    goal: 'Recognize genitive and dative forms and translate them with "of" and "to/for".',
    adds: ['gen', 'dat'], words: CH7, drafted: true, readingsFrom: true },
  { id: 'u07', part: 2, chapters: 'ch. 7b', title: 'Genitive and dative, continued', session: 'Week 3, Thursday',
    goal: 'Handle all four cases of first and second declension nouns, including the alpha and eta patterns.',
    adds: [], words: [], drafted: true, readingsFrom: true },
  { id: 'u08', part: 2, chapters: 'ch. 8', title: 'Prepositions and εἰμί', session: 'Week 4, Tuesday',
    goal: 'Translate prepositional phrases and the verb "to be".', adds: ['prepositions', 'eimi'], words: [], drafted: false, readingsFrom: true },
  { id: 'u09', part: 2, chapters: 'ch. 9a', title: 'Adjectives', session: 'Week 4, Thursday',
    goal: 'Use adjectives attributively and predicatively.', adds: ['adjectives'], words: [], drafted: false },
  { id: 'u10', part: 2, chapters: 'ch. 9b', title: 'Adjectives, continued', session: 'Week 5, Tuesday',
    goal: 'Recognize substantival adjectives and adjective positions.', adds: [], words: [], drafted: false },
  { id: 'u11', part: 2, chapters: 'ch. 1 to 9', title: 'Word order and emphasis', session: 'Week 5, Thursday',
    goal: 'See how Greek word order signals emphasis.', insight: 'Word order and emphasis', adds: [], words: [], drafted: false },
  { id: 'u12', part: 2, chapters: 'ch. 10a', title: 'Third declension', session: 'Week 6, Tuesday',
    goal: 'Find the stem of third declension nouns.', adds: ['third-decl'], words: [], drafted: false },
  { id: 'u13', part: 2, chapters: 'ch. 10b', title: 'Third declension, continued', session: 'Week 6, Thursday',
    goal: 'Parse third declension forms, including stem changes.', adds: [], words: [], drafted: false },
  { id: 'u14', part: 3, chapters: 'ch. 11', title: 'First and second person pronouns', session: 'Week 7, Tuesday',
    goal: 'Recognize ἐγώ and σύ in every case and number.', adds: ['pronouns-12'], words: [], drafted: false },
  { id: 'u15', part: 3, chapters: 'ch. 12', title: 'αὐτός', session: 'Week 8, Tuesday',
    goal: 'Use αὐτός as personal pronoun, intensive and identical adjective.', insight: 'The "extra" functions of the 3rd person pronoun',
    adds: ['autos'], words: [], drafted: false },
  { id: 'u16', part: 3, chapters: 'ch. 13', title: 'Demonstratives', session: 'Week 8, Thursday',
    goal: 'Translate οὗτος and ἐκεῖνος as pronouns and adjectives.', adds: ['demonstratives'], words: [], drafted: false },
  { id: 'u17', part: 3, chapters: 'ch. 14', title: 'Relative pronoun', session: 'Week 9, Tuesday',
    goal: 'Find a relative pronoun\'s antecedent and its job in its own clause.', adds: ['relative'], words: [], drafted: false },
  { id: 'u18', part: 4, chapters: 'ch. 15 and 16', title: 'Verbs; present active indicative', session: 'Week 10, Tuesday',
    goal: 'Parse and translate present active indicative verbs.', adds: ['verbs'], words: [], drafted: false },
  { id: 'u19', part: 4, chapters: 'ch. 17', title: 'Contract verbs', session: 'Week 10, Thursday',
    goal: 'Recognize contracted vowels in present tense verbs.', adds: ['contract'], words: [], drafted: false },
  { id: 'u20', part: 4, chapters: 'ch. 18', title: 'Present middle/passive indicative', session: 'Week 11, Tuesday',
    goal: 'Parse and translate present middle/passive verbs.', insight: 'The "divine passive"', adds: ['middle-passive'], words: [], drafted: false },
  { id: 'u21', part: 4, chapters: 'ch. 19', title: 'Future active and middle (pattern 1)', session: 'Week 11, Thursday',
    goal: 'Recognize the future tense sign.', adds: ['future'], words: [], drafted: false },
  { id: 'u22', part: 4, chapters: 'ch. 20', title: 'Future (patterns 2 to 4)', session: 'Week 12, Tuesday',
    goal: 'Recognize futures with changed stems.', adds: [], words: [], drafted: false },
  { id: 'u23', part: 4, chapters: 'ch. 21', title: 'Imperfect indicative', session: 'Week 12, Thursday',
    goal: 'Parse the imperfect: augment, stem, endings.', insight: 'The significance of the imperfect tense', adds: ['imperfect'], words: [], drafted: false },
  { id: 'u24', part: 4, chapters: 'ch. 1 to 21', title: 'Course exam review', session: 'Exam week',
    goal: 'Review the whole semester.', adds: [], words: [], drafted: false },
];

export const UNITS: Unit[] = (() => {
  const acc: Grammar[] = [];
  return RAW.map((r, i) => {
    acc.push(...r.adds);
    return { ...r, n: i + 1, grammar: [...acc] };
  });
})();

export const QUIZZES: Quiz[] = [
  { id: 'q1', title: 'Quiz 1', afterUnit: 3, covers: ['u02', 'u03'], session: 'Week 2, Tuesday' },
  { id: 'q2', title: 'Quiz 2', afterUnit: 7, covers: ['u04', 'u05', 'u06', 'u07'], session: 'Week 3, Thursday' },
  { id: 'q3', title: 'Quiz 3', afterUnit: 11, covers: ['u08', 'u09', 'u10'], session: 'Week 5, Thursday' },
  { id: 'q4', title: 'Quiz 4', afterUnit: 14, covers: ['u12', 'u13', 'u14'], session: 'Week 7, Thursday' },
  { id: 'q5', title: 'Quiz 5', afterUnit: 17, covers: ['u15', 'u16', 'u17'], session: 'Week 9, Thursday' },
  { id: 'exam', title: 'Course exam', afterUnit: 24, covers: RAW.map((r) => r.id), session: 'Dec 17 or 18' },
];

export function unitById(id: string): Unit {
  const u = UNITS.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unit ${id}`);
  return u;
}

/** Every word introduced in units 1..n (inclusive). */
export function wordsThrough(n: number): Word[] {
  return UNITS.filter((u) => u.n <= n).flatMap((u) => u.words);
}
