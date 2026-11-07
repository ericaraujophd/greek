/**
 * Lessons for the first half of Part 2, Nouns and cases: units 4 to 7
 * (Mounce ch. 5 to 7). Our own wording. Check before release.
 *
 * Paradigm forms are standard Greek and are verified against the forms
 * attested in the NT (src/content/generated/forms.json) by lessons.test.ts.
 */
import type { Lesson, Paradigm } from '../types';

/* --------------------------- shared paradigms --------------------------- */
/* Row order everywhere: nom sg, gen sg, dat sg, acc sg, nom pl, gen pl,    */
/* dat pl, acc pl. Units 4 and 5 show only the nom/acc rows.                */

const ROWS = ['nom. sg.', 'gen. sg.', 'dat. sg.', 'acc. sg.', 'nom. pl.', 'gen. pl.', 'dat. pl.', 'acc. pl.'];

const ARTICLE = {
  m: ['ὁ', 'τοῦ', 'τῷ', 'τόν', 'οἱ', 'τῶν', 'τοῖς', 'τούς'],
  f: ['ἡ', 'τῆς', 'τῇ', 'τήν', 'αἱ', 'τῶν', 'ταῖς', 'τάς'],
  n: ['τό', 'τοῦ', 'τῷ', 'τό', 'τά', 'τῶν', 'τοῖς', 'τά'],
};
const LOGOS = ['λόγος', 'λόγου', 'λόγῳ', 'λόγον', 'λόγοι', 'λόγων', 'λόγοις', 'λόγους'];
const ERGON = ['ἔργον', 'ἔργου', 'ἔργῳ', 'ἔργον', 'ἔργα', 'ἔργων', 'ἔργοις', 'ἔργα'];
const GRAPHE = ['γραφή', 'γραφῆς', 'γραφῇ', 'γραφήν', 'γραφαί', 'γραφῶν', 'γραφαῖς', 'γραφάς'];
const HORA = ['ὥρα', 'ὥρας', 'ὥρᾳ', 'ὥραν', 'ὧραι', 'ὡρῶν', 'ὥραις', 'ὥρας'];
const DOXA = ['δόξα', 'δόξης', 'δόξῃ', 'δόξαν', 'δόξαι', 'δοξῶν', 'δόξαις', 'δόξας'];

const NOM_ACC = [0, 3, 4, 7];
const GEN_DAT = [1, 2, 5, 6];

/** Build an article + nouns table, keeping only the given rows. */
function table(id: string, title: string, rowsIdx: number[], newIdx: number[], note?: string): Paradigm {
  return {
    id, title, note,
    columns: ['Article m.', 'λόγος (2nd, m.)', 'Article f.', 'γραφή (1st, f.)', 'Article n.', 'ἔργον (2nd, n.)'],
    rows: rowsIdx.map((i) => ({
      label: ROWS[i],
      cells: [ARTICLE.m[i], LOGOS[i], ARTICLE.f[i], GRAPHE[i], ARTICLE.n[i], ERGON[i]],
      isNew: newIdx.includes(i),
    })),
  };
}

const ALPHA_TYPES: Paradigm = {
  id: 'alpha-eta',
  title: 'First declension: three patterns in the singular',
  columns: ['γραφή (η)', 'ὥρα (α after ε, ι, ρ)', 'δόξα (α, then η)'],
  rows: ROWS.map((label, i) => ({ label, cells: [GRAPHE[i], HORA[i], DOXA[i]], isNew: i === 1 || i === 2 })),
  note: 'All three are identical in the plural. In the singular, α stays α after ε, ι or ρ (ὥρα, καρδία); after other letters an α in the nominative turns to η in the genitive and dative (δόξα, δόξης, δόξῃ).',
};

/* --------------------------------- u04 --------------------------------- */

