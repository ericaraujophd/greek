/**
 * Lessons for Part 1, Foundations: units 1 to 3 (Mounce ch. 1 to 4).
 * Our own wording, drafted to accompany the chapters. Check before release.
 */
import type { Lesson } from '../types';

export const U01: Lesson = {
  unitId: 'u01',
  before: ['Read Mounce ch. 1 and 2', 'Watch the chapter overviews (billmounce.com, free class)', 'Introduce yourself in the class forum'],
  ideas: {
    cards: [
      { label: 'Koine · "common"', text: 'The everyday Greek of the eastern Mediterranean from about 300 BC to AD 300, spread by Alexander\'s conquests. The New Testament is written in it.' },
      { label: 'Why read it', text: 'Every translation makes choices. Reading the Greek lets you see the choices, and weigh them, instead of inheriting them.' },
    ],
    points: [
      'Koine is simpler than classical (Attic) Greek and different from modern Greek, though all three are one language over time.',
      'The course follows Mounce\'s order: nouns first (ch. 5 to 14), then verbs (ch. 15 on).',
      'The best predictor of success is steady contact: short daily review beats long weekly sessions.',
      'Say Greek aloud. Hearing yourself fixes letters and endings in memory faster than silent reading.',
    ],
    watch: 'Falling behind on vocabulary. Words pile up chapter after chapter; a few minutes of review a day keeps them manageable.',
  },
  paradigms: [],
  concepts: [
    { id: 'koine', q: 'What does "Koine" mean?', options: ['common', 'holy', 'ancient', 'written'], answer: 0,
      why: 'Koine (κοινή) means "common": the shared, everyday Greek of the Hellenistic world.' },
    { id: 'period', q: 'Roughly when was Koine Greek in use?', options: ['300 BC to AD 300', '800 to 500 BC', 'AD 600 to 1000', 'after AD 1453'], answer: 0,
      why: 'From Alexander the Great to the late Roman empire, about 300 BC to AD 300.' },
    { id: 'spread', q: 'What spread Koine across the eastern Mediterranean?', options: ['Alexander\'s conquests', 'The Roman Senate', 'The Septuagint', 'Byzantine schools'], answer: 0,
      why: 'Alexander\'s empire made Greek the common language of trade and government far beyond Greece.' },
    { id: 'order', q: 'In Mounce, which comes first?', options: ['Nouns', 'Verbs', 'Participles', 'Syntax'], answer: 0,
      why: 'Mounce teaches the noun system (ch. 5 to 14) before the verb system (ch. 15 on).' },
  ],
};

export const U02: Lesson = {
  unitId: 'u02',
  before: ['Read Mounce ch. 3', 'Watch the chapter overview', 'Write the alphabet out twice, saying each letter'],
  ideas: {
    cards: [
      { label: 'Seven vowels', text: 'α ε η ι ο υ ω. ε and ο are always short, η and ω always long, α ι υ can be either.', greek: 'ε / η · ο / ω', english: 'short e / long e · short o / long o' },
      { label: 'Breathing marks', text: 'Every word that starts with a vowel or ρ carries one. Rough (῾) adds an h sound; smooth (᾿) adds nothing.', greek: 'ὁ · ἐν', english: 'ho · en' },
    ],
    points: [
      'Diphthongs are two vowels said as one sound: αι, ει, οι, αυ, ευ, ου, υι. On a diphthong the breathing mark sits on the second vowel: οὗτος.',
      'Iota subscript (ᾳ ῃ ῳ) is written under a long vowel and not pronounced.',
      'Gamma before γ, κ, ξ or χ sounds like "n": ἄγγελος is angelos.',
      'Sigma is σ inside a word and ς at the end.',
      'The pronunciation used here and in class is Erasmian, not modern Greek.',
    ],
    watch: 'Reading Greek letters as the English letters they resemble: ν is n (not v), η is ē (not n), ρ is r (not p), ω is ō (not w), χ is ch (not x).',
  },
  paradigms: [],
  concepts: [
    { id: 'rough', q: 'How is ὁ pronounced?', greek: 'ὁ', options: ['ho', 'o', 'oh-h', 'ko'], answer: 0, why: 'The rough breathing (῾) adds an h sound before the vowel.' },
    { id: 'diph', q: 'Where does the breathing mark go on a diphthong?', options: ['On the second vowel', 'On the first vowel', 'Between the vowels', 'After the word'], answer: 0,
      why: 'On a diphthong the breathing (and the accent) sit on the second vowel: οὗτος, αὐτός.' },
    { id: 'nasal', q: 'How do you say ἄγγελος?', greek: 'ἄγγελος', options: ['angelos', 'aggelos', 'agelos', 'ajjelos'], answer: 0,
      why: 'γ before γ, κ, ξ or χ is a nasal "n": angelos.' },
    { id: 'sub', q: 'What is the small iota under ῳ?', greek: 'ῳ', options: ['An iota subscript, not pronounced', 'A smooth breathing', 'A comma', 'A sign of the plural'], answer: 0,
      why: 'It is an iota written under a long vowel. You write it, but you do not say it.' },
    { id: 'final', q: 'Which sigma ends a word?', options: ['ς', 'σ', 'Σ', 'ζ'], answer: 0, why: 'ς is final sigma; σ is used everywhere else in lower case.' },
  ],
  links: [
    { href: '#/alphabet', label: 'Alphabet drills', text: 'Learn the letters, flashcards, speed rounds, look-alikes, typing, and sounding out John 1.' },
  ],
};

