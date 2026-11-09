/**
 * videos.ts: links to Bill Mounce's free videos on billmounce.com, by
 * chapter of Basics of Biblical Greek (4th ed.).
 *
 * WHAT EXISTS (checked Nov 6, 2026)
 *   Chapter overview   https://www.billmounce.com/biblicalgreek/chapteroverview/<n>
 *                      for chapters 2 and up (part of his free online class).
 *   Chapter 1          has no overview; its chapter page links the lecture:
 *                      https://www.billmounce.com/biblicalgreek/1-the-greek-language
 *   Exercise screencast https://www.billmounce.com/workbook/<n>
 *                      (walks through the workbook exercises; from chapter 3).
 *   Some videos may ask you to sign in to the free class or, for the full
 *   lectures, to buy them. We only link; nothing is copied here.
 *
 * If a link stops working, the chapter pages under "Study Greek" on
 * billmounce.com are the place to look.
 */

export interface VideoLink { label: string; href: string }

/** Chapter numbers in a unit's "chapters" text: "ch. 1 to 2" -> [1, 2]; "ch. 7a" -> [7]. */
export function chapterNumbers(chapters: string): number[] {
  const range = /(\d+)\D+to\D+(\d+)/.exec(chapters);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  return [...new Set((chapters.match(/\d+/g) ?? []).map(Number))];
}

/** Overview videos for a unit's chapters. */
export function overviewLinks(chapters: string): VideoLink[] {
  return chapterNumbers(chapters).map((n) => n === 1
    ? { label: 'Chapter 1: lecture', href: 'https://www.billmounce.com/biblicalgreek/1-the-greek-language' }
    : { label: `Chapter ${n}: overview`, href: `https://www.billmounce.com/biblicalgreek/chapteroverview/${n}` });
}

/** Workbook screencasts for a unit's chapters (chapter 3 and up). */
export function screencastLinks(chapters: string): VideoLink[] {
  return chapterNumbers(chapters).filter((n) => n >= 3)
    .map((n) => ({ label: `Chapter ${n}: exercise screencast`, href: `https://www.billmounce.com/workbook/${n}` }));
}

/* ------------------------------------------------------------------------ */
/* Extra listening: Ted Hildebrandt, Mastering New Testament Greek           */
/* ------------------------------------------------------------------------ */
/*
 * Free audio from https://biblicalelearning.org/New_Testament_Greek/00-GreekAudioPage.htm
 * "Copyright © 2004, Ted Hildebrandt (free for non-commercial use)". We
 * only link to his files; nothing is copied into this site.
 *
 * His textbook is ordered differently from Mounce's, so each unit links the
 * chapter(s) of his that cover the SAME TOPIC. Two files per chapter:
 *   lesson     his narrated lesson on the topic
 *   vocabulary his chapter's word list read aloud. His word lists are not
 *              Mounce's, so expect different words; it is good listening
 *              practice, not a recording of your unit's words.
 */
const HB = 'https://biblicalelearning.org/New_Testament_Greek/Audio/';
const HB_LESSON: Record<number, [string, string]> = {
  1: ['Alphabet', '01_Alphabet.mp3'], 2: ['Accents and syllables', '02-AccentsSyllables.mp3'],
  3: ['Present active indicative', '03_PAI-Verbs.mp3'], 4: ['Second declension nouns', '04_Nouns_SecondDeclension.mp3'],
  5: ['First declension nouns', '05_Nouns_FirstDeclension.mp3'], 6: ['Prepositions', '06_Prepositions.mp3'],
  7: ['Adjectives', '07_Adjectives.mp3'], 8: ['Pronouns', '08_Pronouns.mp3'], 9: ['Present middle/passive', '09_PMPVerbs.mp3'],
  10: ['Future', '10_FutureVerbs.mp3'], 11: ['Pronouns (2)', '11_Pronouns.mp3'], 12: ['Imperfect', '12_ImpfVerbs.mp3'],
  13: ['Third declension nouns', '13_3rdDeclNouns.mp3'], 17: ['Contract verbs', '17_ContractVerbs.mp3'],
};
const HB_VOCAB: Record<number, string> = {
  1: 'MNTG-Vocab-CH-01-MonoCD6-T1-Voice.mp3', 2: 'MNTG-Vocab-CH-02-CD4-T3-VoiceMono.mp3', 3: 'MNTG-Vocab-CH-03-CD5-T4-Voice-Mono.mp3',
  4: 'MNTG-Vocab-Ch-04-CD5-T13-VoiceMono.mp3', 5: 'MNTG-Vocab-CH-05-Cd7-T12-VoiceMusic-Mono.mp3', 6: 'MNTG-Vocab-CH-06-CD10-T9-Voice-Mono.mp3',
  7: 'MNTG-Vocab-CH-07-CD13-T20-Voice-Mono.mp3', 8: 'MNTG-Vocab-CH-08-CD14-T13-Voice-Mono.mp3', 9: 'MNTG-Vocab-CH-09-CD17-T16-Voice-Mono.mp3',
  10: 'MNTG-Vocab-CH-10-CD18-T17-Voice-Mono.mp3', 11: 'MNTG-Vocab-CH-11-CD18-T18-Voice-Mono.mp3', 12: 'MNTG-Vocab-CH-12-CD1-T6-Voice-Mono.mp3',
  13: 'MNTG-Vocab-CH-13-Cd4-T3-Voice-Mono.mp3', 17: 'MNTG-Vocab-CH-17-Cd11-T10-Voice-Mono.mp3',
};
/** Our unit -> Hildebrandt chapters on the same topic. */
const HB_FOR_UNIT: Record<string, number[]> = {
  u02: [1], u03: [2], u04: [4, 5], u05: [4, 5], u06: [4, 5], u07: [4, 5], u08: [6], u09: [7], u10: [7],
  u12: [13], u13: [13], u14: [8], u15: [8], u16: [11], u17: [11], u18: [3], u19: [17], u20: [9], u21: [10], u22: [10], u23: [12],
};

/** Free extra-listening links for a unit (empty if none fit). */
export function extraListening(unitId: string): VideoLink[] {
  return (HB_FOR_UNIT[unitId] ?? []).flatMap((n) => [
    { label: `Lesson: ${HB_LESSON[n][0]}`, href: `${HB}GreekTutor_Animation_Audio/${HB_LESSON[n][1]}` },
    { label: `Vocabulary, his ch. ${n}`, href: `${HB}VocabTextbookCD1-mp3/${HB_VOCAB[n]}` },
  ]);
}