export const U04: Lesson = {
  unitId: 'u04',
  before: ['Read Mounce ch. 5 and the first half of ch. 6', 'Watch the chapter overviews', 'Workbook 6a'],
  ideas: {
    cards: [
      { label: 'Nominative · subject', text: 'The case of the subject: who or what does the action.', greek: 'ὁ λόγος ...', english: 'the word ...' },
      { label: 'Accusative · direct object', text: 'The case of the direct object: who or what receives the action.', greek: '... τὸν λόγον', english: '... the word (as object)' },
    ],
    points: [
      'English shows a noun\'s job by word order; Greek shows it by the ending. Word order is free, so read the endings, not the position.',
      'Every noun has a case, a number (singular or plural) and a gender (masculine, feminine, neuter). Gender is grammatical: λόγος is masculine, ἀγάπη feminine, ἔργον neuter.',
      'A noun is stem plus ending: λογ + ος. The dictionary form (lexical form) is the nominative singular.',
      'Greek has a definite article (ὁ, ἡ, τό) but no word for "a". λόγος alone is "a word"; ὁ λόγος is "the word".',
      'The article matches its noun in case, number and gender, so it tells you the noun\'s form even when the ending is unfamiliar.',
      'Neuter nouns have the same form in the nominative and the accusative. Context decides which.',
    ],
    watch: 'Translating in Greek word order. τὸν λόγον βλέπει ὁ ἄνθρωπος is "the man sees the word", not "the word sees the man": the accusative τὸν λόγον is the object wherever it stands.',
  },
  paradigms: [table('na', 'The article and three nouns: nominative and accusative', NOM_ACC, NOM_ACC)],
  concepts: [
    { id: 'case', q: 'What does a Greek noun\'s case tell you?', options: ['Its job in the sentence', 'Its gender', 'How many there are', 'Its tense'], answer: 0,
      why: 'Case shows function: subject, object, and so on. Number and gender are separate.' },
    { id: 'lex', q: 'What is the lexical (dictionary) form of a noun?', options: ['Nominative singular', 'Accusative singular', 'Genitive plural', 'The stem alone'], answer: 0,
      why: 'Dictionaries list nouns in the nominative singular: λόγος, not λόγον.' },
    { id: 'indef', q: 'How do you translate λόγος with no article?', greek: 'λόγος', options: ['a word', 'the word', 'words', 'of a word'], answer: 0,
      why: 'Greek has no indefinite article; without ὁ, English usually supplies "a".' },
    { id: 'neut', q: 'τὸ ἔργον can be which cases?', greek: 'τὸ ἔργον', options: ['Nominative or accusative', 'Only nominative', 'Only accusative', 'Genitive'], answer: 0,
      why: 'Neuter nominative and accusative are always identical. Context decides.' },
    { id: 'order', q: 'Who sees whom? τὸν ἄνθρωπον βλέπει ὁ θεός.', greek: 'τὸν ἄνθρωπον βλέπει ὁ θεός', options: ['God sees the man', 'The man sees God', 'Either', 'Neither'], answer: 0,
      why: 'ὁ θεός is nominative (subject); τὸν ἄνθρωπον is accusative (object). Order does not matter.' },
  ],
};

/* --------------------------------- u05 --------------------------------- */