export const U03: Lesson = {
  unitId: 'u03',
  before: ['Read Mounce ch. 4', 'Watch the chapter overview', 'Workbook ch. 4: syllabification'],
  ideas: {
    cards: [
      { label: 'The question mark', text: 'Greek uses ; where English uses ?. Easy to misread as a semicolon.', greek: 'τίς ἐστιν;', english: 'who is it?' },
      { label: 'The raised dot', text: 'A dot above the line (·) is a pause like an English colon or semicolon.', greek: 'τῶν ἀνθρώπων·', english: 'of people;' },
    ],
    points: [
      'A word has as many syllables as it has vowels and diphthongs.',
      'A single consonant between two vowels starts the next syllable: ἀ-πό-στο-λος.',
      'Two consonants that can begin a Greek word stay together and start the next syllable (σχ, στ, χρ): ἔ-σχα-τος. If they cannot, they split: ἄν-θρω-πος.',
      'A doubled consonant always splits: σάβ-βα-τον, ἄγ-γε-λος.',
      'The last three syllables have names: ultima (last), penult (second last), antepenult (third last). Accents can only fall on these three.',
    ],
    watch: 'Splitting a diphthong: πνεῦ-μα is two syllables, not three. αι, ει, οι, αυ, ευ, ου, υι each count as one vowel sound.',
  },
  paradigms: [
    { id: 'punct', title: 'Greek punctuation', columns: ['Greek', 'English equivalent'], review: true, rows: [
      { label: 'period', cells: ['.', '.'] },
      { label: 'comma', cells: [',', ','] },
      { label: 'raised dot', cells: ['·', '; or :'] },
      { label: 'question mark', cells: [';', '?'] },
    ] },
  ],
  concepts: [
    { id: 'qmark', q: 'What does ; mean at the end of a Greek sentence?', options: ['A question', 'A pause', 'The end of a paragraph', 'A quotation'], answer: 0, why: 'The Greek ; is a question mark.' },
    { id: 'dot', q: 'What does a raised dot (·) mark?', options: ['A pause, like ; or :', 'A question', 'An abbreviation', 'A new speaker'], answer: 0, why: 'The raised dot is a mid-sentence pause.' },
    { id: 'syl1', q: 'How is ἀπόστολος divided?', greek: 'ἀπόστολος', options: ['ἀ-πό-στο-λος', 'ἀπ-όσ-τολ-ος', 'ἀ-πόσ-το-λος', 'ἀπό-στο-λος'], answer: 0,
      why: 'Single consonants go with the next vowel, and στ can begin a word, so it stays together: ἀ-πό-στο-λος.' },
    { id: 'syl2', q: 'How is ἄνθρωπος divided?', greek: 'ἄνθρωπος', options: ['ἄν-θρω-πος', 'ἄ-νθρω-πος', 'ἄνθ-ρω-πος', 'ἄν-θρωπ-ος'], answer: 0,
      why: 'νθρ cannot begin a Greek word, so ν stays with the first syllable and θρ starts the next.' },
    { id: 'syl3', q: 'How many syllables does πνεῦμα have?', greek: 'πνεῦμα', options: ['2', '3', '1', '4'], answer: 0, why: 'ευ is a diphthong, one sound: πνεῦ-μα.' },
    { id: 'syl4', q: 'How is σάββατον divided?', greek: 'σάββατον', options: ['σάβ-βα-τον', 'σά-ββα-τον', 'σάββ-α-τον', 'σάβ-βατ-ον'], answer: 0, why: 'Double consonants split: σάβ-βα-τον.' },
    { id: 'syl5', q: 'How is ἔσχατος divided?', greek: 'ἔσχατος', options: ['ἔ-σχα-τος', 'ἔσ-χα-τος', 'ἔσχ-α-τος', 'ἔ-σχατ-ος'], answer: 0,
      why: 'σχ can begin a Greek word (σχίζω), so it stays together with the next vowel.' },
    { id: 'penult', q: 'In λόγος, which syllable carries the accent?', greek: 'λόγος', options: ['The penult', 'The ultima', 'The antepenult', 'None'], answer: 0,
      why: 'λό-γος: the accent is on the second-to-last syllable, the penult.' },
  ],
};