export const U05: Lesson = {
  unitId: 'u05',
  before: ['Read the second half of Mounce ch. 6', 'Workbook 6b', 'Learn the ch. 6 words'],
  ideas: {
    cards: [
      { label: 'Parsing a noun', text: 'Say five things: case, number, gender, lexical form, meaning.', greek: 'λόγους', english: 'acc. pl. masc. of λόγος, "words"' },
      { label: 'Plural endings', text: 'Masculine -οι / -ους, feminine -αι / -ας, neuter -α / -α.', greek: 'οἱ ἀπόστολοι · τὰς γραφάς', english: 'the apostles (subj.) · the writings (obj.)' },
    ],
    points: [
      'To translate, find the verb first, then the nominative (its subject), then the accusative (its object).',
      'ἡ (the, feminine) and ἤ (or) differ only in breathing and accent. Look carefully.',
      'With names the article is often left untranslated: ὁ Ἰησοῦς is simply "Jesus".',
      'Second declension nouns are mostly masculine (λόγος) or neuter (ἔργον); first declension nouns are mostly feminine (γραφή, ὥρα).',
    ],
    watch: 'Reading -ους as a genitive because English "-ous" looks like "of". In the second declension -ους is accusative plural.',
  },
  paradigms: [
    table('na', 'The article and three nouns: nominative and accusative', NOM_ACC, []),
  ],
  concepts: [
    { id: 'p1', q: 'Parse τοὺς ἀδελφούς.', greek: 'τοὺς ἀδελφούς', options: ['acc. pl. masc.', 'nom. pl. masc.', 'gen. sg. masc.', 'acc. sg. masc.'], answer: 0,
      why: '-ους (and the article τούς) is accusative plural masculine.' },
    { id: 'p2', q: 'Parse αἱ γραφαί.', greek: 'αἱ γραφαί', options: ['nom. pl. fem.', 'acc. pl. fem.', 'nom. sg. fem.', 'nom. pl. neut.'], answer: 0,
      why: 'αἱ and -αι are nominative plural feminine.' },
    { id: 'p3', q: 'Which is the direct object? ὁ κόσμος τὴν ζωὴν ...', greek: 'ὁ κόσμος τὴν ζωὴν', options: ['τὴν ζωήν', 'ὁ κόσμος', 'both', 'neither'], answer: 0,
      why: 'τὴν ζωήν is accusative, so it is the object; ὁ κόσμος is nominative, the subject.' },
    { id: 'eta', q: 'What is ἤ (with a smooth breathing and accent)?', greek: 'ἤ', options: ['"or"', '"the" (fem.)', '"and"', '"not"'], answer: 0,
      why: 'ἤ means "or". The article ἡ has a rough breathing and no accent.' },
  ],
};

/* --------------------------------- u06 --------------------------------- */

export const U06: Lesson = {
  unitId: 'u06',
  before: ['Read the first half of Mounce ch. 7', 'Watch the chapter overview', 'Workbook 7a, on paper'],
  ideas: {
    cards: [
      { label: 'Genitive · "of"', text: 'Usually limits another noun: whose, what kind, from where.', greek: 'λόγος θεοῦ', english: 'a word of God' },
      { label: 'Dative · "to / for"', text: 'Usually the indirect object: to whom or for whom.', greek: 'λέγω τῷ ἀνθρώπῳ', english: 'I speak to the man' },
    ],
    points: [
      'Second declension genitive and dative: -ου, -ῳ (singular); -ων, -οις (plural).',
      'First declension genitive and dative: -ης or -ας, -ῃ or -ᾳ (singular); -ων, -αις (plural).',
      'The genitive plural is -ων in every declension and gender. Learn it once.',
      'The dative singular always has an iota subscript in these declensions: ῳ, ῃ, ᾳ.',
      'The article tells you the case even when the noun ending is new to you: τοῦ, τῆς = genitive; τῷ, τῇ = dative.',
    ],
    watch: 'τοῦ λόγου looks plural to English eyes because of the -ου. It is genitive singular.',
  },
  paradigms: [table('all', 'The article and three nouns: all four cases', [0, 1, 2, 3, 4, 5, 6, 7], GEN_DAT,
    'Highlighted rows are new in this unit.')],
  concepts: [
    { id: 'of', q: 'How is the genitive most often translated?', options: ['with "of"', 'with "to"', 'with "by"', 'as the subject'], answer: 0, why: 'The basic genitive idea is "of": λόγος θεοῦ, a word of God.' },
    { id: 'to', q: 'How is the dative most often translated?', options: ['with "to" or "for"', 'with "of"', 'as the object', 'with "from"'], answer: 0, why: 'The dative most often marks the indirect object: to or for someone.' },
    { id: 'genpl', q: 'What is the genitive plural ending in both first and second declension?', options: ['-ων', '-οις', '-ους', '-αις'], answer: 0, why: '-ων is the genitive plural everywhere.' },
    { id: 'tou', q: 'Parse τοῦ κυρίου.', greek: 'τοῦ κυρίου', options: ['gen. sg. masc.', 'nom. pl. masc.', 'dat. sg. masc.', 'gen. pl. masc.'], answer: 0, why: 'τοῦ and -ου are genitive singular masculine (or neuter).' },
    { id: 'tw', q: 'Parse τῷ δούλῳ.', greek: 'τῷ δούλῳ', options: ['dat. sg. masc.', 'gen. sg. masc.', 'nom. sg. masc.', 'dat. pl. masc.'], answer: 0, why: 'τῷ and -ῳ (with iota subscript) are dative singular.' },
  ],
};

/* --------------------------------- u07 --------------------------------- */

export const U07: Lesson = {
  unitId: 'u07',
  before: ['Read the second half of Mounce ch. 7', 'Workbook 7b', 'Learn the ch. 7 words'],
  ideas: {
    cards: [
      { label: 'Alpha or eta?', text: 'After ε, ι or ρ the first declension keeps α in every singular form; otherwise an α in the nominative turns to η in the genitive and dative.', greek: 'ὥρα, ὥρας · δόξα, δόξης', english: 'hour, of an hour · glory, of glory' },
      { label: 'Genitive with the article', text: 'A chain of genitives often hangs off one noun. Read it one "of" at a time.', greek: 'Ἀρχὴ τοῦ εὐαγγελίου Ἰησοῦ Χριστοῦ', english: 'The beginning of the gospel of Jesus Christ (Mark 1:1)' },
    ],
    points: [
      'Besides "of", the genitive can mean possession ("God\'s"), source, or what something consists of. "Of" is your starting point.',
      'Besides "to/for", the dative can mean "by/with" (means) or "in" (place or time).',
      'Some first declension nouns are masculine and end in -ης, like προφήτης; their genitive singular is -ου (προφήτου).',
      'ὥρας can be genitive singular or accusative plural. The article (τῆς or τάς) or the context settles it.',
    ],
    watch: 'Ignoring the article. When an ending is ambiguous (ὥρας, ἔργα), the article beside it usually decides the case.',
  },
  paradigms: [table('all', 'The article and three nouns: all four cases', [0, 1, 2, 3, 4, 5, 6, 7], []), ALPHA_TYPES],
  concepts: [
    { id: 'hora', q: 'ὥρας on its own can be which?', greek: 'ὥρας', options: ['gen. sg. or acc. pl.', 'only gen. sg.', 'only acc. pl.', 'nom. pl.'], answer: 0, why: 'For α-type nouns, -ας is both genitive singular and accusative plural.' },
    { id: 'doxa', q: 'What is the genitive singular of δόξα?', options: ['δόξης', 'δόξας', 'δόξου', 'δόξῃ'], answer: 0, why: 'After ξ (not ε, ι or ρ) the α turns to η in the genitive and dative singular: δόξης.' },
    { id: 'kardia', q: 'What is the genitive singular of καρδία?', options: ['καρδίας', 'καρδίης', 'καρδίου', 'καρδίᾳ'], answer: 0, why: 'After ι the α stays: καρδίας.' },
    { id: 'proph', q: 'What is the genitive singular of προφήτης?', options: ['προφήτου', 'προφήτης', 'προφήτων', 'προφήτῃ'], answer: 0, why: 'Masculine first declension nouns in -ης borrow -ου for the genitive singular.' },
    { id: 'mark', q: 'In Mark 1:1, what case is εὐαγγελίου?', greek: 'Ἀρχὴ τοῦ εὐαγγελίου', options: ['genitive', 'dative', 'nominative', 'accusative'], answer: 0, why: 'τοῦ εὐαγγελίου is genitive singular: "of the gospel".' },
  ],
};
